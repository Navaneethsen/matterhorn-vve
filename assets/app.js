import { parseNoticeMarkdown, mergeTranslations } from './content-model.mjs';
import { renderNoticePage } from './render-page.mjs';
import { initShell, onLanguageChange, getLanguage } from './shell.mjs';
import {
  createSingleFlightRunner,
  createSourceSnapshot,
  hasSourceChanged,
  markdownToHtml,
  shouldIncludeEnglishOnRetry
} from './update-monitor.mjs';

const RULES_NL_URL = './content/nl/rules.md';
const RULES_EN_URL = './content/en/rules.md';
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const BACK_TO_TOP_THRESHOLD_PX = 320;

let root = null;
let sectionObserver = null;

const state = {
  model: null,
  nlText: '',
  enText: '',
  sourceSnapshot: null,
  showEnglish: false,
  englishLoaded: false,
  pendingEnglishRetry: false,
  hasUpdate: false,
  errorMessage: null,
  isLoading: false,
  expandedCards: new Set()
};

let pollTimerId = null;
const loadEnglishContent = createSingleFlightRunner(async () => {
  if (!state.nlText || state.hasUpdate) {
    await loadContent({ includeEnglish: true });

    if (state.englishLoaded) {
      state.pendingEnglishRetry = false;
    }

    return state.englishLoaded;
  }

  state.isLoading = true;
  root?.setAttribute('aria-busy', 'true');

  try {
    const enText = await fetchSourceText(RULES_EN_URL);

    state.enText = enText;
    state.englishLoaded = Boolean(enText);
    state.pendingEnglishRetry = !state.englishLoaded;
    state.sourceSnapshot = createSourceSnapshot({ nlText: state.nlText, enText });
    state.model = buildRenderableModel({ nlText: state.nlText, enText });
    state.errorMessage = null;

    render();
    return state.englishLoaded;
  } catch (error) {
    console.error(error);
    state.errorMessage = getCopy(state.showEnglish).loadErrorBody;
    render();
    return false;
  } finally {
    state.isLoading = false;
    root?.removeAttribute('aria-busy');
  }
});

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
  } else {
    initializeApp();
  }
}

function initializeApp() {
  root = document.querySelector('[data-notice-app]') ?? document.getElementById('notice-app');

  if (!root) {
    return;
  }

  initShell({ active: 'rules' });
  onLanguageChange((lang) => {
    void applyLanguage(lang === 'en');
  });

  root.addEventListener('click', handleActionClick);
  window.addEventListener('scroll', syncBackToTopButton, { passive: true });

  void boot();
}

async function boot() {
  const wantsEnglish = getLanguage() === 'en';

  await loadContent({ includeEnglish: wantsEnglish });

  if (wantsEnglish && state.englishLoaded) {
    state.showEnglish = true;
    render();
  }

  startPolling();
}

async function loadContent({ includeEnglish = state.englishLoaded } = {}) {
  if (state.isLoading) {
    return;
  }

  state.isLoading = true;
  root?.setAttribute('aria-busy', 'true');

  try {
    const nlText = await fetchSourceText(RULES_NL_URL);
    const enText = includeEnglish ? await fetchSourceText(RULES_EN_URL) : '';

    state.nlText = nlText;
    state.enText = enText;
    state.englishLoaded = Boolean(enText);
    state.pendingEnglishRetry = includeEnglish && !state.englishLoaded;
    state.sourceSnapshot = createSourceSnapshot({ nlText, enText });
    state.model = buildRenderableModel({ nlText, enText });
    state.hasUpdate = false;
    state.errorMessage = null;

    render();
  } catch (error) {
    console.error(error);
    state.errorMessage = getCopy(state.showEnglish).loadErrorBody;
    render();
  } finally {
    state.isLoading = false;
    root?.removeAttribute('aria-busy');
  }
}

async function ensureEnglishContent() {
  if (state.englishLoaded) {
    return true;
  }

  return loadEnglishContent();
}

async function pollForUpdates() {
  if (!state.sourceSnapshot || state.isLoading) {
    return;
  }

  try {
    const nlText = await fetchSourceText(RULES_NL_URL);
    const enText = state.englishLoaded ? await fetchSourceText(RULES_EN_URL) : '';
    const nextSnapshot = createSourceSnapshot({ nlText, enText });

    if (hasSourceChanged(state.sourceSnapshot, nextSnapshot) && !state.hasUpdate) {
      state.hasUpdate = true;
      render();
    }
  } catch (error) {
    console.error(error);
  }
}

function startPolling() {
  if (pollTimerId !== null || typeof window === 'undefined') {
    return;
  }

  pollTimerId = window.setInterval(() => {
    void pollForUpdates();
  }, POLL_INTERVAL_MS);
}

async function handleActionClick(event) {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget || !root?.contains(actionTarget)) {
    return;
  }

  const { action } = actionTarget.dataset;

  if (action === 'toggle-card') {
    toggleRuleCard(actionTarget);
    return;
  }

  if (action === 'retry-load') {
    if (state.pendingEnglishRetry) {
      const englishReady = await ensureEnglishContent();
      if (!englishReady) {
        return;
      }

      state.showEnglish = true;
      state.pendingEnglishRetry = false;
      render();
      return;
    }

    await loadContent({ includeEnglish: shouldIncludeEnglishOnRetry(state) });
    return;
  }

  if (action === 'refresh-content') {
    await loadContent({ includeEnglish: shouldIncludeEnglishOnRetry(state) });
    return;
  }

  if (action === 'back-to-top') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

async function applyLanguage(wantsEnglish) {
  if (wantsEnglish === state.showEnglish) {
    return;
  }

  if (wantsEnglish) {
    state.pendingEnglishRetry = true;
    const englishReady = await ensureEnglishContent();
    if (!englishReady) {
      return;
    }
    state.pendingEnglishRetry = false;
  }

  state.showEnglish = wantsEnglish;
  render();
}

function toggleRuleCard(toggleButton) {
  const card = toggleButton.closest('.rule-card');
  const cardKey = card?.dataset.cardKey;
  if (!card || !cardKey) {
    return;
  }

  const isOpen = state.expandedCards.has(cardKey);

  if (isOpen) {
    state.expandedCards.delete(cardKey);
  } else {
    state.expandedCards.add(cardKey);
  }

  card.classList.toggle('is-open', !isOpen);
  toggleButton.setAttribute('aria-expanded', String(!isOpen));
}

function buildRenderableModel({ nlText, enText = '' }) {
  const dutchModel = parseNoticeMarkdown(nlText);

  if (!enText) {
    return hydrateHtmlFields(dutchModel);
  }

  const englishModel = parseNoticeMarkdown(enText);
  return hydrateHtmlFields(mergeTranslations(dutchModel, englishModel));
}

function hydrateHtmlFields(model) {
  return {
    ...model,
    introHtml: markdownToHtml(model.intro),
    translation: hydrateTranslation(model.translation, 'intro'),
    sections: model.sections.map((section) => ({
      ...section,
      introHtml: markdownToHtml(section.intro),
      translation: hydrateTranslation(section.translation, 'intro'),
      cards: section.cards.map((card) => ({
        ...card,
        bodyHtml: markdownToHtml(card.bodyMarkdown),
        translation: hydrateTranslation(card.translation, 'bodyMarkdown')
      }))
    }))
  };
}

function hydrateTranslation(translation, markdownKey) {
  if (!translation) {
    return null;
  }

  if (markdownKey === 'intro') {
    return {
      ...translation,
      introHtml: markdownToHtml(translation.intro)
    };
  }

  return {
    ...translation,
    bodyHtml: markdownToHtml(translation.bodyMarkdown)
  };
}

async function fetchSourceText(url) {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Unable to load ${url} (${response.status})`);
  }

  return response.text();
}

function render() {
  if (!root) {
    return;
  }

  if (!state.model) {
    renderStandaloneError();
    return;
  }

  root.innerHTML = renderNoticePage(state.model, {
    showEnglish: state.showEnglish,
    hasUpdate: state.hasUpdate,
    expandedCards: state.expandedCards
  });

  document.documentElement.lang = state.showEnglish ? 'en' : 'nl';

  decorateRenderedPage();

  if (state.errorMessage) {
    root.prepend(createInlineErrorState());
  }
}

function decorateRenderedPage() {
  const bannerContainer = root.querySelector('#update-banner');
  if (bannerContainer) {
    bannerContainer.hidden = !state.hasUpdate;

    const banner = bannerContainer.querySelector('.update-banner');
    if (banner) {
      const refreshButton = document.createElement('button');
      refreshButton.type = 'button';
      refreshButton.dataset.action = 'refresh-content';
      refreshButton.textContent = getCopy(state.showEnglish).refreshButtonLabel;
      banner.append(refreshButton);
    }
  }

  const backToTopButton = root.querySelector('.back-to-top');
  if (backToTopButton) {
    backToTopButton.type = 'button';
    backToTopButton.dataset.action = 'back-to-top';
  }

  setupSectionSpy();
  syncBackToTopButton();
}

function setupSectionSpy() {
  sectionObserver?.disconnect();
  sectionObserver = null;

  if (typeof IntersectionObserver === 'undefined') {
    return;
  }

  const navLinks = Array.from(root.querySelectorAll('.desktop-nav .nav-link'));
  const sections = Array.from(root.querySelectorAll('.section-card[id]'));
  if (navLinks.length === 0 || sections.length === 0) {
    return;
  }

  const linkBySectionId = new Map(
    navLinks.map((link) => [link.getAttribute('href')?.slice(1), link])
  );

  sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) {
        return;
      }

      navLinks.forEach((link) => link.classList.remove('is-active'));
      linkBySectionId.get(visible.target.id)?.classList.add('is-active');
    },
    { rootMargin: '-25% 0px -55% 0px', threshold: [0, 0.2, 0.5] }
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

function syncBackToTopButton() {
  const backToTopButton = root?.querySelector('.back-to-top');
  if (!backToTopButton) {
    return;
  }

  backToTopButton.hidden = window.scrollY < BACK_TO_TOP_THRESHOLD_PX;
}

function renderStandaloneError() {
  const copy = getCopy(state.showEnglish);
  const container = document.createElement('section');
  const title = document.createElement('h2');
  const body = document.createElement('p');
  const retryButton = document.createElement('button');

  container.className = 'notice-error-state';
  title.textContent = copy.loadErrorTitle;
  body.textContent = state.errorMessage ?? copy.loadErrorBody;
  retryButton.type = 'button';
  retryButton.dataset.action = 'retry-load';
  retryButton.textContent = copy.retryButtonLabel;

  container.append(title, body, retryButton);
  root.replaceChildren(container);
}

function createInlineErrorState() {
  const copy = getCopy(state.showEnglish);
  const container = document.createElement('aside');
  const message = document.createElement('p');
  const retryButton = document.createElement('button');

  container.className = 'notice-error-inline';
  message.textContent = state.errorMessage ?? copy.loadErrorBody;
  retryButton.type = 'button';
  retryButton.dataset.action = 'retry-load';
  retryButton.textContent = copy.retryButtonLabel;

  container.append(message, retryButton);
  return container;
}

function getCopy(showEnglish) {
  if (showEnglish) {
    return {
      loadErrorTitle: 'Could not load the house rules',
      loadErrorBody: 'Please try again in a moment.',
      retryButtonLabel: 'Try again',
      refreshButtonLabel: 'Click to refresh'
    };
  }

  return {
    loadErrorTitle: 'Kon de huisregels niet laden',
    loadErrorBody: 'Probeer het zo opnieuw.',
    retryButtonLabel: 'Opnieuw proberen',
    refreshButtonLabel: 'Klik om te verversen'
  };
}
