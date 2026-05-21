-- OurPrime Full Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table (mirrors Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone_number TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  stripe_customer_id TEXT,
  ivr_number TEXT, -- Assigned VoIP number for free users
  balance_cents INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Auto-create a user profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Scheduled Calls Table
CREATE TABLE IF NOT EXISTS public.scheduled_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_number TEXT NOT NULL,
  caller_id TEXT,               -- Custom caller ID (premium only)
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  voice_note_url TEXT,          -- Prerecorded audio URL (premium only)
  use_ai_agent BOOLEAN DEFAULT FALSE,  -- AI Agent (premium only)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'calling', 'completed', 'failed', 'cancelled')),
  livekit_room_name TEXT,       -- LiveKit room created for the call
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call Logs for Billing
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scheduled_call_id UUID REFERENCES public.scheduled_calls(id),
  recipient_number TEXT NOT NULL,
  caller_id_used TEXT,
  duration_seconds INTEGER DEFAULT 0,
  -- Pricing: Free = 2 cents/min, Premium = 1 cent/min
  cost_cents INTEGER DEFAULT 0,
  ai_agent_used BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Contacts that a user invited from the mobile app
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

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_invites ENABLE ROW LEVEL SECURITY;

-- Policies: users can only read/write their own data
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can manage own scheduled calls" ON public.scheduled_calls;
DROP POLICY IF EXISTS "Users can view own call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can manage own contact invites" ON public.contact_invites;
DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
DROP POLICY IF EXISTS "Service role full access on scheduled_calls" ON public.scheduled_calls;
DROP POLICY IF EXISTS "Service role full access on call_logs" ON public.call_logs;
DROP POLICY IF EXISTS "Service role full access on contact_invites" ON public.contact_invites;

CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own scheduled calls" ON public.scheduled_calls
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own call logs" ON public.call_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own contact invites" ON public.contact_invites
  FOR ALL USING (auth.uid() = owner_id);

-- Service role can do everything (for backend/webhooks)
CREATE POLICY "Service role full access on users" ON public.users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access on scheduled_calls" ON public.scheduled_calls
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access on call_logs" ON public.call_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access on contact_invites" ON public.contact_invites
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
