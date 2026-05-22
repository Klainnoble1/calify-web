import { createAdminClient } from '@/utils/supabase/admin';

const VOICE_NOTES_BUCKET = 'voice-notes';
const VOICE_NOTE_PREFIX = `supabase://${VOICE_NOTES_BUCKET}/`;

export function toVoiceNoteStorageRef(path: string) {
  return `${VOICE_NOTE_PREFIX}${path}`;
}

export function parseVoiceNoteStorageRef(value: string | null | undefined) {
  if (!value?.startsWith(VOICE_NOTE_PREFIX)) return null;
  return value.slice(VOICE_NOTE_PREFIX.length);
}

export async function ensureVoiceNotesBucket() {
  const supabase = createAdminClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((bucket) => bucket.name === VOICE_NOTES_BUCKET);

  if (!exists) {
    const { error } = await supabase.storage.createBucket(VOICE_NOTES_BUCKET, {
      public: false,
      fileSizeLimit: 25 * 1024 * 1024,
      allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/webm', 'audio/ogg'],
    });

    if (error) throw error;
  }
}

export async function createVoiceNoteSignedUrl(value: string | null | undefined) {
  const path = parseVoiceNoteStorageRef(value);
  if (!path) return value || null;

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(VOICE_NOTES_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error) throw error;
  return data.signedUrl;
}

export { VOICE_NOTES_BUCKET };
