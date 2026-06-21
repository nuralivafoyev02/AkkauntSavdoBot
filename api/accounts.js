import {
  allowMethods,
  getBaseUrl,
  getSupabase,
  parsePriceUz,
  publicAccount,
  readJson,
  requireTelegramUser,
  sendError,
  sendJson
} from './_shared.js';
import { mockAccounts } from './_mock.js';

const MAX_MEDIA_ITEMS = 10;

function cleanText(value, maxLength) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function cleanDescription(value) {
  return String(value || '').trim().replace(/\r\n/g, '\n').slice(0, 3000);
}

function cleanMedia(media) {
  if (!Array.isArray(media)) return [];

  return media
    .slice(0, MAX_MEDIA_ITEMS)
    .map((item) => ({
      url: cleanText(item.url, 1000),
      path: cleanText(item.path, 500),
      type: item.type === 'video' ? 'video' : 'image',
      name: cleanText(item.name, 180)
    }))
    .filter((item) => item.url && item.path);
}

async function listAccounts(req, res) {
  const url = new URL(req.url, getBaseUrl(req));
  const platform = url.searchParams.get('platform');
  const id = url.searchParams.get('id');

  const supabase = getSupabase();
  if (!supabase) {
    let accounts = mockAccounts.map(publicAccount);
    if (platform) accounts = accounts.filter((account) => account.platform_slug === platform);
    if (id) accounts = accounts.filter((account) => account.id === id);

    sendJson(res, 200, {
      demo: true,
      accounts
    });
    return;
  }

  let query = supabase
    .from('accounts')
    .select('id,platform_slug,title,description,price_uzs,status,is_top,media,created_at')
    .eq('status', 'available')
    .order('is_top', { ascending: false })
    .order('created_at', { ascending: false });

  if (platform) query = query.eq('platform_slug', platform);
  if (id) query = query.eq('id', id);

  const { data, error } = await query;
  if (error) throw error;

  sendJson(res, 200, {
    demo: false,
    accounts: (data || []).map(publicAccount)
  });
}

async function createAccount(req, res) {
  const user = requireTelegramUser(req);
  const body = await readJson(req);

  const title = cleanText(body.title, 140);
  const description = cleanDescription(body.description);
  const platformSlug = cleanText(body.platformSlug || body.platform_slug, 80);
  const priceUz = parsePriceUz(body.price || body.price_uzs);
  const media = cleanMedia(body.media);

  if (!title) {
    sendJson(res, 422, { error: 'Avval akkaunt nomini kiriting.' });
    return;
  }

  if (!description) {
    sendJson(res, 422, { error: "Akkaunt haqida to'liq ma'lumot kiriting." });
    return;
  }

  if (!platformSlug) {
    sendJson(res, 422, { error: 'Platformani tanlang.' });
    return;
  }

  if (!Number.isFinite(priceUz) || priceUz <= 0) {
    sendJson(res, 422, { error: "Narx kiritilmasa, akkaunt sotuvga qo'yilmaydi." });
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    const created = publicAccount({
      id: `local-${Date.now()}`,
      platform_slug: platformSlug,
      title,
      description,
      price_uzs: priceUz,
      status: 'available',
      is_top: false,
      media,
      created_at: new Date().toISOString()
    });

    sendJson(res, 201, {
      demo: true,
      account: created
    });
    return;
  }

  const sellerName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      platform_slug: platformSlug,
      title,
      description,
      price_uzs: priceUz,
      status: 'available',
      seller_tg_id: user.id || null,
      seller_username: user.username || null,
      seller_name: sellerName || null,
      media
    })
    .select('id,platform_slug,title,description,price_uzs,status,is_top,media,created_at')
    .single();

  if (error) throw error;

  sendJson(res, 201, {
    demo: false,
    account: publicAccount(data)
  });
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  try {
    if (req.method === 'GET') {
      await listAccounts(req, res);
      return;
    }

    await createAccount(req, res);
  } catch (error) {
    sendError(res, error);
  }
}
