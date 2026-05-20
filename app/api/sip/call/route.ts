import { NextRequest, NextResponse } from 'next/server';
import { RoomServiceClient, SipClient } from 'livekit-server-sdk';
import { createRouteClient } from '@/utils/supabase/route';

const livekitUrl = process.env.LIVEKIT_URL!.replace('wss://', 'https://');
const apiKey = process.env.LIVEKIT_API_KEY!;
const apiSecret = process.env.LIVEKIT_API_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Load user profile to check subscription
    const { data: profile } = await supabase
      .from('users')
      .select('subscription_tier, ivr_number, balance_cents')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const body = await req.json();
    const { scheduledCallId, recipientNumber, callerId, useAiAgent } = body;

    const isPremium = profile.subscription_tier === 'premium';

    // Enforce plan restrictions
    if (useAiAgent && !isPremium) {
      return NextResponse.json({ error: 'AI Agent requires Premium plan' }, { status: 403 });
    }

    // Determine Caller ID: premium = custom, basic = IVR number
    const effectiveCallerId = isPremium && callerId ? callerId : (profile.ivr_number || process.env.DEFAULT_SIP_NUMBER);
    if (!effectiveCallerId) {
      return NextResponse.json({ error: 'No caller ID configured. Please set your IVR number in Settings.' }, { status: 400 });
    }

    // Create a LiveKit room for this call
    const roomName = `call-${user.id}-${Date.now()}`;
    const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
    await roomService.createRoom({ name: roomName, emptyTimeout: 300, maxParticipants: 2 });

    // Create SIP participant to bridge the PSTN call
    const sipClient = new SipClient(livekitUrl, apiKey, apiSecret);

    const sipTrunkId = process.env.LIVEKIT_SIP_TRUNK_ID;
    if (!sipTrunkId) {
      return NextResponse.json({ error: 'SIP Trunk not configured. Set LIVEKIT_SIP_TRUNK_ID in .env.local' }, { status: 500 });
    }

    await sipClient.createSipParticipant(
      sipTrunkId,
      recipientNumber,
      roomName,
      {
        participantIdentity: `pstn-${recipientNumber}`,
        participantName: recipientNumber,
        hidePhoneNumber: false,
      }
    );

    // Log the call start in DB
    if (scheduledCallId) {
      await supabase
        .from('scheduled_calls')
        .update({ status: 'calling', livekit_room_name: roomName })
        .eq('id', scheduledCallId);
    }

    await supabase.from('call_logs').insert({
      user_id: user.id,
      scheduled_call_id: scheduledCallId || null,
      recipient_number: recipientNumber,
      caller_id_used: effectiveCallerId,
      ai_agent_used: useAiAgent || false,
      started_at: new Date().toISOString(),
      // Cost: Premium = 1 cent/min, Basic = 2 cents/min (duration tracked via webhook/agent)
    });

    return NextResponse.json({
      success: true,
      roomName,
      message: `Call initiated to ${recipientNumber}`,
    });
  } catch (err: any) {
    console.error('[SIP Call Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
