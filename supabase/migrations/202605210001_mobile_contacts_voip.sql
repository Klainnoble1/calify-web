-- Mobile contacts, invite tracking, and VoIP scheduling support.
-- Safe to run more than once.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number TEXT;

CREATE TABLE IF NOT EXISTS public.contact_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'already_registered', 'accepted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(owner_id, email)
);

ALTER TABLE public.contact_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own contact invites" ON public.contact_invites;
DROP POLICY IF EXISTS "Service role full access on contact_invites" ON public.contact_invites;

CREATE POLICY "Users can manage own contact invites" ON public.contact_invites
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Service role full access on contact_invites" ON public.contact_invites
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

ALTER TABLE public.scheduled_calls ADD COLUMN IF NOT EXISTS livekit_room_name TEXT;
