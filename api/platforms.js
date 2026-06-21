import { allowMethods, getSupabase, publicAccount, sendError, sendJson } from './_shared.js';
import { mockAccounts, mockPlatforms } from './_mock.js';

function attachCounts(platforms, accounts) {
  const counts = accounts.reduce((acc, account) => {
    if (account.status === 'available') {
      acc[account.platform_slug] = (acc[account.platform_slug] || 0) + 1;
    }
    return acc;
  }, {});

  return platforms
    .map((platform) => ({
      ...platform,
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
