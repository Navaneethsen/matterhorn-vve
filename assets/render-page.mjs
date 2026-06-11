/**
 * Render a notice page from the merged content model.
 *
 * The page renders ONE language at a time: when `showEnglish` is true every
 * title/intro/card body swaps to its English translation (falling back to
 * Dutch when a translation is missing). Cards render as horizontal accordion
 * rows that expand/collapse; expansion state is supplied via `expandedCards`
 * so re-renders (e.g. a language switch) keep cards open.
 */

const SECTION_TONES = {
  obligations: 'do',
  prohibited: 'dont',
  living: 'home',
  responsibility: 'info',
  contact: 'contact'
};

const TONE_ICONS = {
  do: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  dont: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 4.4 3.4 8.1 8 9 4.6-.9 8-4.6 8-9V6l-8-3Z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 9-8 9 8"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/></svg>',
  contact: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>'
};

const CHEVRON_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

export function renderNoticePage(model, options = {}) {
  const { showEnglish = false, hasUpdate = false, expandedCards = new Set() } = options;
  const { sections = [] } = model;

  const copy = getChromeCopy(showEnglish);
  const langAttr = showEnglish ? ' lang="en"' : '';
  const parts = [];

  // ---- Hero -----------------------------------------------------------
  const heroTitle = pickText(model.title, model.translation?.title, showEnglish);
  const heroIntro = pickText(model.introHtml, model.translation?.introHtml, showEnglish);

  parts.push(`<header class="hero">`);
  parts.push(`<div class="hero-top">`);
  parts.push(`<span class="hero-badge"${langAttr}>${copy.heroBadge}</span>`);
  parts.push(`</div>`);
  parts.push(`<h1${langAttr}>${escapeHtml(heroTitle)}</h1>`);
  if (heroIntro) {
    parts.push(`<div class="intro-content"${langAttr}>${heroIntro}</div>`);
  }
  parts.push(`</header>`);

  parts.push(`<div class="content-layout">`);
  parts.push(`<div class="content-stack">`);

  // ---- Quick-link jump cards -------------------------------------------
  if (sections.length > 0) {
    parts.push(`<section class="jump-cards-section" aria-labelledby="quick-links-heading">`);
    parts.push(
      `<h2 id="quick-links-heading" class="visually-hidden"${langAttr}>${copy.quickLinksHeading}</h2>`
    );
    parts.push(`<div class="jump-cards">`);
    sections.forEach((section, index) => {
      const safeSectionId = toSafeAttributeToken(section.id);
      const tone = sectionTone(section.id);
      const title = pickText(section.title, section.translation?.title, showEnglish);
      const count = section.cards?.length ?? 0;

      parts.push(
        `<a href="#${safeHtmlId('section', section.id)}" data-section-card="${safeSectionId}" class="jump-card" data-tone="${tone}" style="--stagger:${index}">`
      );
      parts.push(`<span class="jump-card-icon" aria-hidden="true">${TONE_ICONS[tone]}</span>`);
      parts.push(`<span class="jump-card-text"${langAttr}>`);
      parts.push(`<span class="jump-card-title">${escapeHtml(title)}</span>`);
      parts.push(`<span class="jump-card-count">${count} ${count === 1 ? copy.ruleSingular : copy.rulePlural}</span>`);
      parts.push(`</span>`);
      parts.push(`<span class="jump-card-arrow" aria-hidden="true">→</span>`);
      parts.push(`</a>`);
    });
    parts.push(`</div>`);
    parts.push(`</section>`);
  }

  // ---- Sections with accordion rule cards -------------------------------
  sections.forEach((section, sectionIndex) => {
    const safeSectionId = toSafeAttributeToken(section.id);
    const tone = sectionTone(section.id);
    const title = pickText(section.title, section.translation?.title, showEnglish);
    const introHtml = pickText(section.introHtml, section.translation?.introHtml, showEnglish);
    const count = section.cards?.length ?? 0;

    parts.push(
      `<section class="section-card" data-tone="${tone}" data-section-id="${safeSectionId}" id="${safeHtmlId('section', section.id)}" style="--stagger:${sectionIndex}">`
    );
    parts.push(`<header class="section-head">`);
    parts.push(`<span class="section-icon" aria-hidden="true">${TONE_ICONS[tone]}</span>`);
    parts.push(`<div class="section-head-text"${langAttr}>`);
    parts.push(`<h2>${escapeHtml(title)}</h2>`);
    parts.push(
      `<p class="section-count">${count} ${count === 1 ? copy.ruleSingular : copy.rulePlural}</p>`
    );
    parts.push(`</div>`);
    parts.push(`</header>`);

    if (introHtml) {
      parts.push(`<div class="section-intro"${langAttr}>${introHtml}</div>`);
    }

    if (section.cards && section.cards.length > 0) {
      parts.push(`<div class="rule-cards">`);
      section.cards.forEach((card) => {
        const safeCardId = toSafeAttributeToken(card.id);
        const cardKey = `${safeSectionId}:${safeCardId}`;
        const bodyId = `card-${safeSectionId}-${safeCardId}`;
        const isOpen = expandedCards.has(cardKey);
        const { icon: cardIcon, text: cardTitle } = splitLeadingEmoji(
          pickText(card.title, card.translation?.title, showEnglish)
        );
        const cardBody = pickText(card.bodyHtml, card.translation?.bodyHtml, showEnglish);

        parts.push(
          `<article class="rule-card${isOpen ? ' is-open' : ''}" data-rule-card="${safeCardId}" data-card-key="${cardKey}">`
        );
        parts.push(`<h3 class="rule-card-heading"${langAttr}>`);
        parts.push(
          `<button type="button" class="rule-card-toggle" data-action="toggle-card" aria-expanded="${isOpen}" aria-controls="${bodyId}">`
        );
        if (cardIcon) {
          parts.push(`<span class="rule-icon" aria-hidden="true">${escapeHtml(cardIcon)}</span>`);
        } else {
          parts.push(`<span class="rule-marker" aria-hidden="true"></span>`);
        }
        parts.push(`<span class="rule-title">${escapeHtml(cardTitle)}</span>`);
        parts.push(`<span class="rule-chevron" aria-hidden="true">${CHEVRON_ICON}</span>`);
        parts.push(`</button>`);
        parts.push(`</h3>`);
        parts.push(`<div class="rule-card-body" id="${bodyId}"${langAttr}>`);
        parts.push(`<div class="rule-card-inner"><div class="card-body">${cardBody || ''}</div></div>`);
        parts.push(`</div>`);
        parts.push(`</article>`);
      });
      parts.push(`</div>`);
    }

    parts.push(`</section>`);
  });

  // ---- Update banner ------------------------------------------------------
  parts.push(`<div id="update-banner" class="update-banner-container"${hasUpdate ? '' : ' hidden'}>`);
  if (hasUpdate) {
    parts.push(`<div class="update-banner" role="status"${langAttr}>`);
    parts.push(`<span class="update-banner-pulse" aria-hidden="true"></span>`);
    parts.push(`<span class="update-banner-text">${copy.updateBannerLabel}</span>`);
    parts.push(`</div>`);
  }
  parts.push(`</div>`);
  parts.push(`</div>`);

  // ---- Desktop sidebar nav ------------------------------------------------
  if (sections.length > 0) {
    parts.push(
      `<nav class="desktop-nav" aria-label="${escapeHtml(copy.sectionNavigationLabel)}"${langAttr}>`
    );
    parts.push(`<p class="desktop-nav-title">${copy.onThisPageLabel}</p>`);
    sections.forEach((section) => {
      const tone = sectionTone(section.id);
      const title = pickText(section.title, section.translation?.title, showEnglish);
      parts.push(
        `<a href="#${safeHtmlId('section', section.id)}" class="nav-link" data-tone="${tone}">`
      );
      parts.push(`<span class="nav-dot" aria-hidden="true"></span>`);
      parts.push(escapeHtml(title));
      parts.push(`</a>`);
    });
    parts.push(`</nav>`);
  }
  parts.push(`</div>`);

  // ---- Back to top ----------------------------------------------------------
  parts.push(
    `<button class="back-to-top"${langAttr} aria-label="${escapeHtml(copy.backToTopLabel)}">⬆</button>`
  );

  return parts.join('');
}

export function sectionTone(sectionId) {
  return SECTION_TONES[sectionId] ?? 'info';
}

/**
 * Split a leading emoji (the rule's pictogram, like on the hallway poster)
 * from a card title. Titles without a leading emoji are returned unchanged.
 */
export function splitLeadingEmoji(title) {
  if (typeof title !== 'string') {
    return { icon: '', text: '' };
  }

  const match = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s+(.+)$/u.exec(title);
  if (match) {
    return { icon: match[1], text: match[2] };
  }

  return { icon: '', text: title };
}

function pickText(primary, translated, showEnglish) {
  if (showEnglish && typeof translated === 'string' && translated.trim()) {
    return translated;
  }

  return typeof primary === 'string' ? primary : '';
}

function getChromeCopy(showEnglish) {
  if (showEnglish) {
    return {
      heroBadge: 'Resident guide',
      quickLinksHeading: 'Quick links',
      sectionNavigationLabel: 'Section navigation',
      onThisPageLabel: 'On this page',
      updateBannerLabel: 'The rules were updated',
      backToTopLabel: 'Back to top',
      ruleSingular: 'rule',
      rulePlural: 'rules'
    };
  }

  return {
    heroBadge: 'Bewonersgids',
    quickLinksHeading: 'Snelle links',
    sectionNavigationLabel: 'Sectienavigatie',
    onThisPageLabel: 'Op deze pagina',
    updateBannerLabel: 'De regels zijn bijgewerkt',
    backToTopLabel: 'Terug naar boven',
    ruleSingular: 'regel',
    rulePlural: 'regels'
  };
}

function safeHtmlId(prefix, value) {
  return `${prefix}-${toSafeAttributeToken(value)}`;
}

function toSafeAttributeToken(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return 'item';
  }

  return Array.from(value)
    .map(character => {
      if (/[A-Za-z0-9-]/.test(character)) {
        return character;
      }

      return `_${character.codePointAt(0).toString(16)}`;
    })
    .join('');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
