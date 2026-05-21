import { RoomServiceClient, SipClient } from 'livekit-server-sdk';

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

export async function createOutboundSipCall(input: {
  userId: string;
  recipientNumber: string;
}) {
  const recipientNumber = normalizePhoneNumber(input.recipientNumber);
  if (!recipientNumber) {
    throw new Error('A valid recipient phone number is required.');
  }

  const config = getSipConfig();
  const roomName = `sip-${input.userId}-${Date.now()}`;
  const roomService = new RoomServiceClient(config.livekitHttpsUrl, config.apiKey, config.apiSecret);
  const sipClient = new SipClient(config.livekitHttpsUrl, config.apiKey, config.apiSecret);

  await roomService.createRoom({
    name: roomName,
    emptyTimeout: 300,
    maxParticipants: 2,
  });

  await sipClient.createSipParticipant(config.sipTrunkId, recipientNumber, roomName, {
    participantIdentity: `pstn-${recipientNumber}`,
    participantName: recipientNumber,
    hidePhoneNumber: false,
  });

  return {
    roomName,
    recipientNumber,
  };
}
