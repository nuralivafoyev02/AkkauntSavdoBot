import {
  allowMethods,
  getSupabase,
  readJson,
  requireTelegramUser,
  resolveAdminRole,
  sendError,
  sendJson
} from './_shared.js';

function displayName(user) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username || 'Foydalanuvchi';
}

function isMissingProfileTable(error) {
  return error?.code === '42P01' || /relation .*user_profiles.* does not exist/i.test(error?.message || '');
}

function cleanProfileName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

function cleanAvatarUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.length > 900000) return '';
  if (/^data:image\/(png|jpe?g|webp);base64,/i.test(url)) return url;
  if (/^https?:\/\//i.test(url)) return url.slice(0, 1000);
  return '';
}

async function loadProfile(supabase, user) {
  if (!supabase || !user?.id) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('display_name,avatar_url')
    .eq('tg_user_id', user.id)
    .maybeSingle();

  if (error) {
    if (isMissingProfileTable(error)) return null;
    throw error;
  }

  return data || null;
}

function mePayload(user, role, profile = null) {
  const profileName = cleanProfileName(profile?.display_name);
  const profileAvatar = cleanAvatarUrl(profile?.avatar_url);

  return {
    user: {
      id: user.id ?? null,
      username: user.username || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      photo_url: profileAvatar || user.photo_url || '',
      telegram_photo_url: user.photo_url || '',
      display_name: profileName || displayName(user),
      telegram_display_name: displayName(user),
      is_premium: Boolean(user.is_premium)
    },
    role
  };
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'PUT'])) return;

  try {
    const user = requireTelegramUser(req);
    const supabase = await getSupabase();
    const role = await resolveAdminRole(user, supabase);
    const profile = await loadProfile(supabase, user);

    if (req.method === 'GET') {
      sendJson(res, 200, mePayload(user, role, profile));
      return;
    }

    if (!supabase) {
      sendJson(res, 503, { error: 'Supabase sozlanmagani uchun profil saqlanmadi.' });
      return;
    }

    const body = await readJson(req);
    const displayNameOverride = cleanProfileName(body.displayName || body.display_name);
    const avatarUrl = cleanAvatarUrl(body.avatarUrl || body.avatar_url);

    if (!displayNameOverride) {
      sendJson(res, 422, { error: 'Ism kamida 1 ta belgidan iborat bo\'lsin.' });
      return;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        tg_user_id: user.id,
        display_name: displayNameOverride,
        avatar_url: avatarUrl || null
      }, { onConflict: 'tg_user_id' })
      .select('display_name,avatar_url')
      .single();

    if (error) throw error;

    sendJson(res, 200, mePayload(user, role, data));
  } catch (error) {
    sendError(res, error);
  }
}
