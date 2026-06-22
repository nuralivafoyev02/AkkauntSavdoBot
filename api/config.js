import { getAppSettings } from './_settings.js';
import { allowMethods, getSupabase, sendJson } from './_shared.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;

  const settings = await getAppSettings(await getSupabase());

  sendJson(res, 200, {
    adminUsername: process.env.ADMIN_USERNAME || 'Geto_senpai',
    botUsername: process.env.BOT_USERNAME || 'GetosenpaiShopBot',
    maxImageBytes: Number(process.env.MAX_IMAGE_BYTES || 8 * 1024 * 1024),
    maxVideoBytes: Number(process.env.MAX_VIDEO_BYTES || 80 * 1024 * 1024),
    ...settings
  });
}
