import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
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
      const effectiveCallerId = isPremium && call.caller_id ? call.caller_id : call.users.ivr_number;

      try {
        // Trigger the internal SIP outbound call API
        // For production, this should hit your deployed absolute URL.
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        
        const response = await fetch(`${apiUrl}/api/sip/call`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduledCallId: call.id,
            recipientNumber: call.recipient_number,
            callerId: effectiveCallerId,
            useAiAgent: call.use_ai_agent,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to initiate SIP call');
        }

        // The /api/sip/call route will update the status to 'calling'
        results.push({ id: call.id, status: 'calling' });

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
