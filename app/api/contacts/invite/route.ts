import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/utils/supabase/route';
import { createAdminClient } from '@/utils/supabase/admin';

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizePhone(value: unknown) {
  return typeof value === 'string' ? value.replace(/[^0-9+]/g, '').trim() : '';
}

function generateDisplayName(name: unknown, email: string) {
  const cleanedName = typeof name === 'string' ? name.trim() : '';
  return cleanedName || email.split('@')[0] || 'New contact';
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteClient(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const email = normalizeEmail(body.email);
    const phoneNumber = normalizePhone(body.phoneNumber);
    const fullName = generateDisplayName(body.fullName, email);

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existingProfile, error: lookupError } = await admin
      .from('users')
      .select('id, email, full_name, ivr_number, phone_number')
      .eq('email', email)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (existingProfile) {
      await recordContactInvite(admin, {
        ownerId: user.id,
        invitedUserId: existingProfile.id,
        fullName,
        email,
        phoneNumber,
        status: 'already_registered',
      });

      return NextResponse.json({
        status: 'already_registered',
        inviteSent: false,
        user: existingProfile,
      });
    }

    const redirectTo =
      process.env.CALIFY_INVITE_REDIRECT_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      `${req.nextUrl.origin}/login`;

    const { data: invitedUser, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName,
        phone_number: phoneNumber || null,
        invited_by: user.id,
      },
      redirectTo,
    });

    if (inviteError) {
      throw inviteError;
    }

    const createdUserId = invitedUser.user?.id;
    if (createdUserId) {
      await admin.from('users').upsert(
        {
          id: createdUserId,
          email,
          full_name: fullName,
          phone_number: phoneNumber || null,
        },
        { onConflict: 'id' },
      );

      await recordContactInvite(admin, {
        ownerId: user.id,
        invitedUserId: createdUserId,
        fullName,
        email,
        phoneNumber,
        status: 'invited',
      });
    }

    return NextResponse.json({
      status: 'invited',
      inviteSent: true,
      user: {
        id: createdUserId,
        email,
        full_name: fullName,
        ivr_number: null,
        phone_number: phoneNumber || null,
      },
    });
  } catch (err: any) {
    console.error('[Contact Invite Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function recordContactInvite(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    ownerId: string;
    invitedUserId: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    status: 'invited' | 'already_registered';
  },
) {
  const { error } = await admin.from('contact_invites').upsert(
    {
      owner_id: input.ownerId,
      invited_user_id: input.invitedUserId,
      full_name: input.fullName,
      email: input.email,
      phone_number: input.phoneNumber || null,
      status: input.status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'owner_id,email' },
  );

  if (error) {
    console.warn('[Contact Invite Record Error]', error.message);
  }
}
