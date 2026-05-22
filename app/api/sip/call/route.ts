import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/utils/supabase/route';
import { createOutboundSipCall, normalizePhoneNumber } from '@/lib/sip-outbound';
import { createVoiceNoteSignedUrl } from '@/lib/voice-notes';

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
    const { scheduledCallId, recipientNumber, callerId, useAiAgent, voiceNoteUrl: rawVoiceNoteUrl } = body;
    const normalizedRecipient = normalizePhoneNumber(recipientNumber);

    if (!normalizedRecipient) {
      return NextResponse.json({ error: 'Enter a valid recipient phone number.' }, { status: 400 });
    }

    const isPremium = profile.subscription_tier === 'premium';

    // Enforce plan restrictions
    if (useAiAgent && !isPremium) {
      return NextResponse.json({ error: 'AI Agent requires Premium plan' }, { status: 403 });
    }

    if (rawVoiceNoteUrl && !isPremium) {
      return NextResponse.json({ error: 'Prerecorded voice requires Premium plan' }, { status: 403 });
    }

    // Determine Caller ID: premium = custom, basic = IVR number
    const effectiveCallerId = isPremium && callerId ? callerId : (profile.ivr_number || process.env.DEFAULT_SIP_NUMBER);
    if (!effectiveCallerId) {
      return NextResponse.json({ error: 'No caller ID configured. Please set your IVR number in Settings.' }, { status: 400 });
    }

    const voiceNoteUrl = await createVoiceNoteSignedUrl(rawVoiceNoteUrl);
    const { roomName } = await createOutboundSipCall({
      userId: user.id,
      recipientNumber: normalizedRecipient,
      callerId: effectiveCallerId,
      useAiAgent: isPremium && Boolean(useAiAgent),
      voiceNoteUrl: isPremium ? voiceNoteUrl : null,
      scheduledCallId: scheduledCallId || null,
    });

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
      recipient_number: normalizedRecipient,
      caller_id_used: effectiveCallerId,
      ai_agent_used: useAiAgent || false,
      started_at: new Date().toISOString(),
      // Cost: Premium = 1 cent/min, Basic = 2 cents/min (duration tracked via webhook/agent)
    });

    return NextResponse.json({
      success: true,
      roomName,
      message: `Call initiated to ${normalizedRecipient}`,
    });
  } catch (err: any) {
    console.error('[SIP Call Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
