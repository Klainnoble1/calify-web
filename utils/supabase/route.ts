import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { createClient as createCookieClient } from './server';

export async function createRouteClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return createCookieClient();
}
