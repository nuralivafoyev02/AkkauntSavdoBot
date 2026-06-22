import { getAppSettings, saveAppSettings } from './_settings.js';
import { allowMethods, getSupabase, readJson, requireAdmin, sendError, sendJson } from './_shared.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'PUT'])) return;

  try {
    const supabase = await getSupabase();

    if (req.method === 'GET') {
      sendJson(res, 200, await getAppSettings(supabase));
      return;
    }

    const { user, supabase: adminSupabase } = await requireAdmin(req);
    if (!adminSupabase) {
      sendJson(res, 503, { error: 'Supabase sozlanmagan.' });
      return;
    }

    const body = await readJson(req);
    sendJson(res, 200, await saveAppSettings(adminSupabase, body, user));
  } catch (error) {
    sendError(res, error);
  }
}
