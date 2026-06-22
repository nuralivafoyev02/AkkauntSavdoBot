import {
  allowMethods,
  getBaseUrl,
  getSupabase,
  parsePriceUz,
  publicAccount,
  readJson,
  requireAdmin,
  requireTelegramUser,
  resolveAdminRole,
  sendError,
  sendJson
} from './_shared.js';
import { mockAccounts } from './_mock.js';
import { parseMobileLegendsId } from './account-lookup.js';

const MAX_MEDIA_ITEMS = 10;
const LISTING_TYPES = new Set(['nft', 'username']);
const ACCOUNT_SELECT_BASE = 'id,platform_slug,title,description,price_uzs,status,is_top,media,created_at,sold_at,seller_tg_id,seller_username,seller_name';
const ACCOUNT_SELECT_META = `${ACCOUNT_SELECT_BASE},account_game_id,account_server_id,account_nickname,account_region,listing_type`;

function cleanText(value, maxLength) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function cleanDescription(value) {
  return String(value || '').trim().replace(/\r\n/g, '\n').slice(0, 3000);
}

function isMissingColumnError(error) {
  return error?.code === '42703' || /column .* does not exist/i.test(error?.message || '');
}

function normalizeListingType(value) {
  const type = String(value || '').trim().toLowerCase();
  return LISTING_TYPES.has(type) ? type : '';
}

function cleanTelegramLink(value, listingType) {
  const raw = cleanText(value, 220);
  if (!raw) return '';

  if (listingType === 'username') {
    const username = raw
      .replace(/^https?:\/\/t\.me\//i, '')
      .replace(/^t\.me\//i, '')
      .replace(/^@/, '')
      .replace(/[/?#].*$/, '')
      .trim();
    return username ? `@${username}` : '';
  }

  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^t\.me\//i.test(raw)) return `https://${raw}`;
  return raw;
}

function listingDescription(listingType, link) {
  const label = listingType === 'username' ? 'Telegram username' : 'Telegram NFT';
  return `@@listing_type:${listingType}@@\n${label}: ${link}`;
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

async function isPlatformActive(supabase, slug) {
  if (!supabase || !slug) return true;

  const { data, error } = await supabase
    .from('platforms')
    .select('is_active')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data?.is_active !== false;
}

async function listAccounts(req, res) {
  const url = new URL(req.url, getBaseUrl(req));
  const platform = url.searchParams.get('platform');
  const id = url.searchParams.get('id');
  const statusParam = url.searchParams.get('status');
  const status = ['available', 'sold', 'all'].includes(statusParam) ? statusParam : 'available';
  const scope = ['mine', 'admin'].includes(url.searchParams.get('scope')) ? url.searchParams.get('scope') : '';
  const listingType = normalizeListingType(url.searchParams.get('listingType') || url.searchParams.get('listing_type'));
  const supabase = await getSupabase();
  let viewer = null;
  let role = { isAdmin: false, isSuperAdmin: false, role: 'user' };

  if (scope === 'mine') {
    viewer = requireTelegramUser(req);
  } else if (scope === 'admin') {
    ({ user: viewer, role } = await requireAdmin(req));
  } else {
    try {
      viewer = requireTelegramUser(req);
      role = await resolveAdminRole(viewer, supabase);
    } catch {
      viewer = null;
    }
  }

  const includeSeller = role.isAdmin;
  const canSeeInactivePlatform = role.isAdmin || scope === 'admin';

  if (!supabase) {
    let rawAccounts = [...mockAccounts];
    if (platform) rawAccounts = rawAccounts.filter((account) => account.platform_slug === platform);
    if (id) rawAccounts = rawAccounts.filter((account) => account.id === id);
    if (status !== 'all') rawAccounts = rawAccounts.filter((account) => account.status === status);
    if (scope === 'mine') {
      rawAccounts = rawAccounts.filter((account) => {
        const username = String(account.seller_username || '').replace(/^@/, '').toLowerCase();
        return Number(account.seller_tg_id ?? -1) === Number(viewer?.id ?? -2) || username === String(viewer?.username || '').toLowerCase();
      });
    }
    let accounts = rawAccounts.map((account) => publicAccount(account, { includeSeller }));
    if (listingType) accounts = accounts.filter((account) => account.listing_type === listingType);

    sendJson(res, 200, {
      demo: true,
      accounts
    });
    return;
  }

  if (platform && !canSeeInactivePlatform && !(await isPlatformActive(supabase, platform))) {
    sendJson(res, 200, {
      demo: false,
      accounts: []
    });
    return;
  }

  function buildQuery(select) {
    let query = supabase
      .from('accounts')
      .select(select)
      .order('is_top', { ascending: false })
      .order('created_at', { ascending: false });

    if (status !== 'all') query = query.eq('status', status);
    if (platform) query = query.eq('platform_slug', platform);
    if (id) query = query.eq('id', id);
    if (listingType) query = query.eq('listing_type', listingType);
    if (scope === 'mine' && viewer?.id) query = query.eq('seller_tg_id', viewer.id);
    return query;
  }

  let { data, error } = await buildQuery(ACCOUNT_SELECT_META);
  if (error && isMissingColumnError(error)) {
    function buildCompatQuery(select) {
      let query = supabase
        .from('accounts')
        .select(select)
        .order('is_top', { ascending: false })
        .order('created_at', { ascending: false });

      if (status !== 'all') query = query.eq('status', status);
      if (platform) query = query.eq('platform_slug', platform);
      if (id) query = query.eq('id', id);
      if (scope === 'mine' && viewer?.id) query = query.eq('seller_tg_id', viewer.id);
      return query;
    }

    ({ data, error } = await buildCompatQuery(ACCOUNT_SELECT_BASE));
  }

  if (error) throw error;

  let accounts = (data || []).map((account) => publicAccount(account, { includeSeller }));
  if (listingType) accounts = accounts.filter((account) => account.listing_type === listingType);

  sendJson(res, 200, {
    demo: false,
    accounts
  });
}

async function createAccount(req, res) {
  const user = requireTelegramUser(req);
  const body = await readJson(req);

  const platformSlug = cleanText(body.platformSlug || body.platform_slug, 80);
  const listingType = normalizeListingType(body.listingType || body.listing_type);
  const listingLink = cleanTelegramLink(body.listingLink || body.listing_link || body.accountIdRaw || body.account_id_raw, listingType);
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

  if (platformSlug === 'telegram') {
    if (!listingType) {
      sendJson(res, 422, { error: 'Telegram bo\'limini tanlang.' });
      return;
    }

    if (!listingLink) {
      sendJson(res, 422, { error: listingType === 'username' ? 'Username kiriting.' : 'NFT linkini kiriting.' });
      return;
    }

    if (!user.username) {
      sendJson(res, 422, { error: 'Sotuvchi profili ochilishi uchun Telegram username yoqilgan bo\'lishi kerak.' });
      return;
    }

    title = listingLink;
    accountNickname = listingType === 'username' ? listingLink : '';
    accountRegion = listingType === 'nft' ? 'NFT' : 'Username';
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

  if (platformSlug !== 'telegram' && !description) {
    sendJson(res, 422, { error: "Akkaunt haqida to'liq ma'lumot kiriting." });
    return;
  }

  if (!Number.isFinite(priceUz) || priceUz <= 0) {
    sendJson(res, 422, { error: "Narx kiritilmasa, akkaunt sotuvga qo'yilmaydi." });
    return;
  }

  const supabase = await getSupabase();
  const creatorRole = await resolveAdminRole(user, supabase);
  const includeSellerForCreator = creatorRole.isAdmin;
  if (!supabase) {
    const created = publicAccount({
      id: `local-${Date.now()}`,
      platform_slug: platformSlug,
      title,
      description: platformSlug === 'telegram' ? listingDescription(listingType, listingLink) : description,
      listing_type: platformSlug === 'telegram' ? listingType : null,
      account_game_id: accountGameId || null,
      account_server_id: accountServerId || null,
      account_nickname: accountNickname || null,
      account_region: accountRegion || null,
      seller_username: user.username || null,
      seller_name: [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || null,
      price_uzs: priceUz,
      status: 'available',
      is_top: false,
      media,
      created_at: new Date().toISOString()
    }, { includeSeller: includeSellerForCreator });

    sendJson(res, 201, {
      demo: true,
      account: created
    });
    return;
  }

  if (!(await isPlatformActive(supabase, platformSlug))) {
    sendJson(res, 422, { error: 'Bu platforma hozircha yopilgan.' });
    return;
  }

  const sellerName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();

  const insertPayload = {
    platform_slug: platformSlug,
    title,
    description: platformSlug === 'telegram' ? listingDescription(listingType, listingLink) : description,
    price_uzs: priceUz,
    status: 'available',
    seller_tg_id: user.id || null,
    seller_username: user.username || null,
    seller_name: sellerName || null,
    account_game_id: accountGameId || null,
    account_server_id: accountServerId || null,
    account_nickname: accountNickname || null,
    account_region: accountRegion || null,
    listing_type: platformSlug === 'telegram' ? listingType : null,
    media
  };

  const baseInsertPayload = {
    platform_slug: insertPayload.platform_slug,
    title: insertPayload.title,
    description: platformSlug === 'telegram'
      ? listingDescription(listingType, listingLink)
      : [
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
    account: publicAccount(data, { includeSeller: includeSellerForCreator })
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
