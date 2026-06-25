import {
  getBaseUrl,
  getSupabase,
  isSuperAdminUser,
  normalizeUsername,
  readJson,
  requireSupabase,
  sendError,
  sendJson
} from './_shared.js';

const DEFAULT_ADMIN_USERNAME = 'Geto_senpai';
const DEFAULT_BOT_USERNAME = 'GetosenpaiShopBot';
const BROADCAST_PAGE_SIZE = 100;
const BROADCAST_SEND_DELAY_MS = 45;

function isMissingColumnError(error) {
  return error?.code === '42703' || /column .* does not exist/i.test(error?.message || '');
}

function isMissingRelationError(error) {
  return error?.code === '42P01' || /relation .* does not exist/i.test(error?.message || '');
}

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function isEnvAdmin(from) {
  if (isSuperAdminUser(from)) return true;

  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (adminId) return String(from?.id || '') === String(adminId);

  return normalizeUsername(from?.username) === normalizeUsername(process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME);
}

async function isAdmin(from) {
  if (isEnvAdmin(from)) return true;

  const supabase = await getSupabase();
  if (!supabase) return false;

  const username = normalizeUsername(from?.username);
  const checks = [];
  if (from?.id) checks.push(['tg_user_id', from.id]);
  if (username) checks.push(['username', username]);

  for (const [column, value] of checks) {
    const { data, error } = await supabase
      .from('app_admins')
      .select('id')
      .eq(column, value)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) return false;
      throw error;
    }

    if (data) return true;
  }

  return false;
}

function greetingPayload(chatId, req) {
  return {
    method: 'sendMessage',
    chat_id: chatId,
    text: [
      'Assalomu alaykum 👋',
      '',
      "Geto Senpai Shop mini do'koniga xush kelibsiz 😇",
      "Quyidagi tugma orqali akkauntlarni ko'rishingiz va o'zingiznikini sotuvga qo'yishingiz mumkin 💸"
    ].join('\n'),
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Do'konga marhamat 🛍",
            web_app: {
              url: getMiniAppUrl(req)
            }
          }
        ]
      ]
    }
  };
}

function runInBackground(task, label) {
  Promise.resolve()
    .then(task)
    .catch((error) => {
      console.error(`${label}:`, error?.message || error);
    });
}

async function saveBotUser(message) {
  if (message?.chat?.type !== 'private' || !message.from?.id) return;

  const supabase = await getSupabase();
  if (!supabase) return;

  const user = message.from;
  const payload = {
    tg_user_id: user.id,
    chat_id: message.chat.id,
    username: user.username || null,
    first_name: user.first_name || null,
    last_name: user.last_name || null,
    language_code: user.language_code || null,
    is_bot: Boolean(user.is_bot),
    is_active: true,
    last_seen_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('bot_users')
    .upsert(payload, {
      onConflict: 'tg_user_id'
    });

  if (error && !isMissingRelationError(error)) throw error;
}

function parseBroadcastCommand(text, message) {
  const match = String(text || '').match(/^\/message(?:@\w+)?(?:\s+([\s\S]+))?$/i);
  if (!match) return null;

  return (
    match[1] ||
    message.reply_to_message?.text ||
    message.reply_to_message?.caption ||
    ''
  ).trim();
}

async function markBotUserInactive(tgUserId) {
  const supabase = await requireSupabase();
  await supabase
    .from('bot_users')
    .update({
      is_active: false,
      last_error: 'blocked_or_unreachable',
      last_error_at: new Date().toISOString()
    })
    .eq('tg_user_id', tgUserId);
}

async function broadcastToUsers(text) {
  const supabase = await requireSupabase();
  let sent = 0;
  let failed = 0;
  let offset = 0;

  while (true) {
    const { data: users, error } = await supabase
      .from('bot_users')
      .select('tg_user_id,chat_id')
      .eq('is_active', true)
      .order('last_seen_at', { ascending: false })
      .range(offset, offset + BROADCAST_PAGE_SIZE - 1);

    if (error) throw error;
    if (!users?.length) break;

    for (const user of users) {
      try {
        await telegram('sendMessage', {
          chat_id: user.chat_id,
          text,
          disable_web_page_preview: true
        });
        sent += 1;
      } catch (error) {
        failed += 1;
        if ([400, 403].includes(error.statusCode)) {
          await markBotUserInactive(user.tg_user_id);
        }
      }

      await sleep(BROADCAST_SEND_DELAY_MS);
    }

    if (users.length < BROADCAST_PAGE_SIZE) break;
    offset += BROADCAST_PAGE_SIZE;
  }

  return { sent, failed };
}

async function markSoldByTitle(title) {
  const supabase = await requireSupabase();
  const normalizedTitle = title.trim();
  const accountIdMatch = normalizedTitle.match(/\d{5,}/);

  const exact = await supabase
    .from('accounts')
    .select('id,title')
    .eq('title', normalizedTitle)
    .eq('status', 'available')
    .limit(20);

  if (exact.error) throw exact.error;

  let matches = exact.data || [];

  if (!matches.length && accountIdMatch) {
    const byGameId = await supabase
      .from('accounts')
      .select('id,title')
      .eq('account_game_id', accountIdMatch[0])
      .eq('status', 'available')
      .limit(20);

    if (byGameId.error && !isMissingColumnError(byGameId.error)) throw byGameId.error;
    matches = byGameId.data || [];
  }

  if (!matches.length) {
    const fuzzy = await supabase
      .from('accounts')
      .select('id,title')
      .ilike('title', `%${normalizedTitle}%`)
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

async function handleMessage(message, req, backgroundTasks = []) {
  if (!message?.chat?.id) return;

  const chatId = message.chat.id;
  const chatType = message.chat.type;
  const text = String(message.text || '').trim();
  const soldMatch = text.match(/^(.{2,160})\s+sotildi$/i);
  const broadcastText = parseBroadcastCommand(text, message);

  if (chatType === 'private') {
    backgroundTasks.push({
      label: 'saveBotUser',
      task: () => saveBotUser(message)
    });

    if (text === '/start') {
      return greetingPayload(chatId, req);
    }
  }

  const senderIsAdmin = await isAdmin(message.from);

  if (broadcastText !== null && senderIsAdmin) {
    if (!broadcastText) {
      await telegram('sendMessage', {
        chat_id: chatId,
        text: "Xabar matnini ham yozing: /message Assalomu alaykum"
      });
      return;
    }

    await telegram('sendMessage', {
      chat_id: chatId,
      text: 'Yuborish boshlandi...'
    });

    let result;
    try {
      result = await broadcastToUsers(broadcastText);
    } catch (error) {
      if (isMissingRelationError(error)) {
        await telegram('sendMessage', {
          chat_id: chatId,
          text: 'Broadcast jadvali topilmadi. Avval supabase/003_bot_users_broadcast.sql migratsiyasini ishga tushiring.'
        });
        return;
      }
      throw error;
    }

    await telegram('sendMessage', {
      chat_id: chatId,
      text: `Broadcast tugadi. Yuborildi: ${result.sent}. Xato: ${result.failed}.`
    });
    return;
  }

  if (soldMatch && senderIsAdmin) {
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

  return greetingPayload(chatId, req);
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
    const backgroundTasks = [];
    let webhookReply = null;

    if (message) {
      webhookReply = await handleMessage(message, req, backgroundTasks);
    }

    sendJson(res, 200, webhookReply || { ok: true });
    for (const { task, label } of backgroundTasks) {
      runInBackground(task, label);
    }
  } catch (error) {
    sendError(res, error);
  }
}
