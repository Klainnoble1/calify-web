import { NextResponse } from 'next/server';
import { getSipReadiness } from '@/lib/sip-outbound';

export async function GET() {
  return NextResponse.json(getSipReadiness());
}
