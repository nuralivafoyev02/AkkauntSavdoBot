import './styles.css';

const app = document.querySelector('#app');
const tg = window.Telegram?.WebApp;

const state = {
  tab: 'home',
  route: 'platforms',
  loading: true,
  error: '',
  demo: false,
  me: null,
  platforms: [],
  accounts: [],
  history: {
    loading: false,
    error: '',
    filter: 'all',
    accounts: []
  },
  admins: {
    loading: false,
    error: '',
    items: []
  },
  adminPlatforms: {
    loading: false,
    error: '',
    items: []
  },
  profileEditorOpen: false,
  profileAvatarDraft: '',
  telegramListings: {
    nft: [],
    username: []
  },
  telegramLoading: false,
  telegramError: '',
  telegramFormOpen: false,
  telegramImage: null,
  accountsRequestId: 0,
  accountStatus: 'available',
  telegramSection: 'nft',
  selectedPlatform: null,
  selectedAccount: null,
  saleDraft: {
    platformSlug: 'mobile-legends',
    lookup: null
  },
  pendingFiles: [],
  lightbox: null,
  config: {
    adminUsername: 'Geto_senpai',
    botUsername: 'GetosenpaiShopBot',
    telegramGroupUrl: '',
    sellingEnabled: true,
    telegramListingsEnabled: true,
    friendsEnabled: false,
    notificationsEnabled: false,
    maxImageBytes: 8 * 1024 * 1024,
    maxVideoBytes: 80 * 1024 * 1024
  }
};

const objectUrls = new Set();
const SERVICE_PLATFORM_SLUGS = new Set(['telegram']);
const ACCOUNT_STATUSES = new Set(['available', 'sold']);
const TELEGRAM_SECTIONS = {
  nft: {
    title: 'NFT',
    label: 'NFT',
    headline: 'Telegram NFT',
    linkLabel: 'NFT linki',
    placeholder: 'https://t.me/nft/...',
    empty: "Sotuvda NFT yo'q",
    copy: "Telegram NFT sovg'alari",
    accent: '#2aabee'
  },
  username: {
    title: 'Username',
    label: 'Username',
    headline: 'Telegram username',
    linkLabel: 'Username',
    placeholder: '@username yoki t.me/username',
    empty: "Sotuvda username yo'q",
    copy: 'Telegram username',
    accent: '#28a86b'
  }
};

const BI_ICONS = {
  'arrow-down-right': '<path fill-rule="evenodd" d="M14 13.5a.5.5 0 0 1-.5.5h-6a.5.5 0 0 1 0-1h4.793L2.146 2.854a.5.5 0 1 1 .708-.708L13 12.293V7.5a.5.5 0 0 1 1 0z"/>',
  'arrow-up-right': '<path fill-rule="evenodd" d="M14 2.5a.5.5 0 0 0-.5-.5h-6a.5.5 0 0 0 0 1h4.793L2.146 13.146a.5.5 0 0 0 .708.708L13 3.707V8.5a.5.5 0 0 0 1 0z"/>',
  bell: '<path d="M8 16a2 2 0 0 0 1.985-1.75h-3.97A2 2 0 0 0 8 16"/><path d="M8 1.918 7.797 2A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.797-4zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6a5 5 0 0 1 10 0c0 .88.32 4.2 1.22 6"/>',
  cash: '<path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/><path d="M0 4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1zm3 0a2 2 0 0 1-2 2v4a2 2 0 0 1 2 2h10a2 2 0 0 1 2-2V6a2 2 0 0 1-2-2z"/>',
  'chevron-right': '<path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>',
  clock: '<path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>',
  'currency-dollar': '<path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73z"/>',
  download: '<path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5A1.1 1.1 0 0 0 2.1 14h11.8a1.1 1.1 0 0 0 1.1-1.1v-2.5a.5.5 0 0 1 1 0v2.5A2.1 2.1 0 0 1 13.9 15H2.1A2.1 2.1 0 0 1 0 12.9v-2.5a.5.5 0 0 1 .5-.5"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/>',
  'folder2-open': '<path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v.64c.57.265.94.876.856 1.546l-.64 5.124A2.5 2.5 0 0 1 12.734 15H3.266a2.5 2.5 0 0 1-2.481-2.19L.145 7.686A1.5 1.5 0 0 1 1 6.14zm1.5-.5a.5.5 0 0 0-.5.5V6h11.5a.5.5 0 0 0 .5-.5.5.5 0 0 0-.5-.5H9c-.964 0-1.71-.629-2.174-1.154C6.374 3.334 5.82 3 5.264 3zM1.138 7.562l.64 5.124A1.5 1.5 0 0 0 3.266 14h9.468a1.5 1.5 0 0 0 1.488-1.314l.64-5.124A.5.5 0 0 0 14.367 7H1.633a.5.5 0 0 0-.495.562"/>',
  gear: '<path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.858 2.929 2.929 0 0 1 0 5.858"/>',
  gem: '<path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974a.5.5 0 0 1-.01.614l-7.5 10a.5.5 0 0 1-.8 0l-7.5-10a.5.5 0 0 1-.01-.614zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.989zM5.47 5.489 8 13.366l2.532-7.877zm-1.371-.999-.78-2.415-1.806 2.414zM1.499 5.49l4.772 6.362-2.04-6.362zm8.23 6.362L14.5 5.49h-2.731z"/>',
  grid: '<path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5z"/>',
  people: '<path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1zm-7.978-1L7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.632 9.282 10 11 10c1.717 0 2.687.632 3.24 1.276.593.69.758 1.456.76 1.72l-.008.004z"/><path d="M11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6.936 9.28a6 6 0 0 0-1.23-.247A7 7 0 0 0 5 9c-4 0-5 3-5 4q0 1 1 1h4.216A2.24 2.24 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816M4.92 10A5.5 5.5 0 0 0 4 13H1c.001-.246.154-.986.832-1.664C2.484 10.68 3.711 10 5 10zM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0m3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4"/>',
  person: '<path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>',
  'plus-lg': '<path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2"/>',
  send: '<path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995-4.995-3.178a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11zM6.636 10.07l2.761 4.338L14.13 2.576zm6.787-8.201L1.591 6.602l4.339 2.76z"/>',
  'star-fill': '<path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187z"/>',
  'three-dots': '<path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3"/>',
  'x-lg': '<path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>',
  'arrow-left': '<path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/>',
  'arrow-repeat': `<svg class="bi-icon" viewBox="0 0 16 16">
  <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.418A6 6 0 1 1 8 2v1z"/>
  <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
</svg>`
};

function biIcon(name) {
  return `<svg class="bi-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${BI_ICONS[name] || BI_ICONS.grid}</svg>`;
}

function isServicePlatform(slug) {
  return SERVICE_PLATFORM_SLUGS.has(slug);
}

function cancelAccountLoads() {
  state.accountsRequestId += 1;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatPrice(value) {
  return `${formatNumberInput(value)} so'm`;
}

function formatNumberInput(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function initials(title) {
  return String(title || 'A')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function sizeLabel(bytes) {
  if (!bytes) return '0 MB';
  return `${(bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function uid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function optimizedImageUrl(url, width = 640, quality = 72) {
  if (!url) return '';

  try {
    const parsed = new URL(url, window.location.origin);
    if (!parsed.pathname.includes('/storage/v1/object/public/')) return url;

    parsed.pathname = parsed.pathname.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    parsed.searchParams.set('width', String(width));
    parsed.searchParams.set('quality', String(quality));
    parsed.searchParams.set('resize', 'cover');
    return parsed.toString();
  } catch {
    return url;
  }
}

function setTelegramChrome() {
  if (!tg) return;

  tg.ready();
  tg.expand();
  tg.enableClosingConfirmation?.();

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  tg.setHeaderColor?.(isDark ? '#101114' : '#f7f7f2');
  tg.setBackgroundColor?.(isDark ? '#101114' : '#f7f7f2');
  tg.setBottomBarColor?.(isDark ? '#141518' : '#ffffff');
}

function withRenderTransition(callback) {
  if (document.startViewTransition) {
    document.startViewTransition(callback);
    return;
  }
  callback();
}

async function api(path, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (tg?.initData) {
    headers['X-Telegram-Init-Data'] = tg.initData;
  }

  const response = await fetch(path, {
    ...options,
    headers,
    body:
      options.body && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Server bilan aloqa uzildi.');
  }

  return payload;
}

async function loadConfig() {
  try {
    const config = await api('/api/config');
    state.config = { ...state.config, ...config };
  } catch {
    state.config = { ...state.config };
  }
}

function isAdmin() {
  return Boolean(state.me?.role?.isAdmin);
}

function isSuperAdmin() {
  return Boolean(state.me?.role?.isSuperAdmin);
}

async function loadMe() {
  try {
    state.me = await api('/api/me');
  } catch {
    state.me = {
      user: {
        id: null,
        username: '',
        display_name: 'Foydalanuvchi',
        photo_url: ''
      },
      role: {
        isAdmin: false,
        isSuperAdmin: false,
        role: 'user'
      }
    };
  }
}

async function loadPlatforms() {
  state.loading = true;
  state.error = '';
  render();

  try {
    const payload = await api('/api/platforms');
    state.platforms = payload.platforms || [];
    state.demo = Boolean(payload.demo);
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
}

async function loadAccounts(platformSlug, status = state.accountStatus) {
  const nextStatus = ACCOUNT_STATUSES.has(status) ? status : 'available';
  const requestId = state.accountsRequestId + 1;
  state.accountsRequestId = requestId;
  state.loading = true;
  state.error = '';
  state.accounts = [];
  state.accountStatus = nextStatus;
  render();

  try {
    const params = new URLSearchParams({
      platform: platformSlug,
      status: nextStatus
    });
    const payload = await api(`/api/accounts?${params.toString()}`);
    if (requestId !== state.accountsRequestId) return;
    state.accounts = payload.accounts || [];
    state.demo = Boolean(payload.demo);
  } catch (error) {
    if (requestId !== state.accountsRequestId) return;
    state.error = error.message;
  } finally {
    if (requestId === state.accountsRequestId) {
      state.loading = false;
      render();
    }
  }
}

async function loadTelegramListings(section = state.telegramSection) {
  const listingType = TELEGRAM_SECTIONS[section] ? section : 'nft';
  state.telegramLoading = true;
  state.telegramError = '';
  render();

  try {
    const params = new URLSearchParams({
      platform: 'telegram',
      status: 'available',
      listingType
    });
    const payload = await api(`/api/accounts?${params.toString()}`);
    state.telegramListings = {
      ...state.telegramListings,
      [listingType]: payload.accounts || []
    };
    state.demo = Boolean(payload.demo);
  } catch (error) {
    state.telegramError = error.message;
  } finally {
    state.telegramLoading = false;
    render();
  }
}

async function loadHistory() {
  state.history.loading = true;
  state.history.error = '';
  render();

  try {
    const params = new URLSearchParams({
      scope: isAdmin() ? 'admin' : 'mine',
      status: 'all'
    });
    const payload = await api(`/api/accounts?${params.toString()}`);
    state.history.accounts = payload.accounts || [];
    state.demo = Boolean(payload.demo);
  } catch (error) {
    state.history.error = error.message;
  } finally {
    state.history.loading = false;
    render();
  }
}

async function loadAdmins() {
  if (!isSuperAdmin()) return;
  state.admins.loading = true;
  state.admins.error = '';
  render();

  try {
    const payload = await api('/api/admins');
    state.admins.items = payload.admins || [];
  } catch (error) {
    state.admins.error = error.message;
  } finally {
    state.admins.loading = false;
    render();
  }
}

async function loadAdminPlatforms() {
  if (!isAdmin()) return;
  state.adminPlatforms.loading = true;
  state.adminPlatforms.error = '';
  render();

  try {
    const payload = await api('/api/platforms?scope=admin');
    state.adminPlatforms.items = payload.platforms || [];
  } catch (error) {
    state.adminPlatforms.error = error.message;
  } finally {
    state.adminPlatforms.loading = false;
    render();
  }
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.append(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.remove();
  }, 2800);
}

function headerTitle() {
  if (state.route === 'sell') return 'Akkaunt sotish';
  if (state.route === 'history') return 'Tarix';
  if (state.route === 'profile') return 'Profil';
  if (state.route === 'platform-admin') return 'Platformalar';
  if (state.route === 'admin') return 'Admin panel';
  if (state.route === 'detail') return state.selectedAccount?.title || 'Akkaunt';
  if (state.route === 'telegram') return state.selectedPlatform?.title || 'Telegram';
  if (state.route === 'accounts') return state.selectedPlatform?.title || 'Akkauntlar';
  return 'Bosh menu';
}

function renderHeader() {
  const canGoBack = state.route === 'accounts' || state.route === 'detail' || state.route === 'telegram' || state.route === 'admin' || state.route === 'platform-admin';
  const subtitle =
    state.route === 'platforms'
      ? 'Barcha platformalar'
      : state.route === 'sell'
        ? 'Sotuvchi paneli'
        : state.route === 'history'
          ? isAdmin() ? 'Barcha userlar amallari' : 'Sizning e\'lonlaringiz'
          : state.route === 'profile'
            ? 'Shaxsiy profil'
            : state.route === 'platform-admin'
              ? 'Global platforma statuslari'
            : state.route === 'admin'
              ? isSuperAdmin() ? 'Adminlarni boshqarish' : 'Yopiq bo\'lim'
        : state.route === 'detail'
          ? 'Akkaunt tafsiloti'
          : state.route === 'telegram'
            ? 'Telegram savdosi'
            : state.accountStatus === 'sold'
              ? 'Sotilgan akkauntlar'
              : 'Sotuvdagi akkauntlar';

  return `
    <header class="topbar" data-route="${escapeHtml(state.route)}">
      <button class="icon-button ${canGoBack ? '' : 'is-hidden'}" type="button" data-action="back" aria-label="Orqaga">
        <span aria-hidden="true">${biIcon('arrow-left')}</span>
      </button>
      <div class="app-chip">
        <span aria-hidden="true">${biIcon('cash')}</span>
        <strong>Geto Savdo</strong>
      </div>
      <button class="icon-button" type="button" data-action="refresh" aria-label="Yangilash">
        <span aria-hidden="true">${biIcon('arrow-repeat')}</span>
      </button>
    </header>
    <section class="screen-heading">
      <span>${escapeHtml(subtitle)}</span>
      <h1>${escapeHtml(headerTitle())}</h1>
    </section>
  `;
}

function renderPlatformVisual(platform) {
  const label = initials(platform.title);
  const slugClass = String(platform.slug || '').replace(/[^a-z0-9-]/gi, '');
  return `
    <div class="platform-visual platform-visual--${escapeHtml(slugClass)}" style="--accent:${escapeHtml(platform.accent_color || '#ff5a1f')}">
      ${
        platform.image_url
          ? `<img src="${escapeHtml(platform.image_url)}" alt="${escapeHtml(platform.title)}" loading="lazy" decoding="async" />`
          : `<span>${escapeHtml(label)}</span>`
      }
      <i></i>
      <b></b>
    </div>
  `;
}

function renderPlatforms() {
  if (state.loading) return renderSkeletonGrid('platform');
  if (state.error) return renderError();

  return `
    <section class="platform-grid">
      ${state.platforms
        .map(
          (platform, index) => `
            <button class="platform-card" type="button" data-action="open-platform" data-slug="${escapeHtml(platform.slug)}" style="--delay:${index * 45}ms">
              ${renderPlatformVisual(platform)}
              <span class="platform-count">${Number(platform.count || 0)} ta</span>
              <strong>${escapeHtml(platform.title)}</strong>
              <small>${escapeHtml(platform.subtitle)}</small>
            </button>
          `
        )
        .join('')}
    </section>
  `;
}

function renderGeneratedCover(account) {
  const platform = state.platforms.find((item) => item.slug === account.platform_slug);
  const accent = platform?.accent_color || '#ff5a1f';
  return `
    <div class="generated-cover" style="--accent:${escapeHtml(accent)}">
      <span>${escapeHtml(initials(account.title))}</span>
      <i></i>
      <b></b>
    </div>
  `;
}

function firstMedia(account) {
  if (!Array.isArray(account.media)) return null;
  return account.media.find((item) => item.type === 'image') || account.media[0] || null;
}

function renderAccountCover(account, index = 0) {
  const media = firstMedia(account);
  const badge = account.status === 'sold' ? 'SOTILDI' : account.is_new ? 'NEW' : account.is_top ? 'TOP' : '';
  const badgeClass = account.status === 'sold' ? 'is-sold' : account.is_new ? 'is-new' : '';
  const isEager = index < 2;

  return `
    <div class="account-cover">
      ${
        media?.url
          ? media.type === 'video'
            ? `<video src="${escapeHtml(media.url)}" muted playsinline preload="metadata"></video>`
            : `<img src="${escapeHtml(optimizedImageUrl(media.url, 520, 70))}" alt="${escapeHtml(account.title)}" loading="${isEager ? 'eager' : 'lazy'}" decoding="async" fetchpriority="${isEager ? 'high' : 'auto'}" />`
          : renderGeneratedCover(account)
      }
      ${badge ? `<span class="corner-badge ${badgeClass}">${badge}</span>` : ''}
    </div>
  `;
}

function accountMetaLine(account) {
  const bits = [];
  if (account.account_nickname) bits.push(account.account_nickname);
  if (account.account_region) bits.push(account.account_region);
  if (account.account_game_id) {
    bits.push(`${account.account_game_id}${account.account_server_id ? ` (${account.account_server_id})` : ''}`);
  }
  return bits.join(' · ');
}

function renderAccountStatusTabs() {
  return `
    <section class="account-status-tabs" aria-label="Akkaunt holati">
      <button class="${state.accountStatus === 'available' ? 'selected' : ''}" type="button" data-action="set-account-status" data-status="available">
        Sotuvda
      </button>
      <button class="${state.accountStatus === 'sold' ? 'selected' : ''}" type="button" data-action="set-account-status" data-status="sold">
        Sotilgan
      </button>
    </section>
  `;
}

function renderAccounts() {
  const isSold = state.accountStatus === 'sold';

  const empty = `
    <div class="empty-state">
      <strong>${isSold ? "Sotilgan akkaunt yo'q" : "Hali akkaunt yo'q"}</strong>
      <p>${isSold ? "Bu platformada sotilgan akkauntlar hali yo'q." : "Bu platformaga birinchi akkauntni siz qo'shishingiz mumkin."}</p>
      ${isSold ? '' : '<button class="primary-button" type="button" data-action="tab-sell">Akkaunt sotish</button>'}
    </div>
  `;

  let body = '';
  if (state.loading) {
    body = renderSkeletonGrid('account');
  } else if (state.error) {
    body = renderError();
  } else if (state.accounts.length) {
    body = `
      <section class="account-grid">
        ${state.accounts
          .map(
            (account, index) => `
              <button class="account-card ${account.status === 'sold' ? 'is-sold' : ''}" type="button" data-action="open-account" data-id="${escapeHtml(account.id)}" style="--delay:${index * 35}ms">
                ${renderAccountCover(account, index)}
                <span>${escapeHtml(account.title)}</span>
                ${accountMetaLine(account) ? `<small>${escapeHtml(accountMetaLine(account))}</small>` : ''}
                <strong>${formatPrice(account.price_uzs)}</strong>
              </button>
            `
          )
          .join('')}
      </section>
    `;
  } else {
    body = empty;
  }

  return `
    ${renderAccountStatusTabs()}

    <section class="list-toolbar">
      <button class="chip-button" type="button" data-action="back">Platformalar</button>
      <span>${state.accounts.length} ta ${isSold ? 'sotilgan' : 'variant'}</span>
    </section>

    ${body}
  `;
}

function renderMediaDetail(account) {
  const media = Array.isArray(account.media) ? account.media : [];
  if (!media.length) {
    return `<div class="detail-placeholder">${renderGeneratedCover(account)}</div>`;
  }

  return media
    .map((item, index) => {
      if (item.type === 'video') {
        return `
          <div class="detail-media-frame">
            <video src="${escapeHtml(item.url)}" controls playsinline preload="metadata"></video>
          </div>
        `;
      }

      return `
        <button class="detail-media-frame" type="button" data-action="preview-media" data-index="${index}">
          <img src="${escapeHtml(optimizedImageUrl(item.url, 1280, 82))}" alt="${escapeHtml(item.name || account.title)}" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async" fetchpriority="${index === 0 ? 'high' : 'auto'}" />
        </button>
      `;
    })
    .join('');
}

function buyText(account) {
  return `Assalomu alaykum, "${account.title}" akkauntingizni @${state.config.botUsername} da ko'rdim sotib olmoqchiman garant @${state.config.adminUsername}`;
}

function renderSellerInfo(account) {
  if (!isAdmin()) return '';
  const bits = [
    account.seller_name ? `Ism: ${account.seller_name}` : '',
    account.seller_username ? `@${String(account.seller_username).replace(/^@/, '')}` : '',
    account.seller_tg_id ? `ID ${account.seller_tg_id}` : ''
  ].filter(Boolean);

  if (!bits.length) return '';

  return `
    <section class="seller-panel">
      <span>Admin uchun</span>
      <strong>Sotuvchi</strong>
      <p>${escapeHtml(bits.join(' · '))}</p>
    </section>
  `;
}

function renderDetail() {
  const account = state.selectedAccount;
  if (!account) return renderError("Akkaunt topilmadi.");
  const isSold = account.status === 'sold';

  return `
    <article class="detail-view">
      <section class="detail-gallery">
        ${renderMediaDetail(account)}
      </section>

      <section class="detail-info">
        <div class="detail-title-row">
          <span class="corner-badge ${isSold ? 'is-sold' : account.is_new ? 'is-new' : ''}">${isSold ? 'SOTILDI' : account.is_new ? 'NEW' : account.is_top ? 'TOP' : 'SHOP'}</span>
          <h2>${escapeHtml(account.title)}</h2>
        </div>
        <strong class="detail-price">${formatPrice(account.price_uzs)}</strong>
        ${
          accountMetaLine(account)
            ? `<div class="detail-meta">
                ${account.account_nickname ? `<span>Nik: ${escapeHtml(account.account_nickname)}</span>` : ''}
                ${account.account_region ? `<span>Region: ${escapeHtml(account.account_region)}</span>` : ''}
                ${account.account_game_id ? `<span>ID: ${escapeHtml(account.account_game_id)}${account.account_server_id ? ` (${escapeHtml(account.account_server_id)})` : ''}</span>` : ''}
              </div>`
            : ''
        }
        <p>${escapeHtml(account.description).replace(/\n/g, '<br />')}</p>
        ${renderSellerInfo(account)}
      </section>

      <button class="buy-button ${isSold ? 'is-disabled' : ''}" type="button" data-action="${isSold ? '' : 'buy-account'}" ${isSold ? 'disabled' : ''}>${isSold ? 'Sotilgan' : 'Sotib olish'}</button>
    </article>
  `;
}

function renderSell() {
  const salePlatforms = state.platforms.filter((platform) => !isServicePlatform(platform.slug));
  const selectedSlug = salePlatforms.some((platform) => platform.slug === state.saleDraft.platformSlug)
    ? state.saleDraft.platformSlug
    : salePlatforms[0]?.slug || 'mobile-legends';
  const selectedPlatform = salePlatforms.find((platform) => platform.slug === selectedSlug);

  return `
    <form class="sell-form" id="sellForm">
      <input type="hidden" name="platformSlug" value="${escapeHtml(selectedSlug)}" />
      <input type="hidden" name="accountGameId" value="" />
      <input type="hidden" name="accountServerId" value="" />
      <input type="hidden" name="accountNickname" value="" />
      <input type="hidden" name="accountRegion" value="" />

      <label>
        <span>Akkaunt ID</span>
        <div class="lookup-row">
          <input name="accountIdRaw" type="text" maxlength="80" autocomplete="off" placeholder="${selectedPlatform?.slug === 'mobile-legends' ? '516874602 (6253)' : 'Akkaunt ID yoki username'}" />
          <button type="button" data-action="lookup-account">Tekshirish</button>
        </div>
      </label>

      <div class="lookup-status" id="lookupStatus">
        ${selectedSlug ? "Akkaunt ID ni tekshiring." : 'Avval platformani tanlang.'}
      </div>

      <label>
        <span>Akkaunt nicki</span>
        <input name="title" type="text" maxlength="140" autocomplete="off" placeholder="Tekshirishdan keyin avtomatik tushadi" />
      </label>

      <label>
        <span>To'liq ma'lumot</span>
        <textarea name="description" rows="5" maxlength="3000" required placeholder="Skinlar, rank, login holati, kafolat..."></textarea>
      </label>

      <label>
        <span>Narx</span>
        <input name="price" type="text" inputmode="numeric" required placeholder="5 000 000" />
      </label>

      <div class="upload-zone">
        <input id="mediaInput" type="file" accept="image/*,video/*" multiple />
        <label for="mediaInput">
          <strong>Rasm yoki video yuklash</strong>
          <span>${state.pendingFiles.length} ta fayl tanlangan</span>
        </label>
      </div>

      <div class="media-preview">
        ${renderPendingFiles()}
      </div>

      <section class="sale-platforms" aria-label="Platforma tanlash">
        ${salePlatforms
          .map(
            (platform) => `
              <button class="${platform.slug === selectedSlug ? 'selected' : ''}" type="button" data-action="select-sale-platform" data-slug="${escapeHtml(platform.slug)}">
                <span style="--accent:${escapeHtml(platform.accent_color || '#ff5a1f')}">
                  ${
            platform.image_url
                      ? `<img src="${escapeHtml(platform.image_url)}" alt="" loading="lazy" decoding="async" />`
                      : escapeHtml(initials(platform.title))
                  }
                </span>
                <strong>${escapeHtml(platform.title)}</strong>
              </button>
            `
          )
          .join('')}
      </section>

      <p class="form-status" id="formStatus"></p>

      <button class="primary-button" type="submit">Sotuvga qo'yish</button>
    </form>
  `;
}

function renderPendingFiles() {
  if (!state.pendingFiles.length) return '';

  return state.pendingFiles
    .map(
      (item) => `
        <div class="preview-tile">
          ${
            item.type === 'video'
              ? `<video src="${escapeHtml(item.url)}" muted playsinline preload="metadata"></video>`
              : `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.file.name)}" decoding="async" />`
          }
          <button type="button" data-action="remove-file" data-id="${escapeHtml(item.id)}" aria-label="O'chirish">${biIcon('x-lg')}</button>
          <span>${escapeHtml(sizeLabel(item.file.size))}</span>
        </div>
      `
    )
    .join('');
}

function refreshMediaPreview() {
  const preview = document.querySelector('.media-preview');
  if (preview) preview.innerHTML = renderPendingFiles();

  const uploadCount = document.querySelector('.upload-zone label span');
  if (uploadCount) uploadCount.textContent = `${state.pendingFiles.length} ta fayl tanlangan`;

  const input = document.querySelector('#mediaInput');
  if (input) input.value = '';
}

function renderSkeletonGrid(type) {
  const count = type === 'account' ? 6 : 6;
  return `
    <section class="${type === 'account' ? 'account-grid' : 'platform-grid'}">
      ${Array.from({ length: count })
        .map(() => `<div class="skeleton-card"><i></i><span></span><b></b></div>`)
        .join('')}
    </section>
  `;
}

function renderError(message = state.error) {
  return `
    <div class="empty-state">
      <strong>Xatolik</strong>
      <p>${escapeHtml(message || "Ma'lumot yuklanmadi.")}</p>
      <button class="primary-button" type="button" data-action="refresh">Qayta urinish</button>
    </div>
  `;
}

function renderTelegramServices() {
  const activeKey = TELEGRAM_SECTIONS[state.telegramSection] ? state.telegramSection : 'nft';
  const section = TELEGRAM_SECTIONS[activeKey];
  const listings = state.telegramListings[activeKey] || [];
  const fabLabel = state.telegramFormOpen ? 'Yopish' : 'Sotish';

  return `
    <section class="telegram-hub">
      <section class="service-tabs" aria-label="Telegram bo'limlari">
        ${Object.entries(TELEGRAM_SECTIONS)
          .map(
            ([key, item]) => `
              <button class="${key === activeKey ? 'selected' : ''}" type="button" data-action="set-telegram-section" data-section="${escapeHtml(key)}">
                ${escapeHtml(item.label)}
              </button>
            `
          )
          .join('')}
      </section>

      <article class="telegram-service-card" style="--accent:${escapeHtml(section.accent)}">
        <div class="telegram-service-mark" aria-hidden="true">
          <span>${escapeHtml(initials(section.title))}</span>
        </div>
        <h2>${escapeHtml(section.headline)}</h2>
        <p>${escapeHtml(section.copy)}</p>
      </article>

      ${state.telegramFormOpen ? renderTelegramListingForm(activeKey, section) : ''}

      <section class="telegram-list" id="telegramListings">
        ${
          state.telegramLoading
            ? renderSkeletonGrid('account')
            : state.telegramError
              ? renderError(state.telegramError)
              : listings.length
                ? listings.map((listing) => renderTelegramListingCard(listing, section)).join('')
                : `<div class="empty-state telegram-empty"><strong>${escapeHtml(section.empty)}</strong><p>Yangi e'lon birinchi bo'lib shu yerda chiqadi.</p></div>`
        }
      </section>

      <button class="telegram-fab ${state.telegramFormOpen ? 'is-open' : ''}" type="button" data-action="toggle-telegram-form" aria-label="${escapeHtml(fabLabel)}">
        <span aria-hidden="true">${biIcon(state.telegramFormOpen ? 'x-lg' : 'plus-lg')}</span>
        <strong>${escapeHtml(fabLabel)}</strong>
      </button>
    </section>
  `;
}

function renderTelegramListingForm(activeKey, section) {
  return `
    <form class="telegram-listing-form" id="telegramListingForm" style="--accent:${escapeHtml(section.accent)}">
      <input type="hidden" name="listingType" value="${escapeHtml(activeKey)}" />
      <label>
        <span>${escapeHtml(section.linkLabel)}</span>
        <input name="listingLink" type="text" maxlength="220" autocomplete="off" required placeholder="${escapeHtml(section.placeholder)}" />
      </label>
      ${renderTelegramImageField(activeKey)}
      <label>
        <span>Narx</span>
        <input name="price" type="text" inputmode="numeric" required placeholder="1 000 000" />
      </label>
      <p class="form-status" id="telegramFormStatus"></p>
      <button class="primary-button" type="submit">Sotuvga qo'yish</button>
    </form>
  `;
}

function renderTelegramImageField(activeKey = state.telegramSection) {
  if (activeKey !== 'nft') return '';

  const image = state.telegramImage;
  return `
    <div class="telegram-image-field ${image ? 'has-image' : ''}">
      <input id="telegramImageInput" type="file" accept="image/*" />
      <label for="telegramImageInput">
        ${
          image
            ? `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.file.name)}" decoding="async" />`
            : `<em aria-hidden="true">${biIcon('plus-lg')}</em>`
        }
        <strong>NFT rasmi</strong>
        <small>Link preview chiqmasa, xaridor shu ko'rinishni ko'radi.</small>
      </label>
      ${image ? `<button type="button" data-action="remove-telegram-image" aria-label="Rasmni olib tashlash">${biIcon('x-lg')}</button>` : ''}
    </div>
  `;
}

function renderTelegramListingCard(listing, section) {
  const seller = listing.seller_username ? `@${String(listing.seller_username).replace(/^@/, '')}` : listing.seller_name || 'Sotuvchi';
  const sellerLine = isAdmin() ? seller : 'Sotuvchi himoyalangan';
  const media = firstMedia(listing);
  const mediaUrl = media?.type === 'image' && media.url ? optimizedImageUrl(media.url, 180, 70) : '';

  return `
    <article class="telegram-listing-card" style="--accent:${escapeHtml(section.accent)}">
      <div class="telegram-listing-thumb">
        ${
          mediaUrl
            ? `<img src="${escapeHtml(mediaUrl)}" alt="${escapeHtml(listing.title)}" loading="lazy" decoding="async" />`
            : `<span>${escapeHtml(initials(section.title))}</span>`
        }
      </div>
      <div class="telegram-listing-main">
        <span>${escapeHtml(section.label)}</span>
        <strong>${escapeHtml(listing.title)}</strong>
        <small>${escapeHtml(sellerLine)}</small>
      </div>
      <div class="telegram-listing-side">
        <b>${formatPrice(listing.price_uzs)}</b>
        <button type="button" data-action="buy-telegram-listing" data-id="${escapeHtml(listing.id)}">Sotib olish</button>
      </div>
    </article>
  `;
}

function filteredHistoryAccounts() {
  if (state.history.filter === 'sold') return state.history.accounts.filter((account) => account.status === 'sold');
  if (state.history.filter === 'available') return state.history.accounts.filter((account) => account.status === 'available');
  return state.history.accounts;
}

function historyDateValue(account) {
  return account.status === 'sold' && account.sold_at ? account.sold_at : account.created_at;
}

function historyDate(account) {
  const date = new Date(historyDateValue(account));
  if (Number.isNaN(date.getTime())) return 'Sana yo\'q';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function historyTime(account) {
  const date = new Date(historyDateValue(account));
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function historyGroups(accounts) {
  const groups = new Map();
  for (const account of accounts) {
    const date = historyDate(account);
    const current = groups.get(date) || {
      date,
      total: 0,
      accounts: []
    };
    current.total += Number(account.price_uzs || 0);
    current.accounts.push(account);
    groups.set(date, current);
  }
  return [...groups.values()];
}

function renderHistory() {
  const accounts = filteredHistoryAccounts();
  const groups = historyGroups(accounts);

  return `
    <section class="history-view">
      <section class="history-tools" aria-label="Tarix amallari">
        <div>
          <span>${isAdmin() ? 'Admin tarixi' : 'Mening e\'lonlarim'}</span>
          <strong>${accounts.length} ta yozuv</strong>
        </div>
        <button class="history-export" type="button" data-action="download-history" aria-label="Tarixni yuklab olish">${biIcon('download')}</button>
      </section>

      <section class="pill-tabs" aria-label="Tarix filterlari">
        <button class="${state.history.filter === 'all' ? 'selected' : ''}" type="button" data-action="set-history-filter" data-filter="all">Barchasi</button>
        <button class="${state.history.filter === 'available' ? 'selected' : ''}" type="button" data-action="set-history-filter" data-filter="available">Sotuvda</button>
        <button class="${state.history.filter === 'sold' ? 'selected' : ''}" type="button" data-action="set-history-filter" data-filter="sold">Sotilgan</button>
      </section>

      ${
        state.history.loading
          ? renderSkeletonGrid('account')
          : state.history.error
            ? renderError(state.history.error)
            : groups.length
              ? `<section class="history-list">${groups.map((group) => renderHistoryGroup(group)).join('')}</section>`
              : `<div class="empty-state compact"><strong>Tarix bo'sh</strong><p>${isAdmin() ? 'Hali userlar amali topilmadi.' : "Sotuvga qo'ygan yoki sotilgan akkauntingiz hali yo'q."}</p></div>`
      }
    </section>
  `;
}

function renderHistoryGroup(group) {
  return `
    <section class="history-day">
      <header>
        <strong>${escapeHtml(group.date)}</strong>
        <span>${formatPrice(group.total)}</span>
      </header>
      ${group.accounts.map((account) => renderHistoryItem(account)).join('')}
    </section>
  `;
}

function renderHistoryItem(account) {
  const seller = isAdmin() && (account.seller_username || account.seller_name)
    ? `<small>${escapeHtml(account.seller_username ? `@${account.seller_username}` : account.seller_name)}</small>`
    : '';
  const isSold = account.status === 'sold';
  const statusLabel = isSold ? 'Sotilgan' : 'Sotuvda';
  const time = historyTime(account);

  return `
    <button class="history-item" type="button" data-action="open-history-account" data-id="${escapeHtml(account.id)}">
      <span class="history-icon ${isSold ? 'is-sold' : ''}" aria-hidden="true">${biIcon(isSold ? 'arrow-down-right' : 'arrow-up-right')}</span>
      <span class="history-copy">
        <span>
          <strong>${escapeHtml(account.title)}</strong>
          <em>${escapeHtml(statusLabel)}</em>
        </span>
        <small>${escapeHtml(time || historyDate(account))}</small>
        ${seller}
      </span>
      <b class="${isSold ? 'is-positive' : ''}">${isSold ? '+' : ''}${formatPrice(account.price_uzs)}</b>
    </button>
  `;
}

function userInitial() {
  return initials(state.me?.user?.display_name || state.me?.user?.username || 'U').slice(0, 1);
}

function renderAvatar(sizeClass = '') {
  const user = state.me?.user || {};
  if (user.photo_url) {
    return `<img class="profile-avatar ${sizeClass}" src="${escapeHtml(user.photo_url)}" alt="${escapeHtml(user.display_name || 'Profil')}" />`;
  }
  return `<span class="profile-avatar ${sizeClass}" aria-hidden="true">${escapeHtml(userInitial())}</span>`;
}

function renderSoonBadge() {
  return '<span class="row-badge soon-badge">Tez kunda</span>';
}

function renderProfileEditor() {
  if (!state.profileEditorOpen) return '';

  const user = state.me?.user || {};
  const avatarUrl = state.profileAvatarDraft || user.photo_url || '';
  const avatarPreview = avatarUrl
    ? `<img class="profile-avatar is-large" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(user.display_name || 'Profil')}" />`
    : renderAvatar('is-large');

  return `
    <form class="profile-edit-form" id="profileEditForm">
      <div class="profile-edit-avatar">
        ${avatarPreview}
        <label>
          <span>${biIcon('folder2-open')}</span>
          Logo tanlash
          <input id="profileAvatarInput" type="file" accept="image/*" />
        </label>
      </div>
      <input type="hidden" name="avatarUrl" value="${escapeHtml(avatarUrl)}" />
      <label>
        <span>Ism</span>
        <input name="displayName" maxlength="80" autocomplete="name" required value="${escapeHtml(user.display_name || '')}" />
      </label>
      <div class="form-actions">
        <button class="secondary-button" type="button" data-action="cancel-profile-edit">Bekor qilish</button>
        <button class="primary-button" type="submit">Saqlash</button>
      </div>
      <p class="form-status" id="profileEditStatus"></p>
    </form>
  `;
}

function renderProfile() {
  const user = state.me?.user || {};
  const username = user.username ? `@${user.username}` : 'username yo\'q';
  const roleLabel = isSuperAdmin() ? 'Superadmin' : isAdmin() ? 'Admin' : 'User';
  const subscriptionCopy = user.is_premium ? 'Premium · Obuna bo\'lgan' : 'Oddiy tarif · Faol';
  const groupCopy = state.config.telegramGroupUrl ? 'Guruh ulangan' : 'Admin panel orqali biriktiriladi';

  return `
    <section class="profile-view">
      <section class="profile-hero">
        ${renderAvatar('is-large')}
        <h2>${escapeHtml(user.display_name || 'Foydalanuvchi')}</h2>
        <p class="profile-meta-pill">${escapeHtml(username)}${user.id ? ` • ID ${escapeHtml(user.id)}` : ''}</p>
        ${isAdmin() ? `<span class="profile-role">${escapeHtml(roleLabel)}</span>` : ''}
      </section>

      <section class="settings-list">
        <button class="settings-row" type="button" data-action="profile-edit">
          <span aria-hidden="true">${biIcon('person')}</span>
          <div>
            <strong>Profilni tahrirlash</strong>
          </div>
          <i aria-hidden="true">${biIcon('chevron-right')}</i>
        </button>
        ${renderProfileEditor()}
        <button class="settings-row is-disabled" type="button" disabled>
          <span aria-hidden="true">${biIcon('gem')}</span>
          <div>
            <strong>Obuna holati</strong>
            <small>${escapeHtml(subscriptionCopy)}</small>
          </div>
          ${renderSoonBadge()}
        </button>
      </section>

      <section class="settings-list">
        <button class="settings-row" type="button" data-action="open-telegram-community">
          <span aria-hidden="true">${biIcon('send')}</span>
          <div>
            <strong>Telegram guruh</strong>
            <small>${escapeHtml(groupCopy)}</small>
          </div>
          <i aria-hidden="true">${biIcon('chevron-right')}</i>
        </button>
        <button class="settings-row" type="button" data-action="usd-rate-info">
          <span aria-hidden="true">${biIcon('currency-dollar')}</span>
          <div>
            <strong>USD Kurs</strong>
          </div>
          <i aria-hidden="true">${biIcon('chevron-right')}</i>
        </button>
        <button class="settings-row" type="button" data-action="${isAdmin() ? 'open-platform-manager' : 'tab-store'}">
          <span aria-hidden="true">${biIcon('folder2-open')}</span>
          <div>
            <strong>Platformalar</strong>
            <small>${isAdmin() ? 'Keraksizlarini userlardan yashirish' : 'Savdo bo\'limlari'}</small>
          </div>
          <i aria-hidden="true">${biIcon('chevron-right')}</i>
        </button>
        <button class="settings-row is-disabled" type="button" disabled>
          <span aria-hidden="true">${biIcon('people')}</span>
          <div>
            <strong>Do'stlar</strong>
            <small>Taklif qiling va mukofot oling</small>
          </div>
          ${renderSoonBadge()}
        </button>
        <button class="settings-row is-disabled" type="button" disabled>
          <span aria-hidden="true">${biIcon('bell')}</span>
          <div>
            <strong>Bildirishnomalar</strong>
            <small>Shaxsiy xabar sozlamalari</small>
          </div>
          ${renderSoonBadge()}
        </button>
        <button class="settings-row" type="button" data-action="tab-history">
          <span aria-hidden="true">${biIcon('clock')}</span>
          <div>
            <strong>${isAdmin() ? 'Barcha e\'lonlar tarixi' : 'Mening e\'lonlarim'}</strong>
            <small>${isAdmin() ? 'Userlar e\'lonlari va savdolari' : 'Sotuvga qo\'ygan va sotgan akkauntlar'}</small>
          </div>
          <i aria-hidden="true">${biIcon('chevron-right')}</i>
        </button>
      </section>

      ${
        isAdmin()
          ? `<section class="settings-list">
              <button class="settings-row is-admin" type="button" data-action="open-admin">
                <span aria-hidden="true">${biIcon('gear')}</span>
                <div>
                  <strong>Admin panel</strong>
                  <small>${isSuperAdmin() ? 'Admin qo\'shish va boshqarish' : 'Yopiq admin bo\'lim'}</small>
                </div>
                <i aria-hidden="true">${biIcon('chevron-right')}</i>
              </button>
            </section>`
          : ''
      }
    </section>
  `;
}

function renderAdminPanel() {
  if (!isAdmin()) {
    return `<div class="empty-state"><strong>Ruxsat yo'q</strong><p>Bu bo'lim faqat adminlar uchun.</p></div>`;
  }

  return `
    <section class="admin-view">
      <section class="stat-panel admin">
        <span>${isSuperAdmin() ? 'Superadmin' : 'Admin'}</span>
        <strong>Mini app boshqaruvi</strong>
        <div>
          <small>Funksiyalar</small>
          <small>Platformalar</small>
          <small>${isSuperAdmin() ? 'Adminlar' : 'Admin rejimi'}</small>
        </div>
      </section>

      ${renderAdminSettings()}

      <section class="admin-card">
        <header>
          <span>${biIcon('folder2-open')}</span>
          <div>
            <strong>Platformalar</strong>
            <small>O'chirilgan platformalar barcha userlardan yashiriladi.</small>
          </div>
        </header>
        ${renderPlatformManager(true)}
      </section>

      <section class="admin-card">
        <header>
          <span>${biIcon('person')}</span>
          <div>
            <strong>Adminlar</strong>
            <small>${isSuperAdmin() ? 'ID orqali yoki username bilan qo\'shing.' : 'Admin qo\'shish faqat superadmin uchun.'}</small>
          </div>
        </header>
        ${renderAdminManagement()}
      </section>
    </section>
  `;
}

function renderAdminSettings() {
  return `
    <form class="admin-form admin-settings-form" id="adminSettingsForm">
      <label>
        <span>Telegram guruh linki</span>
        <input name="telegramGroupUrl" placeholder="https://t.me/..." value="${escapeHtml(state.config.telegramGroupUrl || '')}" />
      </label>
      <section class="admin-toggle-list" aria-label="Funksiyalar">
        ${renderAdminToggle('sellingEnabled', "Qo'shish bo'limi", state.config.sellingEnabled)}
        ${renderAdminToggle('telegramListingsEnabled', 'Telegram savdosi', state.config.telegramListingsEnabled)}
        ${renderAdminToggle('friendsEnabled', "Do'stlar funksiyasi", state.config.friendsEnabled)}
        ${renderAdminToggle('notificationsEnabled', 'Bildirishnomalar', state.config.notificationsEnabled)}
      </section>
      <button class="primary-button" type="submit">Sozlamalarni saqlash</button>
      <p class="form-status" id="adminSettingsStatus"></p>
    </form>
  `;
}

function renderAdminToggle(name, label, checked) {
  return `
    <label class="toggle-row">
      <span>${escapeHtml(label)}</span>
      <input name="${escapeHtml(name)}" type="checkbox" ${checked ? 'checked' : ''} />
      <i aria-hidden="true"></i>
    </label>
  `;
}

function renderAdminManagement() {
  if (!isSuperAdmin()) {
    return `<div class="empty-state compact"><strong>Superadmin kerak</strong><p>Adminlarni qo'shish va o'chirish superadmin ruxsati bilan ishlaydi.</p></div>`;
  }

  return `
    <form class="admin-form" id="adminForm">
      <label>
        <span>Telegram ID</span>
        <input name="tgUserId" inputmode="numeric" placeholder="8032495342" />
      </label>
      <label>
        <span>Username</span>
        <input name="username" placeholder="@username (ixtiyoriy)" autocomplete="off" />
      </label>
      <button class="primary-button" type="submit">Admin qo'shish</button>
      <p class="form-status" id="adminFormStatus"></p>
    </form>

    <section class="admin-list">
      ${
        state.admins.loading
          ? renderSkeletonGrid('account')
          : state.admins.error
            ? renderError(state.admins.error)
            : state.admins.items.map((admin) => renderAdminItem(admin)).join('')
      }
    </section>
  `;
}

function renderPlatformAdminView() {
  if (!isAdmin()) {
    return `<div class="empty-state"><strong>Ruxsat yo'q</strong><p>Platformalarni boshqarish faqat adminlar uchun.</p></div>`;
  }

  return `
    <section class="admin-view">
      <section class="admin-card">
        <header>
          <span>${biIcon('folder2-open')}</span>
          <div>
            <strong>Platformalar nomi</strong>
            <small>Status o'chirilsa, platforma barcha userlarda ko'rinmaydi.</small>
          </div>
        </header>
        ${renderPlatformManager(false)}
      </section>
    </section>
  `;
}

function renderPlatformManager(compact = false) {
  if (state.adminPlatforms.loading) return `<div class="empty-state compact"><strong>Yuklanmoqda...</strong></div>`;
  if (state.adminPlatforms.error) return renderError(state.adminPlatforms.error);
  if (!state.adminPlatforms.items.length) return `<div class="empty-state compact"><strong>Platforma topilmadi</strong></div>`;

  return `
    <section class="platform-admin-list ${compact ? 'is-compact' : ''}">
      ${state.adminPlatforms.items.map((platform) => renderPlatformAdminItem(platform)).join('')}
    </section>
  `;
}

function renderPlatformAdminItem(platform) {
  return `
    <article class="platform-admin-item">
      <span style="--accent:${escapeHtml(platform.accent_color || '#ff5a1f')}" aria-hidden="true">${escapeHtml(initials(platform.title))}</span>
      <div>
        <strong>${escapeHtml(platform.title)}</strong>
        <small>${escapeHtml(platform.subtitle || platform.slug)} · ${platform.count || 0} ta e'lon</small>
      </div>
      <label class="switch-control">
        <input type="checkbox" data-action="toggle-platform-status" data-slug="${escapeHtml(platform.slug)}" ${platform.is_active ? 'checked' : ''} />
        <i aria-hidden="true"></i>
      </label>
    </article>
  `;
}

function renderAdminItem(admin) {
  const title = admin.username ? `@${admin.username}` : `ID ${admin.tg_user_id}`;
  const removable = admin.source !== 'env' && admin.role !== 'superadmin';
  return `
    <article class="admin-item">
      <span aria-hidden="true">${admin.role === 'superadmin' ? biIcon('star-fill') : biIcon('person')}</span>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(admin.role)} · ${admin.source === 'env' ? 'Vercel env' : 'database'}</small>
      </div>
      ${removable ? `<button type="button" data-action="delete-admin" data-id="${escapeHtml(admin.id)}">O'chirish</button>` : '<em>Asosiy</em>'}
    </article>
  `;
}

function renderBottomNav() {
  return `
    <nav class="bottom-nav" aria-label="Asosiy">
      <button class="${state.tab === 'home' ? 'active' : ''}" type="button" data-action="tab-store">
        <span aria-hidden="true">${biIcon('grid')}</span>
        <strong>Bosh</strong>
      </button>
      <button class="nav-add ${state.tab === 'sell' ? 'active' : ''} ${state.config.sellingEnabled ? '' : 'is-disabled'}" type="button" data-action="tab-sell" aria-label="Qo'shish" aria-disabled="${state.config.sellingEnabled ? 'false' : 'true'}">
        <span aria-hidden="true">${biIcon('plus-lg')}</span>
        <strong>Sotish</strong>
      </button>
      <button class="${state.tab === 'history' ? 'active' : ''}" type="button" data-action="tab-history">
        <span aria-hidden="true">${biIcon('clock')}</span>
        <strong>Tarix</strong>
      </button>
      <button class="${state.tab === 'profile' ? 'active' : ''}" type="button" data-action="tab-profile">
        <span aria-hidden="true">${biIcon('person')}</span>
        <strong>Profil</strong>
      </button>
    </nav>
  `;
}

function renderLightbox() {
  if (!state.lightbox) return '';
  const { url, type } = state.lightbox;

  return `
    <div class="lightbox" data-action="close-lightbox">
      <button type="button" data-action="close-lightbox" aria-label="Yopish">${biIcon('x-lg')}</button>
      ${
        type === 'video'
          ? `<video src="${escapeHtml(url)}" controls autoplay playsinline></video>`
          : `<img src="${escapeHtml(url)}" alt="Akkaunt media" />`
      }
    </div>
  `;
}

function currentContent() {
  if (state.route === 'sell') return renderSell();
  if (state.route === 'history') return renderHistory();
  if (state.route === 'profile') return renderProfile();
  if (state.route === 'platform-admin') return renderPlatformAdminView();
  if (state.route === 'admin') return renderAdminPanel();
  if (state.route === 'telegram') return renderTelegramServices();
  if (state.route === 'accounts') return renderAccounts();
  if (state.route === 'detail') return renderDetail();
  return renderPlatforms();
}

function render() {
  app.innerHTML = `
    <main class="app-shell">
      ${renderHeader()}
      <section class="content">
        ${currentContent()}
      </section>
      ${renderBottomNav()}
    </main>
    ${renderLightbox()}
  `;
}

function findPlatform(slug) {
  return state.platforms.find((platform) => platform.slug === slug) || null;
}

function findAccount(id) {
  return (
    state.accounts.find((account) => account.id === id) ||
    state.history.accounts.find((account) => account.id === id) ||
    Object.values(state.telegramListings).flat().find((account) => account.id === id) ||
    null
  );
}

async function openPlatform(slug) {
  const platform = findPlatform(slug);
  if (!platform) return;

  if (isServicePlatform(slug)) {
    if (!state.config.telegramListingsEnabled) {
      showToast('Telegram savdosi admin tomonidan vaqtincha yopilgan.');
      return;
    }

    clearTelegramListingImage();
    withRenderTransition(() => {
      cancelAccountLoads();
      state.selectedPlatform = platform;
      state.selectedAccount = null;
      state.accounts = [];
      state.route = 'telegram';
      state.tab = 'home';
      state.loading = false;
      state.telegramFormOpen = false;
      render();
    });
    await loadTelegramListings(state.telegramSection);
    return;
  }

  withRenderTransition(() => {
    state.selectedPlatform = platform;
    state.route = 'accounts';
    state.tab = 'home';
    state.accountStatus = 'available';
    state.accounts = [];
    state.loading = true;
    render();
  });
  await loadAccounts(slug, 'available');
}

function openAccount(id) {
  const account = findAccount(id);
  if (!account) return;

  withRenderTransition(() => {
    state.selectedAccount = account;
    state.route = 'detail';
    render();
  });
}

function goBack() {
  if (state.route === 'detail') {
    withRenderTransition(() => {
      state.route = state.selectedPlatform ? 'accounts' : 'history';
      state.selectedAccount = null;
      render();
    });
    return;
  }

  if (state.route === 'accounts') {
    withRenderTransition(() => {
      cancelAccountLoads();
      state.route = 'platforms';
      state.selectedPlatform = null;
      state.accounts = [];
      state.loading = false;
      render();
    });
    return;
  }

  if (state.route === 'telegram') {
    clearTelegramListingImage();
    withRenderTransition(() => {
      cancelAccountLoads();
      state.route = 'platforms';
      state.selectedPlatform = null;
      state.loading = false;
      render();
    });
  }

  if (state.route === 'admin') {
    withRenderTransition(() => {
      state.route = 'profile';
      state.tab = 'profile';
      render();
    });
  }

  if (state.route === 'platform-admin') {
    withRenderTransition(() => {
      state.route = 'profile';
      state.tab = 'profile';
      render();
    });
  }
}

async function refreshCurrent() {
  if (state.route === 'accounts' && state.selectedPlatform) {
    await loadAccounts(state.selectedPlatform.slug, state.accountStatus);
    return;
  }

  if (state.route === 'telegram') {
    await loadTelegramListings(state.telegramSection);
    return;
  }

  if (state.route === 'history') {
    await loadHistory();
    return;
  }

  if (state.route === 'profile') {
    await loadMe();
    render();
    return;
  }

  if (state.route === 'platform-admin') {
    await loadAdminPlatforms();
    return;
  }

  if (state.route === 'admin') {
    await Promise.all([loadConfig(), loadAdminPlatforms(), loadAdmins()]);
    return;
  }

  await loadPlatforms();
}

function switchTab(tab) {
  if (tab === 'sell' && !state.config.sellingEnabled) {
    showToast("Qo'shish bo'limi admin tomonidan vaqtincha yopilgan.");
    return;
  }

  const currentPlatformSlug = state.selectedPlatform?.slug;
  const platformSlug =
    tab === 'sell'
      ? currentPlatformSlug && !isServicePlatform(currentPlatformSlug)
        ? currentPlatformSlug
        : state.saleDraft.platformSlug || 'mobile-legends'
      : state.saleDraft.platformSlug || 'mobile-legends';

  withRenderTransition(() => {
    clearTelegramListingImage();
    cancelAccountLoads();
    state.tab = tab;
    state.route =
      tab === 'sell'
        ? 'sell'
        : tab === 'history'
          ? 'history'
          : tab === 'profile'
            ? 'profile'
            : 'platforms';
    state.selectedAccount = null;
    state.selectedPlatform = null;
    state.saleDraft.platformSlug = isServicePlatform(platformSlug) ? 'mobile-legends' : platformSlug;
    state.saleDraft.lookup = null;
    state.profileEditorOpen = false;
    state.profileAvatarDraft = '';
    state.accountStatus = 'available';
    state.accounts = [];
    state.loading = false;
    render();
  });

  if (tab === 'history') loadHistory();
  if (tab === 'profile') loadMe().then(() => render());
}

async function setAccountStatus(status) {
  if (!ACCOUNT_STATUSES.has(status) || status === state.accountStatus || !state.selectedPlatform) return;

  withRenderTransition(() => {
    state.accountStatus = status;
    state.accounts = [];
    state.loading = true;
    render();
  });

  await loadAccounts(state.selectedPlatform.slug, status);
}

function setTelegramSection(section) {
  if (!TELEGRAM_SECTIONS[section] || section === state.telegramSection) return;

  clearTelegramListingImage();
  withRenderTransition(() => {
    state.telegramSection = section;
    state.telegramFormOpen = false;
    render();
  });
  loadTelegramListings(section);
}

function toggleTelegramForm() {
  if (state.telegramFormOpen) {
    clearTelegramListingImage();
  }

  state.telegramFormOpen = !state.telegramFormOpen;
  render();
}

function setSalePlatform(slug) {
  if (isServicePlatform(slug)) return;

  state.saleDraft.platformSlug = slug;
  state.saleDraft.lookup = null;

  const form = document.querySelector('#sellForm');
  if (!form) return;

  form.elements.platformSlug.value = slug;
  form.elements.accountGameId.value = '';
  form.elements.accountServerId.value = '';
  form.elements.accountNickname.value = '';
  form.elements.accountRegion.value = '';

  for (const button of form.querySelectorAll('[data-action="select-sale-platform"]')) {
    button.classList.toggle('selected', button.dataset.slug === slug);
  }

  const selectedPlatform = state.platforms.find((platform) => platform.slug === slug);
  const idInput = form.elements.accountIdRaw;
  if (idInput) {
    idInput.placeholder = selectedPlatform?.slug === 'mobile-legends' ? '516874602 (6253)' : 'Akkaunt ID yoki username';
  }

  setLookupStatus("Platforma tanlandi. Akkaunt ID ni kiriting va tekshiring.", 'muted');
}

function setLookupStatus(message, tone = 'muted') {
  const status = document.querySelector('#lookupStatus');
  if (!status) return;
  status.className = `lookup-status ${tone}`;
  status.innerHTML = message;
}

function applyLookupToForm(result) {
  const form = document.querySelector('#sellForm');
  if (!form) return;

  form.elements.accountGameId.value = result.accountId || '';
  form.elements.accountServerId.value = result.serverId || '';
  form.elements.accountNickname.value = result.nickname || '';
  form.elements.accountRegion.value = result.region || '';

  const currentTitle = form.elements.title.value.trim();
  if (!currentTitle || currentTitle === result.raw || currentTitle === result.accountId) {
    form.elements.title.value = result.nickname || result.raw || result.accountId || '';
  }

  state.saleDraft.lookup = result;
  const parts = [
    result.nickname ? `Nik: <strong>${escapeHtml(result.nickname)}</strong>` : '',
    result.region ? `Region: <strong>${escapeHtml(result.region)}</strong>` : '',
    result.raw ? `ID: <strong>${escapeHtml(result.raw)}</strong>` : ''
  ].filter(Boolean);

  setLookupStatus(parts.join('<br />') || "Ma'lumot topilmadi.", 'success');
}

async function lookupAccount() {
  const form = document.querySelector('#sellForm');
  if (!form) return;

  const platformSlug = form.elements.platformSlug.value;
  const accountIdRaw = form.elements.accountIdRaw.value.trim();

  if (!platformSlug) {
    showToast('Avval platformani tanlang.');
    return;
  }

  if (!accountIdRaw) {
    showToast('Avval akkaunt ID kiriting.');
    form.elements.accountIdRaw.focus();
    return;
  }

  setLookupStatus('Tekshirilmoqda...', 'loading');

  try {
    const params = new URLSearchParams({
      platform: platformSlug,
      accountId: accountIdRaw
    });
    const result = await api(`/api/account-lookup?${params.toString()}`);
    applyLookupToForm(result);
  } catch (error) {
    form.elements.accountGameId.value = '';
    form.elements.accountServerId.value = '';
    form.elements.accountNickname.value = '';
    form.elements.accountRegion.value = '';
    state.saleDraft.lookup = null;
    setLookupStatus(escapeHtml(error.message), 'error');
    showToast(error.message);
  }
}

function addPendingFiles(files) {
  const next = [...files].slice(0, 10 - state.pendingFiles.length);
  const accepted = [];

  for (const file of next) {
    const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : '';
    if (!type) {
      showToast('Faqat rasm yoki video tanlang.');
      continue;
    }

    const limit = type === 'video' ? state.config.maxVideoBytes : state.config.maxImageBytes;
    if (file.size > limit) {
      showToast(`${file.name} juda katta. Limit: ${sizeLabel(limit)}.`);
      continue;
    }

    const url = URL.createObjectURL(file);
    objectUrls.add(url);
    accepted.push({
      id: uid(),
      file,
      type,
      url
    });
  }

  state.pendingFiles = [...state.pendingFiles, ...accepted].slice(0, 10);
  refreshMediaPreview();
}

function removePendingFile(id) {
  const item = state.pendingFiles.find((file) => file.id === id);
  if (item) {
    URL.revokeObjectURL(item.url);
    objectUrls.delete(item.url);
  }

  state.pendingFiles = state.pendingFiles.filter((file) => file.id !== id);
  refreshMediaPreview();
}

function clearTelegramListingImage() {
  if (state.telegramImage?.url) {
    URL.revokeObjectURL(state.telegramImage.url);
    objectUrls.delete(state.telegramImage.url);
  }

  state.telegramImage = null;
}

function renderTelegramImagePreview() {
  const field = document.querySelector('.telegram-image-field');
  if (field) field.outerHTML = renderTelegramImageField(state.telegramSection);

  const input = document.querySelector('#telegramImageInput');
  if (input) input.value = '';
}

function setTelegramListingImage(files) {
  const file = files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('NFT uchun faqat rasm tanlang.');
    return;
  }

  if (file.size > state.config.maxImageBytes) {
    showToast(`${file.name} juda katta. Limit: ${sizeLabel(state.config.maxImageBytes)}.`);
    return;
  }

  clearTelegramListingImage();
  const url = URL.createObjectURL(file);
  objectUrls.add(url);
  state.telegramImage = {
    id: uid(),
    file,
    type: 'image',
    url
  };
  renderTelegramImagePreview();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result || '')));
    reader.addEventListener('error', () => reject(new Error('Rasm o\'qilmadi.')));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Rasm ochilmadi.')));
    image.src = src;
  });
}

async function profileImageToDataUrl(file) {
  if (!file.type.startsWith('image/')) throw new Error('Logo uchun faqat rasm tanlang.');
  if (file.size > state.config.maxImageBytes) throw new Error(`${file.name} juda katta. Limit: ${sizeLabel(state.config.maxImageBytes)}.`);

  const raw = await readFileAsDataUrl(file);
  const image = await loadImage(raw);
  const size = Math.min(320, image.naturalWidth || 320, image.naturalHeight || 320);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
  const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
  return canvas.toDataURL('image/webp', 0.82);
}

async function setProfileAvatar(files) {
  const file = files?.[0];
  if (!file) return;

  try {
    state.profileAvatarDraft = await profileImageToDataUrl(file);
    render();
  } catch (error) {
    showToast(error.message);
  }
}

function parsePrice(value) {
  return Number(String(value || '').replace(/[^\d]/g, ''));
}

function formatPriceField(input) {
  const formatted = formatNumberInput(input.value);
  input.value = formatted;
}

function setFormBusy(isBusy, message = '') {
  const form = document.querySelector('#sellForm');
  if (!form) return;

  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('#formStatus');
  if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent;

  form.classList.toggle('is-busy', isBusy);
  button.disabled = isBusy;
  button.textContent = isBusy ? "Ma'lumotlar yuklanmoqda..." : button.dataset.idleLabel;
  status.textContent = message;
}

function setTelegramFormBusy(isBusy, message = '') {
  const form = document.querySelector('#telegramListingForm');
  if (!form) return;

  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('#telegramFormStatus');
  if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent;

  form.classList.toggle('is-busy', isBusy);
  button.disabled = isBusy;
  button.textContent = isBusy ? "Ma'lumotlar yuklanmoqda..." : button.dataset.idleLabel;
  status.textContent = message;
}

async function uploadMediaFile(item, index, total, setBusy = setFormBusy, label = 'Media yuklanmoqda') {
  setBusy(true, `${label}: ${index}/${total}`);

  const signed = await api('/api/upload-url', {
    method: 'POST',
    body: {
      fileName: item.file.name,
      contentType: item.file.type,
      size: item.file.size
    }
  });

  const form = new FormData();
  form.append('cacheControl', '3600');
  form.append('', item.file);

  const upload = await fetch(signed.signedUrl, {
    method: 'PUT',
    headers: {
      'x-upsert': 'false'
    },
    body: form
  });

  if (!upload.ok) {
    throw new Error(`Media yuklashda xatolik: ${item.file.name}`);
  }

  return {
    url: signed.publicUrl,
    path: signed.path,
    type: signed.type,
    name: item.file.name
  };
}

async function uploadMediaFiles(files, setBusy = setFormBusy, label = 'Media yuklanmoqda') {
  const media = [];
  let uploadedCount = 0;
  let cursor = 0;
  const workers = Array.from({ length: Math.min(3, files.length) }, async () => {
    while (cursor < files.length) {
      const index = cursor;
      cursor += 1;
      const uploaded = await uploadMediaFile(files[index], index + 1, files.length, setBusy, label);
      media[index] = uploaded;
      uploadedCount += 1;
      setBusy(true, `${label}: ${uploadedCount}/${files.length}`);
    }
  });

  await Promise.all(workers);
  return media.filter(Boolean);
}

async function submitSale(event) {
  event.preventDefault();
  const form = event.target?.closest?.('#sellForm');
  if (!(form instanceof HTMLFormElement)) return;
  let formData = new FormData(form);
  const platformSlug = String(formData.get('platformSlug') || '');
  const accountIdRaw = String(formData.get('accountIdRaw') || '').trim();
  const price = parsePrice(formData.get('price'));

  if (!platformSlug) {
    showToast('Avval platformani tanlang.');
    return;
  }

  if (platformSlug === 'mobile-legends' && !accountIdRaw) {
    showToast('Mobile Legends uchun akkaunt ID kiriting.');
    form.elements.accountIdRaw.focus();
    return;
  }

  if (!price || price <= 0) {
    showToast("Narx kiritilmasa, akkaunt sotuvga qo'yilmaydi.");
    form.elements.price.focus();
    return;
  }

  try {
    setFormBusy(true, 'Tekshirilmoqda...');

    if (platformSlug === 'mobile-legends' && !form.elements.accountGameId.value) {
      setFormBusy(false, '');
      await lookupAccount();
      if (!form.elements.accountGameId.value) return;
      formData = new FormData(form);
      setFormBusy(true, 'Tekshirilmoqda...');
    }

    const media = await uploadMediaFiles(state.pendingFiles);

    setFormBusy(true, "Sotuvga qo'yilmoqda...");
    const payload = await api('/api/accounts', {
      method: 'POST',
      body: {
        title: formData.get('title'),
        description: formData.get('description'),
        price,
        platformSlug: formData.get('platformSlug'),
        accountIdRaw: formData.get('accountIdRaw'),
        accountGameId: formData.get('accountGameId'),
        accountServerId: formData.get('accountServerId'),
        accountNickname: formData.get('accountNickname'),
        accountRegion: formData.get('accountRegion'),
        media
      }
    });

    state.pendingFiles.forEach((item) => {
      URL.revokeObjectURL(item.url);
      objectUrls.delete(item.url);
    });
    state.pendingFiles = [];
    form.reset();
    showToast("Akkaunt sotuvga qo'yildi.");

    withRenderTransition(() => {
      state.selectedAccount = payload.account;
      state.accounts = [payload.account, ...state.accounts];
      state.route = 'detail';
      state.tab = 'home';
      render();
    });
  } catch (error) {
    setFormBusy(false, '');
    showToast(error.message);
  }
}

async function submitTelegramListing(event) {
  event.preventDefault();
  const form = event.target?.closest?.('#telegramListingForm');
  if (!(form instanceof HTMLFormElement)) return;

  const formData = new FormData(form);
  const listingType = String(formData.get('listingType') || state.telegramSection);
  const listingLink = String(formData.get('listingLink') || '').trim();
  const price = parsePrice(formData.get('price'));

  if (!listingLink) {
    showToast('Link yoki username kiriting.');
    form.elements.listingLink.focus();
    return;
  }

  if (!price || price <= 0) {
    showToast("Narx kiritilmasa, e'lon sotuvga qo'yilmaydi.");
    form.elements.price.focus();
    return;
  }

  try {
    const media = state.telegramImage
      ? await uploadMediaFiles([state.telegramImage], setTelegramFormBusy, 'NFT rasmi yuklanmoqda')
      : [];

    setTelegramFormBusy(true, "Sotuvga qo'yilmoqda...");
    const payload = await api('/api/accounts', {
      method: 'POST',
      body: {
        platformSlug: 'telegram',
        listingType,
        listingLink,
        price,
        media
      }
    });

    state.telegramListings = {
      ...state.telegramListings,
      [listingType]: [payload.account, ...(state.telegramListings[listingType] || [])]
    };
    state.telegramFormOpen = false;
    clearTelegramListingImage();
    form.reset();
    showToast("E'lon sotuvga qo'yildi.");
    render();
  } catch (error) {
    setTelegramFormBusy(false, '');
    showToast(error.message);
  }
}

async function submitProfileEdit(event) {
  event.preventDefault();
  const form = event.target?.closest?.('#profileEditForm');
  if (!(form instanceof HTMLFormElement)) return;

  const formData = new FormData(form);
  const status = form.querySelector('#profileEditStatus');
  const button = form.querySelector('button[type="submit"]');

  try {
    button.disabled = true;
    status.textContent = 'Profil saqlanmoqda...';
    const payload = await api('/api/me', {
      method: 'PUT',
      body: {
        displayName: formData.get('displayName'),
        avatarUrl: formData.get('avatarUrl')
      }
    });
    state.me = payload;
    state.profileEditorOpen = false;
    state.profileAvatarDraft = '';
    showToast('Profil yangilandi.');
    render();
  } catch (error) {
    status.textContent = '';
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
}

async function submitAdminSettings(event) {
  event.preventDefault();
  const form = event.target?.closest?.('#adminSettingsForm');
  if (!(form instanceof HTMLFormElement)) return;

  const status = form.querySelector('#adminSettingsStatus');
  const button = form.querySelector('button[type="submit"]');

  try {
    button.disabled = true;
    status.textContent = 'Sozlamalar saqlanmoqda...';
    const payload = await api('/api/settings', {
      method: 'PUT',
      body: {
        telegramGroupUrl: form.elements.telegramGroupUrl.value,
        sellingEnabled: form.elements.sellingEnabled.checked,
        telegramListingsEnabled: form.elements.telegramListingsEnabled.checked,
        friendsEnabled: form.elements.friendsEnabled.checked,
        notificationsEnabled: form.elements.notificationsEnabled.checked
      }
    });
    state.config = { ...state.config, ...payload };
    showToast('Sozlamalar saqlandi.');
    render();
  } catch (error) {
    status.textContent = '';
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
}

async function submitAdmin(event) {
  event.preventDefault();
  const form = event.target?.closest?.('#adminForm');
  if (!(form instanceof HTMLFormElement)) return;

  const formData = new FormData(form);
  const status = form.querySelector('#adminFormStatus');
  const button = form.querySelector('button[type="submit"]');

  try {
    button.disabled = true;
    status.textContent = 'Admin qo\'shilmoqda...';
    await api('/api/admins', {
      method: 'POST',
      body: {
        tgUserId: formData.get('tgUserId'),
        username: formData.get('username')
      }
    });
    form.reset();
    showToast('Admin qo\'shildi.');
    await loadAdmins();
  } catch (error) {
    status.textContent = '';
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
}

async function deleteAdmin(id) {
  if (!id) return;
  try {
    await api(`/api/admins?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    state.admins.items = state.admins.items.filter((admin) => admin.id !== id);
    showToast('Admin o\'chirildi.');
    render();
  } catch (error) {
    showToast(error.message);
  }
}

async function togglePlatformStatus(slug, isActive) {
  try {
    await api('/api/platforms', {
      method: 'PATCH',
      body: {
        slug,
        isActive
      }
    });
    state.adminPlatforms.items = state.adminPlatforms.items.map((platform) =>
      platform.slug === slug ? { ...platform, is_active: isActive } : platform
    );
    await loadPlatforms();
    showToast(isActive ? 'Platforma yoqildi.' : 'Platforma userlardan yashirildi.');
    render();
  } catch (error) {
    showToast(error.message);
    await loadAdminPlatforms();
  }
}

async function openAdminPanel() {
  withRenderTransition(() => {
    state.route = 'admin';
    state.tab = 'profile';
    state.profileEditorOpen = false;
    state.profileAvatarDraft = '';
    render();
  });
  await Promise.all([loadConfig(), loadAdminPlatforms(), loadAdmins()]);
}

async function openPlatformManager() {
  if (!isAdmin()) {
    switchTab('home');
    return;
  }

  withRenderTransition(() => {
    state.route = 'platform-admin';
    state.tab = 'profile';
    state.profileEditorOpen = false;
    state.profileAvatarDraft = '';
    render();
  });
  await loadAdminPlatforms();
}

function openTelegramTarget(raw) {
  const value = String(raw || '').trim();
  if (!value) {
    showToast('Telegram guruh hali admin panelda biriktirilmagan.');
    return;
  }

  const clean = value.replace(/^@/, '');
  const httpsLink = /^https?:\/\//i.test(value)
    ? value
    : /^t\.me\//i.test(clean)
      ? `https://${clean}`
      : `https://t.me/${clean}`;

  if (tg?.openTelegramLink) {
    tg.openTelegramLink(httpsLink);
    return;
  }

  window.open(httpsLink, '_blank', 'noopener,noreferrer');
}

async function openAdminWithText(text, toastMessage = 'Xabar matni tayyor. Chat ochilmoqda.') {
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    // Clipboard is a convenience fallback only.
  }

  showToast(toastMessage);
  const admin = state.config.adminUsername.replace(/^@/, '');
  const httpsLink = `https://t.me/${admin}?text=${encodeURIComponent(text)}`;
  const tgLink = `tg://resolve?domain=${admin}&text=${encodeURIComponent(text)}`;

  if (tg?.openTelegramLink) {
    tg.openTelegramLink(httpsLink);
    return;
  }

  window.location.href = tgLink;
  window.setTimeout(() => {
    window.open(`https://t.me/${admin}`, '_blank', 'noopener,noreferrer');
  }, 450);
}

async function handleBuy() {
  const account = state.selectedAccount;
  if (!account) return;

  if (account.status === 'sold') {
    showToast('Bu akkaunt sotilgan.');
    return;
  }

  await openAdminWithText(buyText(account));
}

function findTelegramListing(id) {
  return Object.values(state.telegramListings)
    .flat()
    .find((listing) => listing.id === id) || null;
}

function openTelegramProfile(username) {
  const clean = String(username || '').replace(/^@/, '').trim();
  if (!clean) {
    showToast('Sotuvchi username topilmadi.');
    return;
  }

  const httpsLink = `https://t.me/${clean}`;
  const tgLink = `tg://resolve?domain=${clean}`;

  if (tg?.openTelegramLink) {
    tg.openTelegramLink(httpsLink);
    return;
  }

  window.location.href = tgLink;
  window.setTimeout(() => {
    window.open(httpsLink, '_blank', 'noopener,noreferrer');
  }, 450);
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadHistory() {
  const accounts = filteredHistoryAccounts();
  if (!accounts.length) {
    showToast('Yuklab olish uchun tarix topilmadi.');
    return;
  }

  const rows = [
    ['Sana', 'Vaqt', 'Nomi', 'Status', 'Narx'],
    ...accounts.map((account) => [
      historyDate(account),
      historyTime(account),
      account.title,
      account.status === 'sold' ? 'Sotilgan' : 'Sotuvda',
      account.price_uzs
    ])
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tarix-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function handleTelegramListingBuy(id) {
  const listing = findTelegramListing(id);
  if (!listing) return;

  try {
    const contact = await api(`/api/seller-contact?id=${encodeURIComponent(id)}`);
    openTelegramProfile(contact.username);
  } catch (error) {
    showToast(error.message);
  }
}

function openPreview(index) {
  const account = state.selectedAccount;
  const media = account?.media?.[Number(index)];
  if (!media?.url) return;

  state.lightbox = {
    url: media.url,
    type: media.type
  };
  render();
}

app.addEventListener('click', async (event) => {
  const control = event.target.closest('[data-action]');
  if (!control) return;

  const action = control.dataset.action;

  if (action === 'open-platform') await openPlatform(control.dataset.slug);
  if (action === 'open-account') openAccount(control.dataset.id);
  if (action === 'open-history-account') openAccount(control.dataset.id);
  if (action === 'set-account-status') await setAccountStatus(control.dataset.status);
  if (action === 'set-history-filter') {
    state.history.filter = control.dataset.filter || 'all';
    render();
  }
  if (action === 'download-history') downloadHistory();
  if (action === 'set-telegram-section') setTelegramSection(control.dataset.section);
  if (action === 'toggle-telegram-form') toggleTelegramForm();
  if (action === 'profile-edit') {
    state.profileEditorOpen = true;
    state.profileAvatarDraft = '';
    render();
  }
  if (action === 'cancel-profile-edit') {
    state.profileEditorOpen = false;
    state.profileAvatarDraft = '';
    render();
  }
  if (action === 'open-telegram-community') openTelegramTarget(state.config.telegramGroupUrl);
  if (action === 'open-platform-manager') await openPlatformManager();
  if (action === 'toggle-platform-status') await togglePlatformStatus(control.dataset.slug, control.checked);
  if (action === 'usd-rate-info') showToast('USD kurs bo\'limi tez kunda qo\'shiladi.');
  if (action === 'open-admin') await openAdminPanel();
  if (action === 'select-sale-platform') setSalePlatform(control.dataset.slug);
  if (action === 'lookup-account') await lookupAccount();
  if (action === 'back') goBack();
  if (action === 'refresh') await refreshCurrent();
  if (action === 'tab-store') switchTab('home');
  if (action === 'tab-sell') switchTab('sell');
  if (action === 'tab-history') switchTab('history');
  if (action === 'tab-profile') switchTab('profile');
  if (action === 'delete-admin') await deleteAdmin(control.dataset.id);
  if (action === 'remove-file') removePendingFile(control.dataset.id);
  if (action === 'remove-telegram-image') {
    clearTelegramListingImage();
    renderTelegramImagePreview();
  }
  if (action === 'buy-account') await handleBuy();
  if (action === 'buy-telegram-listing') await handleTelegramListingBuy(control.dataset.id);
  if (action === 'preview-media') openPreview(control.dataset.index);
  if (action === 'close-lightbox') {
    state.lightbox = null;
    render();
  }
});

app.addEventListener('change', (event) => {
  if (event.target.id === 'mediaInput') {
    addPendingFiles(event.target.files || []);
  }

  if (event.target.id === 'telegramImageInput') {
    setTelegramListingImage(event.target.files || []);
  }

  if (event.target.id === 'profileAvatarInput') {
    setProfileAvatar(event.target.files || []);
  }
});

app.addEventListener('input', (event) => {
  if (event.target.matches('input[name="price"]')) {
    formatPriceField(event.target);
  }
});

app.addEventListener('submit', (event) => {
  if (event.target.id === 'sellForm') {
    submitSale(event);
  }

  if (event.target.id === 'telegramListingForm') {
    submitTelegramListing(event);
  }

  if (event.target.id === 'profileEditForm') {
    submitProfileEdit(event);
  }

  if (event.target.id === 'adminSettingsForm') {
    submitAdminSettings(event);
  }

  if (event.target.id === 'adminForm') {
    submitAdmin(event);
  }
});

window.addEventListener('beforeunload', () => {
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
});

window.addEventListener('focusin', (event) => {
  if (event.target.matches('input, textarea, select')) {
    document.body.classList.add('keyboard-open');
  }
});

window.addEventListener('focusout', () => {
  window.clearTimeout(window.__keyboardCloseTimer);
  window.__keyboardCloseTimer = window.setTimeout(() => {
    if (!document.activeElement?.matches?.('input, textarea, select')) {
      document.body.classList.remove('keyboard-open');
    }
  }, 120);
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setTelegramChrome);

setTelegramChrome();
render();
await Promise.all([loadConfig(), loadMe(), loadPlatforms()]);
