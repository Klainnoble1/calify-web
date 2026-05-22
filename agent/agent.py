import asyncio
import json
import logging
import os
import tempfile
from pathlib import Path

import aiohttp
import av
import numpy as np
from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    llm,
)
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import openai, silero

load_dotenv(dotenv_path="../.env.local")

logger = logging.getLogger("calify-agent")

SAMPLE_RATE = 48000
NUM_CHANNELS = 1


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


def get_job_metadata(ctx: JobContext) -> dict:
    try:
        return json.loads(ctx.job.metadata or "{}")
    except Exception:
        logger.exception("failed to parse job metadata")
        return {}


async def download_voice_note(url: str) -> Path:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".audio") as file:
        output_path = Path(file.name)

    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            response.raise_for_status()
            with output_path.open("wb") as file:
                async for chunk in response.content.iter_chunked(1024 * 256):
                    file.write(chunk)

    return output_path


async def publish_audio_file(ctx: JobContext, audio_path: Path):
    source = rtc.AudioSource(SAMPLE_RATE, NUM_CHANNELS)
    track = rtc.LocalAudioTrack.create_audio_track("calify-prerecorded-message", source)
    options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
    local_participant = getattr(ctx, "agent", None) or ctx.room.local_participant
    await local_participant.publish_track(track, options)

    container = av.open(str(audio_path))
    resampler = av.audio.resampler.AudioResampler(format="s16", layout="mono", rate=SAMPLE_RATE)

    try:
        for packet in container.demux(audio=0):
            for frame in packet.decode():
                for resampled_frame in resampler.resample(frame):
                    pcm = resampled_frame.to_ndarray().astype(np.int16).tobytes()
                    samples_per_channel = len(pcm) // 2
                    if samples_per_channel == 0:
                        continue

                    audio_frame = rtc.AudioFrame.create(SAMPLE_RATE, NUM_CHANNELS, samples_per_channel)
                    audio_data = np.frombuffer(audio_frame.data, dtype=np.int16)
                    np.copyto(audio_data, np.frombuffer(pcm, dtype=np.int16))
                    await source.capture_frame(audio_frame)

        await source.wait_for_playout()
    finally:
        container.close()
        await source.aclose()


async def run_prerecorded_voice(ctx: JobContext, voice_note_url: str):
    logger.info("connecting prerecorded voice agent to room %s", ctx.room.name)
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()
    logger.info("playing prerecorded voice note for participant %s", participant.identity)

    audio_path = await download_voice_note(voice_note_url)
    try:
        await publish_audio_file(ctx, audio_path)
    finally:
        audio_path.unlink(missing_ok=True)

    await asyncio.sleep(1)


async def run_ai_agent(ctx: JobContext):
    initial_ctx = llm.ChatContext().append(
        role="system",
        text=(
            "You are a voice assistant created by Calify. Your interface with users will be voice. "
            "Use short, natural responses. Avoid punctuation or formatting that is hard to pronounce. "
            "You are calling a user by phone."
        ),
    )

    logger.info("connecting AI agent to room %s", ctx.room.name)
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    participant = await ctx.wait_for_participant()
    logger.info("starting voice assistant for participant %s", participant.identity)

    agent = VoicePipelineAgent(
        vad=ctx.proc.userdata["vad"],
        stt=openai.STT(),
        llm=openai.LLM(),
        tts=openai.TTS(),
        chat_ctx=initial_ctx,
    )

    agent.start(ctx.room, participant)
    await agent.say("Hello, this is the Calify AI agent calling. How can I help you today?", allow_interruptions=True)


async def entrypoint(ctx: JobContext):
    metadata = get_job_metadata(ctx)
    voice_note_url = metadata.get("voiceNoteUrl")
    mode = metadata.get("mode")

    if mode == "voice_note" and voice_note_url:
        await run_prerecorded_voice(ctx, voice_note_url)
        return

    await run_ai_agent(ctx)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            agent_name=os.getenv("LIVEKIT_AGENT_NAME", "calify-agent"),
        ),
    )
