import './styles.css';

const app = document.querySelector('#app');
const tg = window.Telegram?.WebApp;

const state = {
  tab: 'store',
  route: 'platforms',
  loading: true,
  error: '',
  demo: false,
  platforms: [],
  accounts: [],
  telegramListings: {
    nft: [],
    username: []
  },
  telegramLoading: false,
  telegramError: '',
  telegramFormOpen: false,
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
  if (state.route === 'detail') return state.selectedAccount?.title || 'Akkaunt';
  if (state.route === 'telegram') return state.selectedPlatform?.title || 'Telegram';
  if (state.route === 'accounts') return state.selectedPlatform?.title || 'Akkauntlar';
  return "Akkauntlar do'koni";
}

function renderHeader() {
  const canGoBack = state.route === 'accounts' || state.route === 'detail' || state.route === 'telegram';
  const subtitle =
    state.route === 'platforms'
      ? 'Platformani tanlang'
      : state.route === 'sell'
        ? 'Sotuvchi paneli'
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
        <span aria-hidden="true">‹</span>
      </button>
      <div class="brand-block">
        <span class="brand-kicker">${escapeHtml(subtitle)}</span>
        <h1>${escapeHtml(headerTitle())}</h1>
      </div>
      <button class="icon-button" type="button" data-action="refresh" aria-label="Yangilash">
        <span aria-hidden="true">↻</span>
      </button>
    </header>
  `;
}

function renderPlatformVisual(platform) {
  const label = initials(platform.title);
  return `
    <div class="platform-visual" style="--accent:${escapeHtml(platform.accent_color || '#ff5a1f')}">
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
          <button type="button" data-action="remove-file" data-id="${escapeHtml(item.id)}" aria-label="O'chirish">×</button>
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
        <button class="primary-button" type="button" data-action="toggle-telegram-form">Sotish</button>
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
    </section>
  `;
}

function renderTelegramListingForm(activeKey, section) {
  return `
    <form class="telegram-listing-form" id="telegramListingForm">
      <input type="hidden" name="listingType" value="${escapeHtml(activeKey)}" />
      <label>
        <span>${escapeHtml(section.linkLabel)}</span>
        <input name="listingLink" type="text" maxlength="220" autocomplete="off" required placeholder="${escapeHtml(section.placeholder)}" />
      </label>
      <label>
        <span>Narx</span>
        <input name="price" type="text" inputmode="numeric" required placeholder="1 000 000" />
      </label>
      <p class="form-status" id="telegramFormStatus"></p>
      <button class="primary-button" type="submit">Sotuvga qo'yish</button>
    </form>
  `;
}

function renderTelegramListingCard(listing, section) {
  const seller = listing.seller_username ? `@${String(listing.seller_username).replace(/^@/, '')}` : listing.seller_name || 'Sotuvchi';
  return `
    <article class="telegram-listing-card" style="--accent:${escapeHtml(section.accent)}">
      <div class="telegram-listing-main">
        <span>${escapeHtml(section.label)}</span>
        <strong>${escapeHtml(listing.title)}</strong>
        <small>${escapeHtml(seller)}</small>
      </div>
      <div class="telegram-listing-side">
        <b>${formatPrice(listing.price_uzs)}</b>
        <button type="button" data-action="buy-telegram-listing" data-id="${escapeHtml(listing.id)}">Sotib olish</button>
      </div>
    </article>
  `;
}

function renderBottomNav() {
  return `
    <nav class="bottom-nav" aria-label="Asosiy">
      <button class="${state.tab === 'store' ? 'active' : ''}" type="button" data-action="tab-store">
        <span aria-hidden="true">⌂</span>
        <strong>Do'kon</strong>
      </button>
      <button class="${state.tab === 'sell' ? 'active' : ''}" type="button" data-action="tab-sell">
        <span aria-hidden="true">⇧</span>
        <strong>Sotish</strong>
      </button>
    </nav>
  `;
}

function renderLightbox() {
  if (!state.lightbox) return '';
  const { url, type } = state.lightbox;

  return `
    <div class="lightbox" data-action="close-lightbox">
      <button type="button" data-action="close-lightbox" aria-label="Yopish">×</button>
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
  return state.accounts.find((account) => account.id === id) || null;
}

async function openPlatform(slug) {
  const platform = findPlatform(slug);
  if (!platform) return;

  if (isServicePlatform(slug)) {
    withRenderTransition(() => {
      cancelAccountLoads();
      state.selectedPlatform = platform;
      state.selectedAccount = null;
      state.accounts = [];
      state.route = 'telegram';
      state.tab = 'store';
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
    state.tab = 'store';
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
    state.tab = 'store';
    render();
  });
}

function goBack() {
  if (state.route === 'detail') {
    withRenderTransition(() => {
      state.route = 'accounts';
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
    withRenderTransition(() => {
      cancelAccountLoads();
      state.route = 'platforms';
      state.selectedPlatform = null;
      state.loading = false;
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

  await loadPlatforms();
}

function switchTab(tab) {
  const currentPlatformSlug = state.selectedPlatform?.slug;
  const platformSlug =
    tab === 'sell'
      ? currentPlatformSlug && !isServicePlatform(currentPlatformSlug)
        ? currentPlatformSlug
        : state.saleDraft.platformSlug || 'mobile-legends'
      : state.saleDraft.platformSlug || 'mobile-legends';

  withRenderTransition(() => {
    cancelAccountLoads();
    state.tab = tab;
    state.route = tab === 'sell' ? 'sell' : 'platforms';
    state.selectedAccount = null;
    state.selectedPlatform = null;
    state.saleDraft.platformSlug = isServicePlatform(platformSlug) ? 'mobile-legends' : platformSlug;
    state.saleDraft.lookup = null;
    state.accountStatus = 'available';
    state.accounts = [];
    state.loading = false;
    render();
  });
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

  withRenderTransition(() => {
    state.telegramSection = section;
    state.telegramFormOpen = false;
    render();
  });
  loadTelegramListings(section);
}

function toggleTelegramForm() {
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

async function uploadMediaFile(item, index, total) {
  setFormBusy(true, `Media yuklanmoqda: ${index}/${total}`);

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

async function uploadMediaFiles(files) {
  const media = [];
  let uploadedCount = 0;
  let cursor = 0;
  const workers = Array.from({ length: Math.min(3, files.length) }, async () => {
    while (cursor < files.length) {
      const index = cursor;
      cursor += 1;
      const uploaded = await uploadMediaFile(files[index], index + 1, files.length);
      media[index] = uploaded;
      uploadedCount += 1;
      setFormBusy(true, `Media yuklanmoqda: ${uploadedCount}/${files.length}`);
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
      state.tab = 'store';
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
    setTelegramFormBusy(true, "Sotuvga qo'yilmoqda...");
    const payload = await api('/api/accounts', {
      method: 'POST',
      body: {
        platformSlug: 'telegram',
        listingType,
        listingLink,
        price
      }
    });

    state.telegramListings = {
      ...state.telegramListings,
      [listingType]: [payload.account, ...(state.telegramListings[listingType] || [])]
    };
    state.telegramFormOpen = false;
    form.reset();
    showToast("E'lon sotuvga qo'yildi.");
    render();
  } catch (error) {
    setTelegramFormBusy(false, '');
    showToast(error.message);
  }
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

function handleTelegramListingBuy(id) {
  const listing = findTelegramListing(id);
  if (!listing) return;
  openTelegramProfile(listing.seller_username);
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
  if (action === 'set-account-status') await setAccountStatus(control.dataset.status);
  if (action === 'set-telegram-section') setTelegramSection(control.dataset.section);
  if (action === 'toggle-telegram-form') toggleTelegramForm();
  if (action === 'select-sale-platform') setSalePlatform(control.dataset.slug);
  if (action === 'lookup-account') await lookupAccount();
  if (action === 'back') goBack();
  if (action === 'refresh') await refreshCurrent();
  if (action === 'tab-store') switchTab('store');
  if (action === 'tab-sell') switchTab('sell');
  if (action === 'remove-file') removePendingFile(control.dataset.id);
  if (action === 'buy-account') await handleBuy();
  if (action === 'buy-telegram-listing') handleTelegramListingBuy(control.dataset.id);
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
await Promise.all([loadConfig(), loadPlatforms()]);
