import {
  allowMethods,
  getBaseUrl,
  getSupabase,
  readJson,
  requireTelegramUser,
  sendError,
  sendJson
} from './_shared.js';
import { mockAccounts } from './_mock.js';

async function readAccountId(req) {
  if (req.method === 'GET') {
    const url = new URL(req.url, getBaseUrl(req));
    return String(url.searchParams.get('id') || '').trim();
  }

  const body = await readJson(req);
  return String(body.id || body.accountId || '').trim();
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  try {
    requireTelegramUser(req);
    const id = await readAccountId(req);
    if (!id) {
      sendJson(res, 422, { error: 'E\'lon ID topilmadi.' });
      return;
    }

    const supabase = await getSupabase();
    let account = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('accounts')
        .select('id,title,platform_slug,status,seller_username')
        .eq('id', id)
        .eq('status', 'available')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      account = data;
    } else {
      account = mockAccounts.find((item) => item.id === id && item.status === 'available') || null;
    }

    if (!account?.seller_username) {
      sendJson(res, 404, { error: 'Sotuvchi username topilmadi.' });
      return;
    }

    sendJson(res, 200, {
      username: account.seller_username,
      title: account.title
    });
  } catch (error) {
    sendError(res, error);
  }
}
