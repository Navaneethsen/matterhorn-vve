import { initShell, onLanguageChange, formatDate, fetchText, escapeHtml, renderMarkdown } from './shell.mjs';
import { parseDatedItems } from './content-md.mjs';

const COPY = {
  nl: {
    upcoming: 'Komende activiteiten',
    past: 'Eerdere activiteiten',
    empty: 'Er zijn op dit moment geen geplande activiteiten. Houd deze pagina in de gaten.',
    loadError: 'De agenda kon niet worden geladen. Probeer het zo opnieuw.'
  },
  en: {
    upcoming: 'Upcoming activities',
    past: 'Past activities',
    empty: 'There are no planned activities at the moment. Keep an eye on this page.',
    loadError: 'The calendar could not be loaded. Please try again shortly.'
  }
};

const state = { lang: 'nl', cache: new Map(), error: false };

const { lang } = initShell({ active: 'events' });
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
      state.cache.set(lang, parseDatedItems(await fetchText(`./content/${lang}/events.md`)));
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
  const mount = document.querySelector('[data-events]');
  if (!mount) {
    return;
  }

  const copy = COPY[state.lang];
  const data = state.cache.get(state.lang);
  const today = new Date().toISOString().slice(0, 10);
  const items = data?.items ?? [];

  const upcoming = items
    .filter((item) => !item.date || item.date >= today)
    .sort((a, b) => String(a.date ?? '9999').localeCompare(String(b.date ?? '9999')));
  const past = items
    .filter((item) => item.date && item.date < today)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const parts = [];

  parts.push(`<header class="page-hero" data-tone="info">`);
  parts.push(`<h1>${escapeHtml(data?.title ?? 'Agenda')}</h1>`);
  if (data?.intro) {
    parts.push(`<p>${escapeHtml(data.intro)}</p>`);
  }
  parts.push(`</header>`);

  if (state.error || !data) {
    parts.push(`<p class="empty-state">${copy.loadError}</p>`);
  } else {
    parts.push(`<section class="home-panel" aria-labelledby="upcoming-events">`);
    parts.push(`<h2 id="upcoming-events" class="panel-title">${copy.upcoming}</h2>`);
    if (upcoming.length === 0) {
      parts.push(`<p class="empty-state">${copy.empty}</p>`);
    } else {
      parts.push(`<div class="event-list">${upcoming.map((item) => renderEvent(item, false)).join('')}</div>`);
    }
    parts.push(`</section>`);

    if (past.length > 0) {
      parts.push(`<section class="home-panel" aria-labelledby="past-events">`);
      parts.push(`<h2 id="past-events" class="panel-title">${copy.past}</h2>`);
      parts.push(`<div class="event-list">${past.map((item) => renderEvent(item, true)).join('')}</div>`);
      parts.push(`</section>`);
    }
  }

  mount.innerHTML = parts.join('');
}

function renderEvent(item, isPast) {
  const dateText = item.date ? formatDate(item.date, state.lang) : item.dateLabel ?? '';

  return [
    `<article class="event-item${isPast ? ' is-past' : ''}">`,
    `<div class="event-date">${escapeHtml(dateText)}</div>`,
    `<div class="event-body">`,
    `<h3>${escapeHtml(item.title)}</h3>`,
    item.meta ? `<p class="event-location">📍 ${escapeHtml(item.meta)}</p>` : '',
    `<div class="card-prose">${renderMarkdown(item.body)}</div>`,
    `</div>`,
    `</article>`
  ].join('');
}
