import {
  initShell,
  onLanguageChange,
  formatDate,
  fetchText,
  escapeHtml,
  renderMarkdown
} from './shell.mjs';
import { parsePage, parseDatedItems, parsePipeList, findSection } from './content-md.mjs';

const PORTAL_URL = 'https://vvemetea.twinq.nl/';

const COPY = {
  nl: {
    heroBadge: 'Vereniging van Eigenaars',
    ctaRules: 'Bekijk de huisregels',
    ctaPortal: 'Bewonersportaal',
    ctaReport: 'Iets melden?',
    photoCaption: 'Matterhorn 2–48 · Amstelveen',
    announcementsTitle: 'Mededelingen',
    announcementsEmpty: 'Geen mededelingen op dit moment.',
    pinnedLabel: 'Vastgezet',
    eventsTitle: 'Binnenkort',
    eventsEmpty: 'Geen geplande activiteiten.',
    eventsAll: 'Volledige agenda',
    quickTitle: 'Snel naar',
    loadError: 'Inhoud kon niet worden geladen. Probeer het zo opnieuw.',
    quickLinks: [
      { href: './rules.html', title: 'Huisregels', sub: 'De regels voor alle bewoners' },
      { href: './events.html', title: 'Agenda', sub: 'Vergaderingen en activiteiten' },
      { href: './gallery.html', title: 'Galerij', sub: 'Foto’s van het gebouw' },
      { href: './board.html', title: 'Bestuur & contact', sub: 'Bestuur, beheerder en meldingen' },
      { href: './newsletters.html', title: 'Nieuwsbrieven', sub: 'Berichten van het bestuur' },
      { href: PORTAL_URL, title: 'Bewonersportaal', sub: 'Twinq: bijdrage, meldingen en documenten', external: true }
    ]
  },
  en: {
    heroBadge: 'Owners’ association',
    ctaRules: 'Read the house rules',
    ctaPortal: 'Resident portal',
    ctaReport: 'Report an issue',
    photoCaption: 'Matterhorn 2–48 · Amstelveen',
    announcementsTitle: 'Announcements',
    announcementsEmpty: 'No announcements at the moment.',
    pinnedLabel: 'Pinned',
    eventsTitle: 'Coming up',
    eventsEmpty: 'No planned activities.',
    eventsAll: 'Full calendar',
    quickTitle: 'Quick links',
    loadError: 'Content could not be loaded. Please try again shortly.',
    quickLinks: [
      { href: './rules.html', title: 'House rules', sub: 'The rules for all residents' },
      { href: './events.html', title: 'Calendar', sub: 'Meetings and activities' },
      { href: './gallery.html', title: 'Gallery', sub: 'Photos of the building' },
      { href: './board.html', title: 'Board & contact', sub: 'Board, manager and reports' },
      { href: './newsletters.html', title: 'Newsletters', sub: 'Updates from the board' },
      { href: PORTAL_URL, title: 'Resident portal', sub: 'Twinq: contribution, reports and documents', external: true }
    ]
  }
};

const state = { lang: 'nl', cache: new Map(), error: false };

const { lang } = initShell({ active: 'home' });
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
      const [homeText, announcementsText, eventsText] = await Promise.all([
        fetchText(`./content/${lang}/home.md`),
        fetchText(`./content/${lang}/announcements.md`),
        fetchText(`./content/${lang}/events.md`)
      ]);

      state.cache.set(lang, {
        home: parsePage(homeText),
        announcements: parseDatedItems(announcementsText),
        events: parseDatedItems(eventsText)
      });
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
  const mount = document.querySelector('[data-home]');
  if (!mount) {
    return;
  }

  const copy = COPY[state.lang];
  const data = state.cache.get(state.lang);
  const parts = [];

  // ---- Hero --------------------------------------------------------------
  parts.push(`<section class="home-hero">`);
  parts.push(`<div class="home-hero-text">`);
  parts.push(`<span class="hero-badge">${copy.heroBadge}</span>`);
  parts.push(`<h1>${escapeHtml(data?.home.title ?? 'VvE Matterhorn 2–48')}</h1>`);
  if (data?.home.intro) {
    parts.push(`<p class="home-hero-lead">${escapeHtml(data.home.intro)}</p>`);
  }
  parts.push(`<div class="home-hero-actions">`);
  parts.push(`<a class="btn btn-light" href="./rules.html">${copy.ctaRules}</a>`);
  parts.push(
    `<a class="btn btn-ghost" href="${PORTAL_URL}" target="_blank" rel="noopener">${copy.ctaPortal} <span class="external-mark" aria-hidden="true">↗</span></a>`
  );
  parts.push(`<a class="btn btn-ghost" href="./board.html#melden">${copy.ctaReport}</a>`);
  parts.push(`</div>`);
  parts.push(`</div>`);
  parts.push(`<figure class="home-hero-photo">`);
  parts.push(
    `<img src="./assets/images/matterhorn.jpg" alt="${escapeHtml(copy.photoCaption)}" loading="eager" onerror="this.onerror=null;this.src='./assets/images/building-placeholder.svg';this.closest('figure').classList.add('is-placeholder');">`
  );
  parts.push(`<figcaption>${escapeHtml(copy.photoCaption)}</figcaption>`);
  parts.push(`</figure>`);
  parts.push(`</section>`);

  if (state.error || !data) {
    parts.push(`<p class="empty-state">${copy.loadError}</p>`);
    mount.innerHTML = parts.join('');
    return;
  }

  // ---- Building facts -------------------------------------------------------
  const building = findSection(data.home, 'building');
  if (building) {
    const facts = parsePipeList(building.body);
    parts.push(`<section class="home-panel" aria-labelledby="building-title">`);
    parts.push(`<h2 id="building-title" class="panel-title">${escapeHtml(building.title)}</h2>`);
    parts.push(`<dl class="fact-grid">`);
    facts.forEach(([label, value]) => {
      parts.push(`<div class="fact-item"><dt>${escapeHtml(label ?? '')}</dt><dd>${escapeHtml(value ?? '')}</dd></div>`);
    });
    parts.push(`</dl>`);
    parts.push(`</section>`);
  }

  parts.push(`<div class="home-columns">`);

  // ---- Announcements -------------------------------------------------------
  parts.push(`<section class="home-panel" aria-labelledby="announcements-title">`);
  parts.push(`<h2 id="announcements-title" class="panel-title">${copy.announcementsTitle}</h2>`);

  const announcements = sortAnnouncements(data.announcements.items);
  if (announcements.length === 0) {
    parts.push(`<p class="empty-state">${copy.announcementsEmpty}</p>`);
  } else {
    parts.push(`<div class="announcement-list">`);
    announcements.forEach((item, index) => {
      parts.push(`<article class="announcement-card" style="--stagger:${index}">`);
      parts.push(`<header class="announcement-meta">`);
      if (item.meta) {
        parts.push(`<span class="announcement-tag">${escapeHtml(item.meta)}</span>`);
      }
      if (item.pinned) {
        parts.push(`<span class="announcement-pin">📌 ${copy.pinnedLabel}</span>`);
      }
      parts.push(`<time datetime="${escapeHtml(item.date ?? '')}">${formatDate(item.date, state.lang)}</time>`);
      parts.push(`</header>`);
      parts.push(`<h3>${escapeHtml(item.title)}</h3>`);
      parts.push(`<div class="card-prose">${renderMarkdown(item.body)}</div>`);
      parts.push(`</article>`);
    });
    parts.push(`</div>`);
  }
  parts.push(`</section>`);

  // ---- Upcoming events -------------------------------------------------------
  parts.push(`<section class="home-panel" aria-labelledby="upcoming-title">`);
  parts.push(`<h2 id="upcoming-title" class="panel-title">${copy.eventsTitle}</h2>`);

  const upcoming = upcomingEvents(data.events.items);
  if (upcoming.length === 0) {
    parts.push(`<p class="empty-state">${copy.eventsEmpty}</p>`);
  } else {
    parts.push(`<div class="event-list">`);
    upcoming.slice(0, 3).forEach((item) => {
      parts.push(renderEventCard(item, state.lang));
    });
    parts.push(`</div>`);
  }
  parts.push(`<a class="panel-link" href="./events.html">${copy.eventsAll} →</a>`);
  parts.push(`</section>`);

  parts.push(`</div>`);

  // ---- Quick links --------------------------------------------------------------
  parts.push(`<section class="quick-links" aria-labelledby="quick-title">`);
  parts.push(`<h2 id="quick-title" class="panel-title">${copy.quickTitle}</h2>`);
  parts.push(`<div class="quick-links-grid">`);
  copy.quickLinks.forEach((link, index) => {
    const externalAttrs = link.external ? ' target="_blank" rel="noopener"' : '';
    parts.push(`<a class="quick-link-card${link.external ? ' is-external' : ''}" href="${link.href}"${externalAttrs} style="--stagger:${index}">`);
    parts.push(`<span class="quick-link-title">${escapeHtml(link.title)}</span>`);
    parts.push(`<span class="quick-link-sub">${escapeHtml(link.sub)}</span>`);
    parts.push(`<span class="jump-card-arrow" aria-hidden="true">${link.external ? '↗' : '→'}</span>`);
    parts.push(`</a>`);
  });
  parts.push(`</div>`);
  parts.push(`</section>`);

  mount.innerHTML = parts.join('');
}

function sortAnnouncements(items) {
  return [...items].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) {
      return a.pinned ? -1 : 1;
    }
    return String(b.date ?? '').localeCompare(String(a.date ?? ''));
  });
}

function upcomingEvents(items) {
  const today = new Date().toISOString().slice(0, 10);
  return items
    .filter((item) => !item.date || item.date >= today)
    .sort((a, b) => String(a.date ?? '9999').localeCompare(String(b.date ?? '9999')));
}

function renderEventCard(item, lang) {
  const dateText = item.date ? formatDate(item.date, lang) : item.dateLabel ?? '';

  return [
    `<article class="event-item">`,
    `<div class="event-date">${escapeHtml(dateText)}</div>`,
    `<div class="event-body">`,
    `<h3>${escapeHtml(item.title)}</h3>`,
    item.meta ? `<p class="event-location">📍 ${escapeHtml(item.meta)}</p>` : '',
    `<div class="card-prose">${renderMarkdown(item.body)}</div>`,
    `</div>`,
    `</article>`
  ].join('');
}
