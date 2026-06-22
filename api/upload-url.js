import crypto from 'node:crypto';
import {
  STORAGE_BUCKET,
  allowMethods,
  mediaKind,
  readJson,
  requireSupabase,
  requireTelegramUser,
  safeFileName,
  sendError,
  sendJson
} from './_shared.js';

const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES || 8 * 1024 * 1024);
const MAX_VIDEO_BYTES = Number(process.env.MAX_VIDEO_BYTES || 80 * 1024 * 1024);

function todayFolder() {
  return new Date().toISOString().slice(0, 7);
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  try {
    const user = requireTelegramUser(req);
    const body = await readJson(req);
    const contentType = String(body.contentType || '');
    const kind = mediaKind(contentType);
    const fileSize = Number(body.size || 0);

    if (!kind) {
      sendJson(res, 422, { error: 'Faqat rasm yoki video yuklash mumkin.' });
      return;
    }

    const limit = kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (!fileSize || fileSize > limit) {
      const limitMb = Math.floor(limit / 1024 / 1024);
      sendJson(res, 422, { error: `Fayl hajmi ${limitMb} MB dan oshmasin.` });
      return;
    }

    const supabase = await requireSupabase();
    const fileName = safeFileName(body.fileName);
    const path = `submissions/${user.id || 'guest'}/${todayFolder()}/${crypto.randomUUID()}-${fileName}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(path);

    if (error) throw error;

    const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

    sendJson(res, 200, {
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl: publicData.publicUrl,
      type: kind
    });
  } catch (error) {
    sendError(res, error);
  }
}
