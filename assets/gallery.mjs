import { initShell, onLanguageChange, fetchText, escapeHtml } from './shell.mjs';
import { parsePage, parsePipeList, findSection } from './content-md.mjs';

const IMAGE_BASE = './content/gallery/';

const COPY = {
  nl: {
    empty: 'Nog geen foto’s. Het bestuur voegt ze binnenkort toe.',
    loadError: 'De galerij kon niet worden geladen. Probeer het zo opnieuw.',
    close: 'Sluiten'
  },
  en: {
    empty: 'No photos yet. The board will add them soon.',
    loadError: 'The gallery could not be loaded. Please try again shortly.',
    close: 'Close'
  }
};

const state = { lang: 'nl', cache: new Map(), error: false };

const { lang } = initShell({ active: 'gallery' });
state.lang = lang;

onLanguageChange((nextLang) => {
  state.lang = nextLang;
  void load();
});

document.addEventListener('click', (event) => {
  const tile = event.target.closest('[data-gallery-index]');
  if (tile) {
    openLightbox(Number(tile.dataset.galleryIndex));
  }
});

void load();

async function load() {
  const lang = state.lang;

  if (!state.cache.has(lang)) {
    try {
      const page = parsePage(await fetchText(`./content/${lang}/gallery.md`));
      const photos = parsePipeList(findSection(page, 'photos')?.body ?? '').map(
        ([file, caption]) => ({ file, caption: caption ?? '' })
      );
      state.cache.set(lang, { page, photos });
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
  const mount = document.querySelector('[data-gallery]');
  if (!mount) {
    return;
  }

  const copy = COPY[state.lang];
  const data = state.cache.get(state.lang);
  const photos = data?.photos ?? [];
  const parts = [];

  parts.push(`<header class="page-hero" data-tone="do">`);
  parts.push(`<h1>${escapeHtml(data?.page.title ?? 'Galerij')}</h1>`);
  if (data?.page.intro) {
    parts.push(`<p>${escapeHtml(data.page.intro)}</p>`);
  }
  parts.push(`</header>`);

  if (state.error || !data) {
    parts.push(`<p class="empty-state">${copy.loadError}</p>`);
  } else if (photos.length === 0) {
    parts.push(`<p class="empty-state">${copy.empty}</p>`);
  } else {
    parts.push(`<div class="gallery-grid">`);
    photos.forEach((photo, index) => {
      parts.push(
        `<button type="button" class="gallery-tile" data-gallery-index="${index}" style="--stagger:${index}">`
      );
      parts.push(
        `<img src="${IMAGE_BASE}${escapeHtml(photo.file)}" alt="${escapeHtml(photo.caption)}" loading="lazy">`
      );
      parts.push(`<span class="gallery-caption">${escapeHtml(photo.caption)}</span>`);
      parts.push(`</button>`);
    });
    parts.push(`</div>`);
  }

  mount.innerHTML = parts.join('');
}

function openLightbox(index) {
  const photo = state.cache.get(state.lang)?.photos[index];
  if (!photo) {
    return;
  }

  const copy = COPY[state.lang];
  let dialog = document.querySelector('.gallery-lightbox');

  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'gallery-lightbox';
    dialog.addEventListener('click', (event) => {
      // Close on backdrop click or close button.
      if (event.target === dialog || event.target.closest('[data-lightbox-close]')) {
        dialog.close();
      }
    });
    document.body.append(dialog);
  }

  dialog.innerHTML = [
    `<figure class="gallery-lightbox-figure">`,
    `<img src="${IMAGE_BASE}${escapeHtml(photo.file)}" alt="${escapeHtml(photo.caption)}">`,
    `<figcaption>${escapeHtml(photo.caption)}</figcaption>`,
    `</figure>`,
    `<button type="button" class="gallery-lightbox-close" data-lightbox-close aria-label="${copy.close}">✕</button>`
  ].join('');

  dialog.showModal();
}
