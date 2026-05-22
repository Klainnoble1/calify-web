import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createRouteClient } from '@/utils/supabase/route';
import { ensureVoiceNotesBucket, toVoiceNoteStorageRef, VOICE_NOTES_BUCKET } from '@/lib/voice-notes';

const ALLOWED_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/webm',
  'audio/ogg',
]);

export async function POST(req: NextRequest) {
  const supabase = await createRouteClient(req);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  if (profile?.subscription_tier !== 'premium') {
    return NextResponse.json({ error: 'Premium plan required for prerecorded voice.' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Upload an audio file.' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Use an MP3, WAV, M4A, WebM, or OGG audio file.' }, { status: 400 });
  }

  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Audio file must be 25 MB or smaller.' }, { status: 400 });
  }

  await ensureVoiceNotesBucket();

  const extension = file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'audio';
  const storagePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(VOICE_NOTES_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    voiceNoteUrl: toVoiceNoteStorageRef(storagePath),
    fileName: file.name,
  });
}
