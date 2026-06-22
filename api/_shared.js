import crypto from 'node:crypto';

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'account-media';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

let supabaseClient;
let supabaseModulePromise;

function headerValue(req, name) {
  const value = req.headers[name.toLowerCase()] || req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

export function getBaseUrl(req) {
  const host = headerValue(req, 'x-forwarded-host') || headerValue(req, 'host') || 'localhost:3000';
  const proto = headerValue(req, 'x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function getSupabase() {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  supabaseModulePromise ||= import('@supabase/supabase-js');
  const { createClient } = await supabaseModulePromise;

  supabaseClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return supabaseClient;
}

export async function requireSupabase() {
  const supabase = await getSupabase();
  if (!supabase) {
    const error = new Error('SUPABASE_URL yoki SUPABASE_SERVICE_ROLE_KEY sozlanmagan.');
    error.statusCode = 500;
    throw error;
  }
  return supabase;
}

export function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export function sendError(res, error, fallbackStatus = 500) {
  const statusCode = error?.statusCode || fallbackStatus;
  sendJson(res, statusCode, {
    error: error?.message || 'Kutilmagan xatolik yuz berdi.'
  });
}

export function allowMethods(req, res, methods) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return false;
  }

  if (!methods.includes(req.method)) {
    res.setHeader('Allow', methods.join(', '));
    sendJson(res, 405, { error: 'Method not allowed' });
    return false;
  }

  return true;
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export function parsePriceUz(input) {
  if (typeof input === 'number') return Math.trunc(input);
  const digits = String(input || '').replace(/[^\d]/g, '');
  return Number(digits);
}

export function publicAccount(row) {
  const createdAt = row.created_at || new Date().toISOString();
  return {
    id: row.id,
    platform_slug: row.platform_slug,
    title: row.title,
    description: row.description,
    account_game_id: row.account_game_id || null,
    account_server_id: row.account_server_id || null,
    account_nickname: row.account_nickname || null,
    account_region: row.account_region || null,
    price_uzs: Number(row.price_uzs || 0),
    status: row.status,
    is_top: Boolean(row.is_top),
    is_new: Date.now() - new Date(createdAt).getTime() <= THREE_DAYS_MS,
    media: Array.isArray(row.media) ? row.media : [],
    created_at: createdAt
  };
}

export function verifyTelegramInitData(initData, botToken, maxAgeSeconds = 24 * 60 * 60) {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const hashBuffer = Buffer.from(hash, 'hex');
  if (expectedBuffer.length !== hashBuffer.length) return null;
  if (!crypto.timingSafeEqual(expectedBuffer, hashBuffer)) return null;

  const authDate = Number(params.get('auth_date') || 0);
  if (maxAgeSeconds && authDate && Date.now() / 1000 - authDate > maxAgeSeconds) return null;

  const userRaw = params.get('user');
  if (!userRaw) return null;

  try {
    return JSON.parse(userRaw);
  } catch {
    return null;
  }
}

export function requireTelegramUser(req) {
  const initData = headerValue(req, 'x-telegram-init-data') || '';
  const botToken = process.env.BOT_TOKEN;
  const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';

  if (!botToken && !isProduction) {
    return {
      id: 0,
      username: 'local_dev',
      first_name: 'Local',
      last_name: 'Dev'
    };
  }

  const user = verifyTelegramInitData(initData, botToken);
  if (!user) {
    const error = new Error('Telegram sessiyasi tasdiqlanmadi. Mini appni Telegram ichidan oching.');
    error.statusCode = 401;
    throw error;
  }

  return user;
}

export function normalizeUsername(username) {
  return String(username || '').replace(/^@/, '').trim().toLowerCase();
}

export function safeFileName(fileName) {
  const fallback = 'media.bin';
  const name = String(fileName || fallback)
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);

  return name || fallback;
}

export function mediaKind(contentType) {
  if (String(contentType).startsWith('image/')) return 'image';
  if (String(contentType).startsWith('video/')) return 'video';
  return null;
}
