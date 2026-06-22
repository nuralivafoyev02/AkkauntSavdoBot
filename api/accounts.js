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
import { parseMobileLegendsId } from './account-lookup.js';

const MAX_MEDIA_ITEMS = 10;
const ACCOUNT_SELECT_BASE = 'id,platform_slug,title,description,price_uzs,status,is_top,media,created_at';
const ACCOUNT_SELECT_META = `${ACCOUNT_SELECT_BASE},account_game_id,account_server_id,account_nickname,account_region`;

function cleanText(value, maxLength) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function cleanDescription(value) {
  return String(value || '').trim().replace(/\r\n/g, '\n').slice(0, 3000);
}

function isMissingColumnError(error) {
  return error?.code === '42703' || /column .* does not exist/i.test(error?.message || '');
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
  const statusParam = url.searchParams.get('status');
  const status = ['available', 'sold'].includes(statusParam) ? statusParam : 'available';

  const supabase = await getSupabase();
  if (!supabase) {
    let accounts = mockAccounts.map(publicAccount);
    if (platform) accounts = accounts.filter((account) => account.platform_slug === platform);
    if (id) accounts = accounts.filter((account) => account.id === id);
    accounts = accounts.filter((account) => account.status === status);

    sendJson(res, 200, {
      demo: true,
      accounts
    });
    return;
  }

  function buildQuery(select) {
    let query = supabase
      .from('accounts')
      .select(select)
      .eq('status', status)
      .order('is_top', { ascending: false })
      .order('created_at', { ascending: false });

    if (platform) query = query.eq('platform_slug', platform);
    if (id) query = query.eq('id', id);
    return query;
  }

  let { data, error } = await buildQuery(ACCOUNT_SELECT_META);
  if (error && isMissingColumnError(error)) {
    ({ data, error } = await buildQuery(ACCOUNT_SELECT_BASE));
  }

  if (error) throw error;

  sendJson(res, 200, {
    demo: false,
    accounts: (data || []).map(publicAccount)
  });
}

async function createAccount(req, res) {
  const user = requireTelegramUser(req);
  const body = await readJson(req);

  const platformSlug = cleanText(body.platformSlug || body.platform_slug, 80);
  const accountIdRaw = cleanText(body.accountIdRaw || body.account_id_raw, 80);
  let accountGameId = cleanText(body.accountGameId || body.account_game_id, 40);
  let accountServerId = cleanText(body.accountServerId || body.account_server_id, 40);
  let accountNickname = cleanText(body.accountNickname || body.account_nickname, 120);
  let accountRegion = cleanText(body.accountRegion || body.account_region, 120);
  let title = cleanText(body.title, 140);
  const description = cleanDescription(body.description);
  const priceUz = parsePriceUz(body.price || body.price_uzs);
  const media = cleanMedia(body.media);

  if (!platformSlug) {
    sendJson(res, 422, { error: 'Platformani tanlang.' });
    return;
  }

  if (platformSlug === 'mobile-legends') {
    const parsed = parseMobileLegendsId(accountIdRaw || `${accountGameId} (${accountServerId})`);
    if (!parsed) {
      sendJson(res, 422, { error: "Mobile Legends ID formatini 516874602 (6253) ko'rinishida kiriting." });
      return;
    }

    accountGameId = parsed.accountId;
    accountServerId = parsed.serverId;
    title = title || accountNickname || parsed.raw;
  }

  if (!title) {
    sendJson(res, 422, { error: 'Avval akkaunt nomi yoki ID kiriting.' });
    return;
  }

  if (!description) {
    sendJson(res, 422, { error: "Akkaunt haqida to'liq ma'lumot kiriting." });
    return;
  }

  if (!Number.isFinite(priceUz) || priceUz <= 0) {
    sendJson(res, 422, { error: "Narx kiritilmasa, akkaunt sotuvga qo'yilmaydi." });
    return;
  }

  const supabase = await getSupabase();
  if (!supabase) {
    const created = publicAccount({
      id: `local-${Date.now()}`,
      platform_slug: platformSlug,
      title,
      description,
      account_game_id: accountGameId || null,
      account_server_id: accountServerId || null,
      account_nickname: accountNickname || null,
      account_region: accountRegion || null,
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

  const insertPayload = {
    platform_slug: platformSlug,
    title,
    description,
    price_uzs: priceUz,
    status: 'available',
    seller_tg_id: user.id || null,
    seller_username: user.username || null,
    seller_name: sellerName || null,
    account_game_id: accountGameId || null,
    account_server_id: accountServerId || null,
    account_nickname: accountNickname || null,
    account_region: accountRegion || null,
    media
  };

  const baseInsertPayload = {
    platform_slug: insertPayload.platform_slug,
    title: insertPayload.title,
    description: [
      accountNickname || accountRegion
        ? `Nik: ${accountNickname || '-'}\nRegion: ${accountRegion || '-'}\nID: ${accountGameId || accountIdRaw || '-'}${accountServerId ? ` (${accountServerId})` : ''}\n`
        : '',
      description
    ]
      .filter(Boolean)
      .join('\n'),
    price_uzs: insertPayload.price_uzs,
    status: insertPayload.status,
    seller_tg_id: insertPayload.seller_tg_id,
    seller_username: insertPayload.seller_username,
    seller_name: insertPayload.seller_name,
    media: insertPayload.media
  };

  let { data, error } = await supabase
    .from('accounts')
    .insert(insertPayload)
    .select(ACCOUNT_SELECT_META)
    .single();

  if (error && isMissingColumnError(error)) {
    ({ data, error } = await supabase
      .from('accounts')
      .insert(baseInsertPayload)
      .select(ACCOUNT_SELECT_BASE)
      .single());
  }

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
