/**
 * Parsers for the per-section content markdown files in content/<lang>/.
 *
 * Two shapes are supported:
 *
 * 1. Structured pages (home, board, gallery, newsletters):
 *      # Page title
 *      intro text...
 *      ## [section-id] Section title
 *      body...
 *      ### [sub-id] Subsection title
 *      body...
 *    Parsed by parsePage(). Pipe lists ("- a | b | c") inside a body are
 *    extracted with parsePipeList().
 *
 * 2. Dated item feeds (announcements, events):
 *      # Page title
 *      intro text...
 *      ## 2026-04-13 | Label | Item title 📌
 *      body...
 *    Parsed by parseDatedItems(). The first field is a date (YYYY-MM-DD) or a
 *    free-text label ("Datum volgt"); 📌 anywhere in the heading pins the item.
 */

const PIN_MARKER = '📌';

function stripComments(markdown) {
  return typeof markdown === 'string' ? markdown.replace(/<!--[\s\S]*?-->/g, '') : '';
}

export function parsePage(markdown) {
  const lines = stripComments(markdown).split('\n');

  let title = '';
  let intro = '';
  const sections = [];
  let section = null;
  let subsection = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!title && trimmed.startsWith('# ')) {
      title = trimmed.slice(2).trim();
      continue;
    }

    const sectionMatch = trimmed.match(/^## \[([^\]]+)\]\s+(.+)$/);
    if (sectionMatch) {
      section = { id: sectionMatch[1], title: sectionMatch[2], body: '', subsections: [] };
      subsection = null;
      sections.push(section);
      continue;
    }

    const subMatch = trimmed.match(/^### \[([^\]]+)\]\s+(.+)$/);
    if (subMatch && section) {
      subsection = { id: subMatch[1], title: subMatch[2], body: '' };
      section.subsections.push(subsection);
      continue;
    }

    if (subsection) {
      subsection.body += line + '\n';
    } else if (section) {
      section.body += line + '\n';
    } else if (title && (intro || trimmed)) {
      intro += line + '\n';
    }
  }

  for (const s of sections) {
    s.body = s.body.trim();
    for (const sub of s.subsections) {
      sub.body = sub.body.trim();
    }
  }

  return { title, intro: intro.trim(), sections };
}

export function findSection(page, id) {
  return page.sections.find((section) => section.id === id) ?? null;
}

/** Extract "- a | b | c" rows from a body; returns arrays of trimmed cells. */
export function parsePipeList(body) {
  if (typeof body !== 'string') {
    return [];
  }

  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- ') && line.includes('|'))
    .map((line) =>
      line
        .slice(2)
        .split('|')
        .map((cell) => cell.trim())
    );
}

/** Body text with pipe-list rows removed (intro text around a list). */
export function stripPipeList(body) {
  if (typeof body !== 'string') {
    return '';
  }

  return body
    .split('\n')
    .filter((line) => !(line.trim().startsWith('- ') && line.includes('|')))
    .join('\n')
    .trim();
}

export function parseDatedItems(markdown) {
  const lines = stripComments(markdown).split('\n');

  let title = '';
  let intro = '';
  const items = [];
  let item = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!title && trimmed.startsWith('# ')) {
      title = trimmed.slice(2).trim();
      continue;
    }

    if (trimmed.startsWith('## ')) {
      const heading = trimmed.slice(3).trim();
      const pinned = heading.includes(PIN_MARKER);
      const cells = heading
        .replaceAll(PIN_MARKER, '')
        .split('|')
        .map((cell) => cell.trim());

      const [first = '', second = '', ...rest] = cells;
      const itemTitle = rest.length > 0 ? rest.join(' | ') : second;
      const meta = rest.length > 0 ? second : '';
      const isDate = /^\d{4}-\d{2}-\d{2}$/.test(first);

      item = {
        date: isDate ? first : null,
        dateLabel: isDate ? null : first,
        meta,
        title: itemTitle,
        pinned,
        body: ''
      };
      items.push(item);
      continue;
    }

    if (item) {
      item.body += line + '\n';
    } else if (title && (intro || trimmed)) {
      intro += line + '\n';
    }
  }

  for (const entry of items) {
    entry.body = entry.body.trim();
  }

  return { title, intro: intro.trim(), items };
}
