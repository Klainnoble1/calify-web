import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createOutboundSipCall, getSipConfig } from '@/lib/sip-outbound';

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    getSipConfig();
    const supabase = createAdminClient();
    
    // Find all pending calls whose scheduled time has passed
    const now = new Date().toISOString();
    const { data: pendingCalls, error: fetchError } = await supabase
      .from('scheduled_calls')
      .select('*, users!inner(subscription_tier, ivr_number)')
      .eq('status', 'pending')
      .lte('scheduled_at', now);

    if (fetchError) {
      console.error('[CRON ERROR] Failed to fetch pending calls:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!pendingCalls || pendingCalls.length === 0) {
      return NextResponse.json({ message: 'No pending calls to process' });
    }

    const results = [];

    for (const call of pendingCalls) {
      const isPremium = call.users.subscription_tier === 'premium';
      const effectiveCallerId = isPremium && call.caller_id
        ? call.caller_id
        : (call.users.ivr_number || process.env.DEFAULT_SIP_NUMBER);

      try {
        if (!effectiveCallerId) {
          throw new Error('No caller ID configured for scheduled call.');
        }

        const { roomName } = await createOutboundSipCall({
          userId: call.user_id,
          recipientNumber: call.recipient_number,
        });

        await supabase
          .from('scheduled_calls')
          .update({ status: 'calling', livekit_room_name: roomName })
          .eq('id', call.id);

        await supabase.from('call_logs').insert({
          user_id: call.user_id,
          scheduled_call_id: call.id,
          recipient_number: call.recipient_number,
          caller_id_used: effectiveCallerId,
          ai_agent_used: call.use_ai_agent || false,
          started_at: new Date().toISOString(),
        });

        results.push({ id: call.id, status: 'calling', roomName });

      } catch (err: any) {
        console.error(`[CRON ERROR] Failed to process call ${call.id}:`, err.message);
        // Mark as failed so it doesn't infinitely loop
        await supabase
          .from('scheduled_calls')
          .update({ status: 'failed' })
          .eq('id', call.id);
        
        results.push({ id: call.id, status: 'failed', error: err.message });
      }
    }

    return NextResponse.json({ processed: results.length, results });

  } catch (err: any) {
    console.error('[CRON FATAL ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
