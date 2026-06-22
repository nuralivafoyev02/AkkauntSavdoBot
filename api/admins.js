import {
  allowMethods,
  envList,
  normalizeUsername,
  readJson,
  requireAdmin,
  sendError,
  sendJson
} from './_shared.js';

function cleanUsername(value) {
  return normalizeUsername(value).replace(/[^\w\d_]/g, '').slice(0, 32);
}

function cleanTgId(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

function envSuperAdmins() {
  const ids = [
    ...envList('ADMIN_TELEGRAM_IDS'),
    ...envList('SUPERADMIN_TELEGRAM_IDS'),
    process.env.ADMIN_TELEGRAM_ID,
    process.env.SUPERADMIN_TELEGRAM_ID
  ].filter(Boolean);
  const usernames = [
    ...envList('ADMIN_USERNAMES'),
    ...envList('SUPERADMIN_USERNAMES'),
    process.env.ADMIN_USERNAME,
    process.env.SUPERADMIN_USERNAME
  ].filter(Boolean);

  const count = Math.max(ids.length, usernames.length);
  return Array.from({ length: count }, (_, index) => ({
    id: `env-${ids[index] || usernames[index] || index}`,
    tg_user_id: ids[index] ? Number(ids[index]) : null,
    username: cleanUsername(usernames[index] || ''),
    role: 'superadmin',
    is_active: true,
    source: 'env',
    created_at: null
  }));
}

async function listAdmins(res, supabase) {
  let admins = [];
  if (supabase) {
    const { data, error } = await supabase
      .from('app_admins')
      .select('id,tg_user_id,username,role,is_active,created_at')
      .order('created_at', { ascending: false });

    if (error && error.code !== '42P01') throw error;
    admins = data || [];
  }

  sendJson(res, 200, {
    admins: [
      ...envSuperAdmins(),
      ...admins.map((admin) => ({
        ...admin,
        source: 'database'
      }))
    ]
  });
}

async function createAdmin(req, res, supabase, user) {
  if (!supabase) {
    sendJson(res, 503, { error: 'Supabase sozlanmagani uchun admin qo\'shib bo\'lmaydi.' });
    return;
  }

  const body = await readJson(req);
  const tgUserId = cleanTgId(body.tgUserId || body.tg_user_id);
  const username = cleanUsername(body.username);

  if (!tgUserId && !username) {
    sendJson(res, 422, { error: 'Telegram ID yoki username kiriting.' });
    return;
  }

  const payload = {
    tg_user_id: tgUserId,
    username: username || null,
    role: 'admin',
    is_active: true,
    added_by_tg_id: user.id || null
  };

  const { data, error } = await supabase
    .from('app_admins')
    .upsert(payload, {
      onConflict: tgUserId ? 'tg_user_id' : 'username'
    })
    .select('id,tg_user_id,username,role,is_active,created_at')
    .single();

  if (error) throw error;
  sendJson(res, 201, { admin: { ...data, source: 'database' } });
}

async function removeAdmin(req, res, supabase) {
  if (!supabase) {
    sendJson(res, 503, { error: 'Supabase sozlanmagan.' });
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const id = String(url.searchParams.get('id') || '').trim();
  if (!id || id.startsWith('env-')) {
    sendJson(res, 422, { error: 'Env superadminni mini appdan o\'chirib bo\'lmaydi.' });
    return;
  }

  const { error } = await supabase
    .from('app_admins')
    .delete()
    .eq('id', id)
    .neq('role', 'superadmin');

  if (error) throw error;
  sendJson(res, 200, { ok: true });
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST', 'DELETE'])) return;

  try {
    const { user, supabase } = await requireAdmin(req, { superAdmin: true });

    if (req.method === 'GET') {
      await listAdmins(res, supabase);
      return;
    }

    if (req.method === 'POST') {
      await createAdmin(req, res, supabase, user);
      return;
    }

    await removeAdmin(req, res, supabase);
  } catch (error) {
    sendError(res, error);
  }
}
