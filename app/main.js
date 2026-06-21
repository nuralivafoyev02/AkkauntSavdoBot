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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatPrice(value) {
  return `${new Intl.NumberFormat('uz-UZ').format(Number(value || 0))} so'm`;
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

async function loadAccounts(platformSlug) {
  state.loading = true;
  state.error = '';
  state.accounts = [];
  render();

  try {
    const payload = await api(`/api/accounts?platform=${encodeURIComponent(platformSlug)}`);
    state.accounts = payload.accounts || [];
    state.demo = Boolean(payload.demo);
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
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
  if (state.route === 'accounts') return state.selectedPlatform?.title || 'Akkauntlar';
  return "Akkauntlar do'koni";
}

function renderHeader() {
  const canGoBack = state.route === 'accounts' || state.route === 'detail';
  const subtitle = state.route === 'platforms' ? 'Platformani tanlang' : 'Geto Senpai Shop';

  return `
    <header class="topbar">
      <button class="icon-button ${canGoBack ? '' : 'is-hidden'}" type="button" data-action="back" aria-label="Orqaga">
        <span aria-hidden="true">‹</span>
      </button>
      <div class="brand-block">
        <p>${escapeHtml(subtitle)}</p>
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
          ? `<img src="${escapeHtml(platform.image_url)}" alt="${escapeHtml(platform.title)}" loading="lazy" />`
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
    <section class="intro-strip">
      <div>
        <span class="status-dot"></span>
        <strong>Live market</strong>
      </div>
      <p>${state.platforms.reduce((total, item) => total + Number(item.count || 0), 0)} ta aktiv akkaunt</p>
    </section>

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
  return Array.isArray(account.media) ? account.media[0] : null;
}

function renderAccountCover(account) {
  const media = firstMedia(account);
  const badge = account.is_new ? 'NEW' : account.is_top ? 'TOP' : '';

  return `
    <div class="account-cover">
      ${
        media?.url
          ? media.type === 'video'
            ? `<video src="${escapeHtml(media.url)}" muted playsinline preload="metadata"></video>`
            : `<img src="${escapeHtml(media.url)}" alt="${escapeHtml(account.title)}" loading="lazy" />`
          : renderGeneratedCover(account)
      }
      ${badge ? `<span class="corner-badge ${account.is_new ? 'is-new' : ''}">${badge}</span>` : ''}
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

function renderAccounts() {
  if (state.loading) return renderSkeletonGrid('account');
  if (state.error) return renderError();

  const empty = `
    <div class="empty-state">
      <strong>Hali akkaunt yo'q</strong>
      <p>Bu platformaga birinchi akkauntni siz qo'shishingiz mumkin.</p>
      <button class="primary-button" type="button" data-action="tab-sell">Akkaunt sotish</button>
    </div>
  `;

  return `
    <section class="list-toolbar">
      <button class="chip-button" type="button" data-action="back">Platformalar</button>
      <span>${state.accounts.length} ta variant</span>
    </section>

    ${
      state.accounts.length
        ? `<section class="account-grid">
            ${state.accounts
              .map(
                (account, index) => `
                  <button class="account-card" type="button" data-action="open-account" data-id="${escapeHtml(account.id)}" style="--delay:${index * 35}ms">
                    ${renderAccountCover(account)}
                    <span>${escapeHtml(account.title)}</span>
                    ${accountMetaLine(account) ? `<small>${escapeHtml(accountMetaLine(account))}</small>` : ''}
                    <strong>${formatPrice(account.price_uzs)}</strong>
                  </button>
                `
              )
              .join('')}
          </section>`
        : empty
    }
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
          <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.name || account.title)}" loading="lazy" />
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

  return `
    <article class="detail-view">
      <section class="detail-gallery">
        ${renderMediaDetail(account)}
      </section>

      <section class="detail-info">
        <div class="detail-title-row">
          <span class="corner-badge ${account.is_new ? 'is-new' : ''}">${account.is_new ? 'NEW' : account.is_top ? 'TOP' : 'SHOP'}</span>
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

      <button class="buy-button" type="button" data-action="buy-account">Sotib olish</button>
    </article>
  `;
}

function renderSell() {
  const selectedSlug = state.saleDraft.platformSlug;
  const selectedPlatform = state.platforms.find((platform) => platform.slug === selectedSlug);

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
        ${state.platforms
          .map(
            (platform) => `
              <button class="${platform.slug === selectedSlug ? 'selected' : ''}" type="button" data-action="select-sale-platform" data-slug="${escapeHtml(platform.slug)}">
                <span style="--accent:${escapeHtml(platform.accent_color || '#ff5a1f')}">
                  ${
                    platform.image_url
                      ? `<img src="${escapeHtml(platform.image_url)}" alt="" loading="lazy" />`
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
              : `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.file.name)}" />`
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

  withRenderTransition(() => {
    state.selectedPlatform = platform;
    state.route = 'accounts';
    state.tab = 'store';
  });
  await loadAccounts(slug);
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
      state.route = 'platforms';
      state.selectedPlatform = null;
      state.accounts = [];
      render();
    });
  }
}

async function refreshCurrent() {
  if (state.route === 'accounts' && state.selectedPlatform) {
    await loadAccounts(state.selectedPlatform.slug);
    return;
  }

  await loadPlatforms();
}

function switchTab(tab) {
  const platformSlug = tab === 'sell' ? state.selectedPlatform?.slug || state.saleDraft.platformSlug || 'mobile-legends' : 'mobile-legends';
  withRenderTransition(() => {
    state.tab = tab;
    state.route = tab === 'sell' ? 'sell' : 'platforms';
    state.selectedAccount = null;
    state.selectedPlatform = tab === 'sell' ? state.selectedPlatform : null;
    state.saleDraft.platformSlug = platformSlug;
    state.saleDraft.lookup = null;
    state.accounts = [];
    render();
  });
}

function setSalePlatform(slug) {
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

function setFormBusy(isBusy, message = '') {
  const form = document.querySelector('#sellForm');
  if (!form) return;

  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('#formStatus');
  form.classList.toggle('is-busy', isBusy);
  button.disabled = isBusy;
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

async function submitSale(event) {
  event.preventDefault();
  const form = event.currentTarget;
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

    const media = [];

    for (let index = 0; index < state.pendingFiles.length; index += 1) {
      const uploaded = await uploadMediaFile(state.pendingFiles[index], index + 1, state.pendingFiles.length);
      media.push(uploaded);
    }

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

async function handleBuy() {
  const account = state.selectedAccount;
  if (!account) return;

  const text = buyText(account);
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    // Clipboard is a convenience fallback only.
  }

  showToast('Xabar matni tayyor. Chat ochilmoqda.');
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
  if (action === 'select-sale-platform') setSalePlatform(control.dataset.slug);
  if (action === 'lookup-account') await lookupAccount();
  if (action === 'back') goBack();
  if (action === 'refresh') await refreshCurrent();
  if (action === 'tab-store') switchTab('store');
  if (action === 'tab-sell') switchTab('sell');
  if (action === 'remove-file') removePendingFile(control.dataset.id);
  if (action === 'buy-account') await handleBuy();
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

app.addEventListener('submit', (event) => {
  if (event.target.id === 'sellForm') {
    submitSale(event);
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
await loadConfig();
await loadPlatforms();
