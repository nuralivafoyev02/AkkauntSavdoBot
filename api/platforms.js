import { allowMethods, getSupabase, publicAccount, readJson, requireAdmin, sendError, sendJson } from './_shared.js';
import { mockAccounts, mockPlatforms } from './_mock.js';

const PLATFORM_IMAGES = {
  'free-fire': '/assets/free-fire.png',
  'mobile-legends': '/assets/mobile-legends-5v5.png',
  'pubg-mobile': 'https://www.pubgmobile.com/common/images/icon_logo.jpg',
  steam: 'https://cdn.simpleicons.org/steam/ffffff',
  telegram: 'https://cdn.simpleicons.org/telegram/ffffff'
};

const VISIBLE_PLATFORMS = new Set(['free-fire', 'mobile-legends', 'pubg-mobile', 'steam', 'telegram']);
const DEFAULT_PLATFORM_ROWS = [
  {
    slug: 'telegram',
    title: 'Telegram',
    subtitle: 'NFT va username savdosi',
    accent_color: '#2aabee',
    sort_order: 50
  }
];

function attachCounts(platforms, accounts, options = {}) {
  const counts = accounts.reduce((acc, account) => {
    if (account.status === 'available') {
      acc[account.platform_slug] = (acc[account.platform_slug] || 0) + 1;
    }
    return acc;
  }, {});
  const platformMap = new Map((platforms || []).map((platform) => [platform.slug, platform]));

  for (const platform of DEFAULT_PLATFORM_ROWS) {
    const existing = platformMap.get(platform.slug);
    platformMap.set(
      platform.slug,
      existing
        ? {
            ...platform,
            ...existing,
            subtitle: platform.subtitle,
            accent_color: platform.accent_color
          }
        : {
            ...platform,
            is_active: true
          }
    );
  }

  return [...platformMap.values()]
    .filter((platform) => options.admin || (VISIBLE_PLATFORMS.has(platform.slug) && platform.is_active !== false))
    .map((platform) => ({
      ...platform,
      image_url: platform.image_url || PLATFORM_IMAGES[platform.slug] || '',
      is_active: platform.is_active !== false,
      count: counts[platform.slug] || 0
    }))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

function cleanSlug(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'PATCH'])) return;

  try {
    const supabase = await getSupabase();
    const url = new URL(req.url, 'http://localhost');
    const adminScope = url.searchParams.get('scope') === 'admin';

    if (req.method === 'PATCH') {
      const { supabase: adminSupabase } = await requireAdmin(req);
      if (!adminSupabase) {
        sendJson(res, 503, { error: 'Supabase sozlanmagan.' });
        return;
      }

      const body = await readJson(req);
      const slug = cleanSlug(body.slug);
      if (!slug) {
        sendJson(res, 422, { error: 'Platforma topilmadi.' });
        return;
      }

      const { data, error } = await adminSupabase
        .from('platforms')
        .update({ is_active: Boolean(body.isActive ?? body.is_active) })
        .eq('slug', slug)
        .select('slug,title,subtitle,accent_color,sort_order,is_active')
        .single();

      if (error) throw error;
      sendJson(res, 200, { platform: data });
      return;
    }

    if (adminScope) await requireAdmin(req);

    if (!supabase) {
      sendJson(res, 200, {
        demo: true,
        platforms: attachCounts(mockPlatforms, mockAccounts.map(publicAccount), { admin: adminScope })
      });
      return;
    }

    let platformQuery = supabase
      .from('platforms')
      .select('slug,title,subtitle,accent_color,sort_order,is_active')
      .order('sort_order', { ascending: true });

    if (!adminScope) platformQuery = platformQuery.eq('is_active', true);

    const { data: platforms, error: platformError } = await platformQuery;

    if (platformError) throw platformError;

    const { data: accounts, error: accountError } = await supabase
      .from('accounts')
      .select('platform_slug,status')
      .eq('status', 'available');

    if (accountError) throw accountError;

    sendJson(res, 200, {
      demo: false,
      platforms: attachCounts(platforms || [], accounts || [], { admin: adminScope })
    });
  } catch (error) {
    sendError(res, error);
  }
}
