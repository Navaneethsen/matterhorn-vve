/**
 * Shared site shell: sticky header with navigation + language switch,
 * footer, and small i18n/content helpers used by every page.
 *
 * Language is stored under the same key the rules app already used, so
 * existing visitors keep their preference. Pages subscribe to language
 * changes via onLanguageChange().
 */

export const LANGUAGE_STORAGE_KEY = 'vve.language';
const LANGUAGE_EVENT = 'vve:language';

export const NAV_ITEMS = [
  { id: 'home', href: './index.html', label: { nl: 'Home', en: 'Home' } },
  { id: 'rules', href: './rules.html', label: { nl: 'Huisregels', en: 'House rules' } },
  { id: 'events', href: './events.html', label: { nl: 'Agenda', en: 'Calendar' } },
  { id: 'gallery', href: './gallery.html', label: { nl: 'Galerij', en: 'Gallery' } },
  { id: 'board', href: './board.html', label: { nl: 'Bestuur & contact', en: 'Board & contact' } },
  { id: 'newsletters', href: './newsletters.html', label: { nl: 'Nieuwsbrieven', en: 'Newsletters' } }
];

const LOGO_ICON =
  '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="currentColor" opacity="0.12"/><path d="M5 23 12.5 9l4.3 8.1L19 13l8 10Z" fill="currentColor"/><path d="m12.5 9 2.1 4-2.1 2.4L10.4 13Z" fill="#ffffff" opacity="0.85"/></svg>';

export function getLanguage() {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'nl';
  } catch {
    return 'nl';
  }
}

export function setLanguage(lang) {
  const normalized = lang === 'en' ? 'en' : 'nl';

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  } catch {
    // Private browsing — preference just won't persist.
  }

  document.documentElement.lang = normalized;
  syncShellLanguage(normalized);
  window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: { lang: normalized } }));
}

export function onLanguageChange(callback) {
  window.addEventListener(LANGUAGE_EVENT, (event) => callback(event.detail.lang));
}

/** Pick a language variant from a {nl, en} object (plain strings pass through). */
export function pick(value, lang) {
  if (value && typeof value === 'object') {
    return value[lang] || value.nl || value.en || '';
  }

  return typeof value === 'string' ? value : '';
}

export function formatDate(isoDate, lang) {
  if (!isoDate) {
    return '';
  }

  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

export async function fetchText(url) {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Unable to load ${url} (${response.status})`);
  }

  return response.text();
}

export function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Render a markdown block via the self-hosted marked bundle. */
export function renderMarkdown(markdown) {
  if (typeof markdown !== 'string' || !markdown.trim()) {
    return '';
  }

  const parse = globalThis.window?.marked?.parse;
  if (typeof parse !== 'function') {
    // Marked not loaded on this page — fall back to escaped plain text.
    return `<p>${escapeHtml(markdown.trim())}</p>`;
  }

  return parse(markdown.trim(), { breaks: true });
}

export function initShell({ active } = {}) {
  const lang = getLanguage();
  document.documentElement.lang = lang;

  const headerMount = document.querySelector('[data-site-header]');
  if (headerMount) {
    headerMount.innerHTML = renderHeader(active);
    bindHeader(headerMount);
  }

  const footerMount = document.querySelector('[data-site-footer]');
  if (footerMount) {
    footerMount.innerHTML = renderFooter();
  }

  syncShellLanguage(lang);
  onLanguageChange(() => syncShellLanguage(getLanguage()));

  return { lang };
}

function renderHeader(active) {
  const navLinks = NAV_ITEMS.map((item) => {
    const isActive = item.id === active;
    return [
      `<a href="${item.href}" class="site-nav-link${isActive ? ' is-active' : ''}"${isActive ? ' aria-current="page"' : ''}>`,
      `<span data-i18n-nl="${escapeHtml(item.label.nl)}" data-i18n-en="${escapeHtml(item.label.en)}">${escapeHtml(item.label.nl)}</span>`,
      `</a>`
    ].join('');
  }).join('');

  return [
    `<div class="site-header-inner">`,
    `<a class="site-brand" href="./index.html">`,
    `<span class="site-brand-mark" aria-hidden="true">${LOGO_ICON}</span>`,
    `<span class="site-brand-text">`,
    `<span class="site-brand-name">VvE Matterhorn 2–48</span>`,
    `<span class="site-brand-sub">Amstelveen</span>`,
    `</span>`,
    `</a>`,
    `<nav class="site-nav" data-site-nav aria-label="Site">${navLinks}</nav>`,
    `<div class="site-header-actions">`,
    `<div class="lang-switch" role="group" aria-label="Taal / Language">`,
    `<button type="button" data-set-lang="nl" class="lang-btn" aria-pressed="false">NL</button>`,
    `<button type="button" data-set-lang="en" class="lang-btn" aria-pressed="false">EN</button>`,
    `</div>`,
    `<button type="button" class="menu-toggle" data-menu-toggle aria-expanded="false" aria-controls="site-menu" aria-label="Menu">`,
    `<span class="menu-toggle-bar"></span><span class="menu-toggle-bar"></span><span class="menu-toggle-bar"></span>`,
    `</button>`,
    `</div>`,
    `</div>`,
    `<div class="site-menu" id="site-menu" data-site-menu hidden>${navLinks}</div>`
  ].join('');
}

function renderFooter() {
  return [
    `<div class="site-footer-inner">`,
    `<div class="site-footer-col">`,
    `<p class="site-footer-title">VvE Matterhorn 2–48</p>`,
    `<p>Matterhorn 2–48 (even)<br>1186 EC Amstelveen</p>`,
    `</div>`,
    `<div class="site-footer-col">`,
    `<p class="site-footer-title" data-i18n-nl="Beheer" data-i18n-en="Management">Beheer</p>`,
    `<p>VvE Metea — Matthy van Rooijen<br><a href="https://www.vvemetea.nl" target="_blank" rel="noopener">vvemetea.nl</a></p>`,
    `</div>`,
    `<div class="site-footer-col">`,
    `<p class="site-footer-title" data-i18n-nl="Snel naar" data-i18n-en="Quick links">Snel naar</p>`,
    `<p>${NAV_ITEMS.slice(1)
      .map(
        (item) =>
          `<a href="${item.href}" data-i18n-nl="${escapeHtml(item.label.nl)}" data-i18n-en="${escapeHtml(item.label.en)}">${escapeHtml(item.label.nl)}</a>`
      )
      .join('<br>')}</p>`,
    `</div>`,
    `</div>`,
    `<p class="site-footer-note">VvE Matterhorn 2–48 · Amstelveen · <span data-i18n-nl="Bestuur 2026" data-i18n-en="Board 2026">Bestuur 2026</span></p>`
  ].join('');
}

function bindHeader(headerMount) {
  headerMount.addEventListener('click', (event) => {
    const langButton = event.target.closest('[data-set-lang]');
    if (langButton) {
      setLanguage(langButton.dataset.setLang);
      return;
    }

    const menuToggle = event.target.closest('[data-menu-toggle]');
    if (menuToggle) {
      const menu = headerMount.querySelector('[data-site-menu]');
      const isOpen = !menu.hidden;
      menu.hidden = isOpen;
      menuToggle.setAttribute('aria-expanded', String(!isOpen));
      menuToggle.classList.toggle('is-open', !isOpen);
    }
  });
}

/** Swap every [data-i18n-*] text node and lang-button state to the active language. */
function syncShellLanguage(lang) {
  document.querySelectorAll('[data-i18n-nl]').forEach((node) => {
    const text = lang === 'en' ? node.dataset.i18nEn : node.dataset.i18nNl;
    if (typeof text === 'string') {
      node.textContent = text;
    }
  });

  document.querySelectorAll('[data-set-lang]').forEach((button) => {
    const isActive = button.dataset.setLang === lang;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}
