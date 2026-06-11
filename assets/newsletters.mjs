import { initShell, onLanguageChange, formatDate, fetchText, escapeHtml } from './shell.mjs';
import { parsePage, parsePipeList, findSection } from './content-md.mjs';

const COPY = {
  nl: {
    empty: 'Er zijn nog geen nieuwsbrieven gepubliceerd. Zodra het bestuur een nieuwsbrief verstuurt, verschijnt deze hier.',
    open: 'Openen',
    loadError: 'De nieuwsbrieven konden niet worden geladen. Probeer het zo opnieuw.'
  },
  en: {
    empty: 'No newsletters have been published yet. As soon as the board sends one, it will appear here.',
    open: 'Open',
    loadError: 'The newsletters could not be loaded. Please try again shortly.'
  }
};

const state = { lang: 'nl', cache: new Map(), error: false };

const { lang } = initShell({ active: 'newsletters' });
state.lang = lang;

onLanguageChange((nextLang) => {
  state.lang = nextLang;
  void load();
});

void load();

async function load() {
  const lang = state.lang;

  if (!state.cache.has(lang)) {
    try {
      const page = parsePage(await fetchText(`./content/${lang}/newsletters.md`));
      const items = parsePipeList(findSection(page, 'items')?.body ?? '').map(
        ([date, title, url]) => ({ date, title: title ?? '', url: url ?? '' })
      );
      state.cache.set(lang, { page, items });
      state.error = false;
    } catch (error) {
      console.error(error);
      state.error = true;
    }
  }

  if (lang === state.lang) {
    render();
  }
}

function render() {
  const mount = document.querySelector('[data-newsletters]');
  if (!mount) {
    return;
  }

  const copy = COPY[state.lang];
  const data = state.cache.get(state.lang);
  const items = [...(data?.items ?? [])].sort((a, b) =>
    String(b.date ?? '').localeCompare(String(a.date ?? ''))
  );
  const parts = [];

  parts.push(`<header class="page-hero" data-tone="info">`);
  parts.push(`<h1>${escapeHtml(data?.page.title ?? 'Nieuwsbrieven')}</h1>`);
  if (data?.page.intro) {
    parts.push(`<p>${escapeHtml(data.page.intro)}</p>`);
  }
  parts.push(`</header>`);

  if (state.error || !data) {
    parts.push(`<p class="empty-state">${copy.loadError}</p>`);
  } else if (items.length === 0) {
    parts.push(`<p class="empty-state">${copy.empty}</p>`);
  } else {
    parts.push(`<div class="newsletter-list">`);
    items.forEach((item, index) => {
      parts.push(`<article class="newsletter-card" style="--stagger:${index}">`);
      parts.push(`<div class="newsletter-text">`);
      parts.push(`<h3>${escapeHtml(item.title)}</h3>`);
      if (item.date) {
        parts.push(`<time datetime="${escapeHtml(item.date)}">${formatDate(item.date, state.lang)}</time>`);
      }
      parts.push(`</div>`);
      parts.push(
        `<a class="btn btn-solid" href="./content/${escapeHtml(item.url)}" target="_blank" rel="noopener">${copy.open}</a>`
      );
      parts.push(`</article>`);
    });
    parts.push(`</div>`);
  }

  mount.innerHTML = parts.join('');
}
