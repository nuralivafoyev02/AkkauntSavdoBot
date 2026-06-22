import { allowMethods, getSupabase, publicAccount, sendError, sendJson } from './_shared.js';
import { mockAccounts, mockPlatforms } from './_mock.js';

const PLATFORM_IMAGES = {
  'free-fire': 'https://upload.wikimedia.org/wikipedia/en/thumb/3/38/Free_Fire_New_Logo.svg/250px-Free_Fire_New_Logo.svg.png',
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

function attachCounts(platforms, accounts) {
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
        : platform
    );
  }

  return [...platformMap.values()]
    .filter((platform) => VISIBLE_PLATFORMS.has(platform.slug))
    .map((platform) => ({
      ...platform,
      image_url: platform.image_url || PLATFORM_IMAGES[platform.slug] || '',
      count: counts[platform.slug] || 0
    }))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;

  try {
    const supabase = getSupabase();
    if (!supabase) {
      sendJson(res, 200, {
        demo: true,
        platforms: attachCounts(mockPlatforms, mockAccounts.map(publicAccount))
      });
      return;
    }

    const { data: platforms, error: platformError } = await supabase
      .from('platforms')
      .select('slug,title,subtitle,accent_color,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (platformError) throw platformError;

    const { data: accounts, error: accountError } = await supabase
      .from('accounts')
      .select('platform_slug,status')
      .eq('status', 'available');

    if (accountError) throw accountError;

    sendJson(res, 200, {
      demo: false,
      platforms: attachCounts(platforms || [], accounts || [])
    });
  } catch (error) {
    sendError(res, error);
  }
}
