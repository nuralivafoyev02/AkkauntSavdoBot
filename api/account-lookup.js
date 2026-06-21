import { allowMethods, getBaseUrl, sendError, sendJson } from './_shared.js';

const LOOKUP_TIMEOUT_MS = 8000;

export function parseMobileLegendsId(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/(\d{5,})\D+(\d{2,6})/);
  if (!match) return null;

  return {
    accountId: match[1],
    serverId: match[2],
    raw: `${match[1]} (${match[2]})`
  };
}

async function lookupMobileLegends(rawId) {
  const parsed = parseMobileLegendsId(rawId);
  if (!parsed) {
    const error = new Error("Mobile Legends ID formatini 516874602 (6253) ko'rinishida kiriting.");
    error.statusCode = 422;
    throw error;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

  try {
    const url = new URL('https://api.isan.eu.org/nickname/mlbb');
    url.searchParams.set('id', parsed.accountId);
    url.searchParams.set('zone', parsed.serverId);

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false || !payload.name) {
      const error = new Error(payload.message || "Akkaunt ID tekshirilmadi. ID va serverni qayta ko'ring.");
      error.statusCode = 422;
      throw error;
    }

    return {
      platformSlug: 'mobile-legends',
      accountId: parsed.accountId,
      serverId: parsed.serverId,
      raw: parsed.raw,
      nickname: String(payload.name || '').trim(),
      region: String(payload.country || '').trim() || "Noma'lum",
      source: 'isan'
    };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;

  try {
    const url = new URL(req.url, getBaseUrl(req));
    const platform = url.searchParams.get('platform') || 'mobile-legends';
    const accountId = url.searchParams.get('accountId') || '';

    if (platform !== 'mobile-legends') {
      sendJson(res, 200, {
        platformSlug: platform,
        raw: accountId.trim(),
        accountId: accountId.trim(),
        serverId: null,
        nickname: '',
        region: ''
      });
      return;
    }

    const result = await lookupMobileLegends(accountId);
    sendJson(res, 200, result);
  } catch (error) {
    if (error?.name === 'AbortError') {
      error = new Error("Lookup servisi sekin javob berdi. Keyinroq qayta urinib ko'ring.");
      error.statusCode = 504;
    }
    sendError(res, error, error?.statusCode || 500);
  }
}
