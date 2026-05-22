import { AgentDispatchClient, RoomServiceClient, SipClient } from 'livekit-server-sdk';

export function normalizePhoneNumber(value: unknown) {
  return typeof value === 'string' ? value.replace(/[^0-9+]/g, '').trim() : '';
}

export function getSipConfig() {
  const livekitUrl = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const sipTrunkId = process.env.LIVEKIT_SIP_TRUNK_ID;

  const missing = [
    !livekitUrl && 'LIVEKIT_URL',
    !apiKey && 'LIVEKIT_API_KEY',
    !apiSecret && 'LIVEKIT_API_SECRET',
    !sipTrunkId && 'LIVEKIT_SIP_TRUNK_ID',
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    throw new Error(`VoIP is not configured. Missing ${missing.join(', ')}.`);
  }

  return {
    livekitUrl,
    livekitHttpsUrl: livekitUrl!.replace('wss://', 'https://'),
    apiKey: apiKey!,
    apiSecret: apiSecret!,
    sipTrunkId: sipTrunkId!,
    defaultSipNumber: process.env.DEFAULT_SIP_NUMBER || null,
  };
}

export function getSipReadiness() {
  const required = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'LIVEKIT_SIP_TRUNK_ID'];
  const missing = required.filter((key) => !process.env[key]);

  return {
    ready: missing.length === 0,
    missing,
    defaultSipNumberConfigured: Boolean(process.env.DEFAULT_SIP_NUMBER),
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isLiveKitObjectNotFound(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('object cannot be found') || message.includes('object can not be found') || message.includes('not_found');
}

export async function createOutboundSipCall(input: {
  userId: string;
  recipientNumber: string;
  callerId?: string | null;
  useAiAgent?: boolean;
  voiceNoteUrl?: string | null;
  scheduledCallId?: string | null;
}) {
  const recipientNumber = normalizePhoneNumber(input.recipientNumber);
  if (!recipientNumber) {
    throw new Error('A valid recipient phone number is required.');
  }

  const config = getSipConfig();
  const roomName = `sip-${input.userId}-${Date.now()}`;
  const roomService = new RoomServiceClient(config.livekitHttpsUrl, config.apiKey, config.apiSecret);
  const sipClient = new SipClient(config.livekitHttpsUrl, config.apiKey, config.apiSecret);

  try {
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 300,
      maxParticipants: 2,
    });
  } catch (error) {
    throw new Error(`Could not create the Calify call room. ${getErrorMessage(error)}`);
  }

  const shouldDispatchAgent = Boolean(input.useAiAgent || input.voiceNoteUrl);
  if (shouldDispatchAgent) {
    const agentName = process.env.LIVEKIT_AGENT_NAME || 'calify-agent';
    const dispatchClient = new AgentDispatchClient(config.livekitHttpsUrl, config.apiKey, config.apiSecret);

    try {
      await dispatchClient.createDispatch(roomName, agentName, {
        metadata: JSON.stringify({
          mode: input.voiceNoteUrl ? 'voice_note' : 'ai_agent',
          voiceNoteUrl: input.voiceNoteUrl || null,
          useAiAgent: Boolean(input.useAiAgent),
          userId: input.userId,
          scheduledCallId: input.scheduledCallId || null,
          recipientNumber,
        }),
      });
    } catch (error) {
      if (isLiveKitObjectNotFound(error)) {
        throw new Error(`Calify could not find a running call worker named "${agentName}". Start or deploy the worker with LIVEKIT_AGENT_NAME=${agentName}, then try again.`);
      }
      throw new Error(`Could not start the Calify call worker. ${getErrorMessage(error)}`);
    }
  }

  try {
    await sipClient.createSipParticipant(config.sipTrunkId, recipientNumber, roomName, {
      participantIdentity: `pstn-${recipientNumber}`,
      participantName: recipientNumber,
      fromNumber: input.callerId || undefined,
      hidePhoneNumber: false,
    });
  } catch (error) {
    if (isLiveKitObjectNotFound(error)) {
      throw new Error('Calify could not find the configured outbound phone trunk. Check that LIVEKIT_SIP_TRUNK_ID is an outbound SIP trunk ID from the same LiveKit project as LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.');
    }
    throw new Error(`Could not dial the phone number through Calify. ${getErrorMessage(error)}`);
  }

  return {
    roomName,
    recipientNumber,
  };
}
