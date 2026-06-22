export const DEFAULT_APP_SETTINGS = {
  telegramGroupUrl: process.env.TELEGRAM_GROUP_URL || '',
  sellingEnabled: true,
  telegramListingsEnabled: true,
  friendsEnabled: false,
  notificationsEnabled: false
};

const SETTINGS_KEYS = Object.keys(DEFAULT_APP_SETTINGS);

function isMissingSettingsTable(error) {
  return error?.code === '42P01' || /relation .*app_settings.* does not exist/i.test(error?.message || '');
}

export function cleanAppSettings(input = {}) {
  const next = {};

  if (Object.prototype.hasOwnProperty.call(input, 'telegramGroupUrl')) {
    next.telegramGroupUrl = String(input.telegramGroupUrl || '').trim().slice(0, 240);
  }

  for (const key of ['sellingEnabled', 'telegramListingsEnabled', 'friendsEnabled', 'notificationsEnabled']) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      next[key] = Boolean(input[key]);
    }
  }

  return next;
}

export async function getAppSettings(supabase) {
  const settings = { ...DEFAULT_APP_SETTINGS };
  if (!supabase) return settings;

  const { data, error } = await supabase
    .from('app_settings')
    .select('key,value')
    .in('key', SETTINGS_KEYS);

  if (error) {
    if (isMissingSettingsTable(error)) return settings;
    throw error;
  }

  for (const row of data || []) {
    if (SETTINGS_KEYS.includes(row.key)) settings[row.key] = row.value;
  }

  return settings;
}

export async function saveAppSettings(supabase, input, user) {
  const cleaned = cleanAppSettings(input);
  const rows = Object.entries(cleaned).map(([key, value]) => ({
    key,
    value,
    updated_by_tg_id: user?.id || null
  }));

  if (!rows.length) return getAppSettings(supabase);

  const { error } = await supabase
    .from('app_settings')
    .upsert(rows, { onConflict: 'key' });

  if (error) throw error;
  return getAppSettings(supabase);
}
