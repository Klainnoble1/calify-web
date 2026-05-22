import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createRouteClient } from '@/utils/supabase/route';

export async function POST(req: NextRequest) {
  if (process.env.ENABLE_PREMIUM_TEST_ACCESS !== 'true') {
    return NextResponse.json({ error: 'Premium test access is disabled.' }, { status: 404 });
  }

  const allowedEmails = (process.env.PREMIUM_TEST_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (allowedEmails.length === 0) {
    return NextResponse.json({ error: 'No premium test emails are configured.' }, { status: 503 });
  }

  const supabase = await createRouteClient(req);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!allowedEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: 'This account is not allowed for Premium testing.' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('users')
    .update({ subscription_tier: 'premium' })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, subscription_tier: 'premium' });
}
