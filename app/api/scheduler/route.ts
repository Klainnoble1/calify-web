import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/utils/supabase/route';

export async function GET(req: NextRequest) {
  const supabase = await createRouteClient(req);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('scheduled_calls')
    .select('*')
    .eq('user_id', user.id)
    .order('scheduled_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createRouteClient(req);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check subscription tier
  const { data: profile } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const isPremium = profile?.subscription_tier === 'premium';

  const body = await req.json();
  const { recipient_number, scheduled_at, caller_id, use_ai_agent, voice_note_url } = body;
  const recipientNumbers = Array.isArray(body.recipient_numbers)
    ? body.recipient_numbers
    : recipient_number
      ? [recipient_number]
      : [];
  const normalizedRecipients = Array.from(
    new Set(
      recipientNumbers
        .map((value: unknown) => (typeof value === 'string' ? value.replace(/[^0-9+]/g, '').trim() : ''))
        .filter(Boolean),
    ),
  );

  if (normalizedRecipients.length === 0) {
    return NextResponse.json({ error: 'At least one recipient number is required' }, { status: 400 });
  }

  if (!scheduled_at) {
    return NextResponse.json({ error: 'Schedule time is required' }, { status: 400 });
  }

  if (!isPremium && (use_ai_agent || voice_note_url)) {
    return NextResponse.json({ error: 'Premium plan required for this feature' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('scheduled_calls')
    .insert(normalizedRecipients.map((recipient) => ({
      user_id: user.id,
      recipient_number: recipient,
      scheduled_at,
      caller_id: isPremium ? caller_id : null,
      use_ai_agent: isPremium ? use_ai_agent : false,
      voice_note_url: isPremium ? voice_note_url : null,
      status: 'pending',
    })))
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(recipient_number && !Array.isArray(body.recipient_numbers) ? data?.[0] : data);
}

export async function DELETE(req: NextRequest) {
  const supabase = await createRouteClient(req);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();

  const { error } = await supabase
    .from('scheduled_calls')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
