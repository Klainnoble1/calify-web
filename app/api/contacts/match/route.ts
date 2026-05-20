import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/utils/supabase/route';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteClient(req);
    
    // Ensure the user calling this API is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { emails = [], phoneNumbers = [] } = body;

    if (!Array.isArray(emails) || !Array.isArray(phoneNumbers)) {
      return NextResponse.json({ error: 'Invalid payload. Expected arrays of emails and phoneNumbers.' }, { status: 400 });
    }

    if (emails.length === 0 && phoneNumbers.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Build the query to find users matching any of the provided emails or IVR numbers
    let query = supabase.from('users').select('id, email, full_name, ivr_number');
    
    const orConditions = [];
    if (emails.length > 0) {
      // Supabase 'in' filter requires comma-separated strings
      orConditions.push(`email.in.(${emails.map(e => `"${e}"`).join(',')})`);
    }
    if (phoneNumbers.length > 0) {
      orConditions.push(`ivr_number.in.(${phoneNumbers.map(p => `"${p}"`).join(',')})`);
    }

    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }

    const { data: matches, error } = await query;

    if (error) {
      throw error;
    }

    // Exclude the currently authenticated user from the match results
    const filteredMatches = (matches || []).filter(m => m.id !== user.id);

    return NextResponse.json({ matches: filteredMatches });

  } catch (err: any) {
    console.error('[Contact Match Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
