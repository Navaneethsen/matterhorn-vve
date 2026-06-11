import { initShell, onLanguageChange, fetchText, escapeHtml, renderMarkdown } from './shell.mjs';
import { parsePage, parsePipeList, stripPipeList, findSection } from './content-md.mjs';

const COPY = {
  nl: { loadError: 'De contactgegevens konden niet worden geladen. Probeer het zo opnieuw.' },
  en: { loadError: 'The contact details could not be loaded. Please try again shortly.' }
};

const state = { lang: 'nl', cache: new Map(), error: false };

const { lang } = initShell({ active: 'board' });
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
      state.cache.set(lang, parsePage(await fetchText(`./content/${lang}/board.md`)));
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
  const mount = document.querySelector('[data-board]');
  if (!mount) {
    return;
  }

  const copy = COPY[state.lang];
  const page = state.cache.get(state.lang);
  const parts = [];

  parts.push(`<header class="page-hero" data-tone="contact">`);
  parts.push(`<h1>${escapeHtml(page?.title ?? 'Bestuur & contact')}</h1>`);
  if (page?.intro) {
    parts.push(`<p>${escapeHtml(page.intro)}</p>`);
  }
  parts.push(`</header>`);

  if (state.error || !page) {
    parts.push(`<p class="empty-state">${copy.loadError}</p>`);
    mount.innerHTML = parts.join('');
    return;
  }

  // ---- Board members -------------------------------------------------------
  const board = findSection(page, 'board');
  if (board) {
    const members = parsePipeList(board.body);
    const note = stripPipeList(board.body);

    parts.push(`<section class="home-panel" aria-labelledby="board-title">`);
    parts.push(`<h2 id="board-title" class="panel-title">${escapeHtml(board.title)}</h2>`);
    parts.push(`<div class="board-grid">`);
    members.forEach(([name = '', unit = '', role = ''], index) => {
      const initials = name
        .split(/\s+/)
        .map((word) => word[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
      parts.push(`<article class="board-card" style="--stagger:${index}">`);
      parts.push(`<span class="board-avatar" aria-hidden="true">${escapeHtml(initials)}</span>`);
      parts.push(`<h3>${escapeHtml(name)}</h3>`);
      parts.push(`<p class="board-role">${escapeHtml(role)}</p>`);
      parts.push(`<p class="board-unit">${escapeHtml(unit)}</p>`);
      parts.push(`</article>`);
    });
    parts.push(`</div>`);
    if (note) {
      parts.push(`<p class="panel-note">${escapeHtml(note)}</p>`);
    }
    parts.push(`</section>`);
  }

  // ---- Manager + address -----------------------------------------------------
  const manager = findSection(page, 'manager');
  const address = findSection(page, 'address');

  parts.push(`<div class="home-columns">`);
  if (manager) {
    parts.push(`<section class="home-panel" aria-labelledby="manager-title">`);
    parts.push(`<h2 id="manager-title" class="panel-title">${escapeHtml(manager.title)}</h2>`);
    parts.push(`<div class="card-prose">${renderMarkdown(manager.body)}</div>`);
    parts.push(`</section>`);
  }
  if (address) {
    parts.push(`<section class="home-panel" aria-labelledby="address-title">`);
    parts.push(`<h2 id="address-title" class="panel-title">${escapeHtml(address.title)}</h2>`);
    parts.push(`<div class="card-prose">${renderMarkdown(address.body)}</div>`);
    parts.push(`</section>`);
  }
  parts.push(`</div>`);

  // ---- How to report maintenance ------------------------------------------------
  const HANDLED_SECTIONS = new Set(['board', 'manager', 'address', 'report']);
  const report = findSection(page, 'report');
  if (report) {
    parts.push(`<section class="home-panel" id="melden" aria-labelledby="report-title">`);
    parts.push(`<h2 id="report-title" class="panel-title">${escapeHtml(report.title)}</h2>`);
    if (report.body) {
      parts.push(`<div class="card-prose">${renderMarkdown(report.body)}</div>`);
    }
    parts.push(`<div class="report-steps">`);
    report.subsections.forEach((step, index) => {
      parts.push(`<article class="report-step" style="--stagger:${index}">`);
      parts.push(`<h3>${escapeHtml(step.title)}</h3>`);
      parts.push(`<div class="card-prose">${renderMarkdown(step.body)}</div>`);
      parts.push(`</article>`);
    });
    parts.push(`</div>`);
    parts.push(`</section>`);
  }

  // ---- Any extra sections from the markdown (e.g. lost keys) ---------------------
  for (const section of page.sections) {
    if (HANDLED_SECTIONS.has(section.id)) {
      continue;
    }

    parts.push(`<section class="home-panel" id="${escapeHtml(section.id)}" aria-labelledby="${escapeHtml(section.id)}-title">`);
    parts.push(`<h2 id="${escapeHtml(section.id)}-title" class="panel-title">${escapeHtml(section.title)}</h2>`);
    if (section.body) {
      parts.push(`<div class="card-prose">${renderMarkdown(section.body)}</div>`);
    }
    if (section.subsections.length > 0) {
      parts.push(`<div class="report-steps">`);
      section.subsections.forEach((sub, index) => {
        parts.push(`<article class="report-step" style="--stagger:${index}">`);
        parts.push(`<h3>${escapeHtml(sub.title)}</h3>`);
        parts.push(`<div class="card-prose">${renderMarkdown(sub.body)}</div>`);
        parts.push(`</article>`);
      });
      parts.push(`</div>`);
    }
    parts.push(`</section>`);
  }

  mount.innerHTML = parts.join('');
}
