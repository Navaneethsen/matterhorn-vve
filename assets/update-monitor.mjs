export function createSourceSnapshot(source = {}) {
  const normalizedSource = source && typeof source === 'object' ? source : {};

  return Object.freeze({
    nlText: normalizeSourceText(normalizedSource.nlText),
    enText: normalizeSourceText(normalizedSource.enText)
  });
}

export function hasSourceChanged(previousSnapshot, nextSnapshot) {
  if (!previousSnapshot || !nextSnapshot) {
    return true;
  }

  return (
    previousSnapshot.nlText !== nextSnapshot.nlText ||
    previousSnapshot.enText !== nextSnapshot.enText
  );
}

export function createSingleFlightRunner(task) {
  if (typeof task !== 'function') {
    throw new TypeError('createSingleFlightRunner requires a function.');
  }

  let inFlightPromise = null;

  return (...args) => {
    if (inFlightPromise) {
      return inFlightPromise;
    }

    inFlightPromise = Promise.resolve()
      .then(() => task(...args))
      .finally(() => {
        inFlightPromise = null;
      });

    return inFlightPromise;
  };
}

export function shouldIncludeEnglishOnRetry({
  englishLoaded = false,
  pendingEnglishRetry = false
} = {}) {
  return Boolean(englishLoaded || pendingEnglishRetry);
}

export function markdownToHtml(markdown, windowLike = globalThis.window) {
  if (typeof markdown !== 'string' || !markdown.trim()) {
    return '';
  }

  const parseMarkdown = windowLike?.marked?.parse;
  if (typeof parseMarkdown !== 'function') {
    throw new Error('Markdown renderer unavailable: expected window.marked.parse to be a function.');
  }

  // breaks: single newlines become <br>, so multi-line blockquotes (address
  // blocks, rule citations) keep their line structure instead of merging
  // into one paragraph.
  return parseMarkdown(markdown.trim(), { breaks: true });
}

function normalizeSourceText(value) {
  return typeof value === 'string' ? value : '';
}
