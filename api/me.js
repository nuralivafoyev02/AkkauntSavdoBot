import {
  allowMethods,
  getSupabase,
  requireTelegramUser,
  resolveAdminRole,
  sendError,
  sendJson
} from './_shared.js';

function displayName(user) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username || 'Foydalanuvchi';
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;

  try {
    const user = requireTelegramUser(req);
    const supabase = await getSupabase();
    const role = await resolveAdminRole(user, supabase);

    sendJson(res, 200, {
      user: {
        id: user.id ?? null,
        username: user.username || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        photo_url: user.photo_url || '',
        display_name: displayName(user)
      },
      role
    });
  } catch (error) {
    sendError(res, error);
  }
}
