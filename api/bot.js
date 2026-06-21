import {
  getBaseUrl,
  getSupabase,
  normalizeUsername,
  readJson,
  requireSupabase,
  sendError,
  sendJson
} from './_shared.js';

const DEFAULT_ADMIN_USERNAME = 'Geto_senpai';
const DEFAULT_BOT_USERNAME = 'GetosenpaiShopBot';

function telegramApiUrl(method) {
  return `https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`;
}

async function telegram(method, payload) {
  if (!process.env.BOT_TOKEN) {
    const error = new Error('BOT_TOKEN sozlanmagan.');
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(telegramApiUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const error = new Error(data.description || 'Telegram API xatoligi.');
    error.statusCode = response.status;
    throw error;
  }

  return data.result;
}

function isWebhookAllowed(req) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return true;

  const headerSecret = req.headers['x-telegram-bot-api-secret-token'];
  const url = new URL(req.url, getBaseUrl(req));
  return headerSecret === secret || url.searchParams.get('secret') === secret;
}

function getMiniAppUrl(req) {
  return (process.env.WEBAPP_URL || getBaseUrl(req)).replace(/\/$/, '');
}

function isAdmin(from) {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (adminId) return String(from?.id || '') === String(adminId);

  return normalizeUsername(from?.username) === normalizeUsername(process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME);
}

function greetingPayload(chatId, req) {
  return {
    chat_id: chatId,
    text: [
      'Assalomu alaykum!',
      '',
      "Geto Senpai Shop mini do'koniga xush kelibsiz.",
      "Quyidagi tugma orqali akkauntlarni ko'rishingiz va o'zingiznikini sotuvga qo'yishingiz mumkin."
    ].join('\n'),
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Do'konga marhamat",
            web_app: {
              url: getMiniAppUrl(req)
            }
          }
        ]
      ]
    }
  };
}

async function markSoldByTitle(title) {
  const supabase = requireSupabase();
  const normalizedTitle = title.trim();

  const exact = await supabase
    .from('accounts')
    .select('id,title')
    .eq('title', normalizedTitle)
    .eq('status', 'available')
    .limit(20);

  if (exact.error) throw exact.error;

  let matches = exact.data || [];

  if (!matches.length) {
    const fuzzy = await supabase
      .from('accounts')
      .select('id,title')
      .ilike('title', normalizedTitle)
      .eq('status', 'available')
      .limit(20);

    if (fuzzy.error) throw fuzzy.error;
    matches = fuzzy.data || [];
  }

  if (!matches.length) return [];

  const ids = matches.map((item) => item.id);
  const { data, error } = await supabase
    .from('accounts')
    .update({
      status: 'sold',
      sold_at: new Date().toISOString()
    })
    .in('id', ids)
    .select('id,title');

  if (error) throw error;
  return data || [];
}

async function handleMessage(message, req) {
  if (!message?.chat?.id) return;

  const chatId = message.chat.id;
  const chatType = message.chat.type;
  const text = String(message.text || '').trim();
  const soldMatch = text.match(/^(.{2,160})\s+sotildi$/i);

  if (soldMatch && isAdmin(message.from)) {
    const title = soldMatch[1].trim();
    const sold = await markSoldByTitle(title);
    await telegram('sendMessage', {
      chat_id: chatId,
      text: sold.length
        ? `${sold.map((item) => item.title).join(', ')} sotildi deb belgilandi.`
        : `${title} topilmadi yoki allaqachon sotilgan.`,
      disable_web_page_preview: true
    });
    return;
  }

  if (chatType !== 'private') return;

  await telegram('sendMessage', greetingPayload(chatId, req));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 200, { ok: true, message: 'Telegram webhook endpoint' });
    return;
  }

  try {
    if (!isWebhookAllowed(req)) {
      sendJson(res, 401, { ok: false });
      return;
    }

    const update = await readJson(req);
    const message = update.message || update.edited_message;

    if (message) {
      await handleMessage(message, req);
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendError(res, error);
  }
}
