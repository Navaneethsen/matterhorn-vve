import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePage, parseDatedItems, parsePipeList, stripPipeList, findSection } from './content-md.mjs';

const pageMarkdown = `<!-- editor note -->

# Bestuur & contact

Het bestuur en de beheerder.

## [board] Het bestuur

Gekozen door de ALV van 2026.

- Catalin Hobeanu | Matterhorn 12 | Bestuurslid
- Navaneeth Sen | Matterhorn 42 | Bestuurslid

## [report] Melden

### [non-urgent] Niet-dringend

Via het Twinq-portaal.

### [urgent] Dringend

Bel de calamiteitentelefoon.
`;

test('parsePage extracts title, intro, sections, and subsections', () => {
  const page = parsePage(pageMarkdown);

  assert.equal(page.title, 'Bestuur & contact');
  assert.equal(page.intro, 'Het bestuur en de beheerder.');
  assert.deepEqual(page.sections.map((s) => s.id), ['board', 'report']);

  const report = findSection(page, 'report');
  assert.deepEqual(report.subsections.map((s) => [s.id, s.title]), [
    ['non-urgent', 'Niet-dringend'],
    ['urgent', 'Dringend']
  ]);
  assert.equal(report.subsections[1].body, 'Bel de calamiteitentelefoon.');
});

test('parsePipeList and stripPipeList split list rows from surrounding text', () => {
  const board = findSection(parsePage(pageMarkdown), 'board');

  assert.deepEqual(parsePipeList(board.body), [
    ['Catalin Hobeanu', 'Matterhorn 12', 'Bestuurslid'],
    ['Navaneeth Sen', 'Matterhorn 42', 'Bestuurslid']
  ]);
  assert.equal(stripPipeList(board.body), 'Gekozen door de ALV van 2026.');
});

const feedMarkdown = `# Mededelingen

Intro tekst.

## 2026-04-13 | Besluit ALV | Watermeters door Techem 📌

Body van de mededeling.

## Datum volgt | Alle appartementen | Installatie watermeters

Nog geen datum bekend.
`;

test('parseDatedItems parses dates, free-text date labels, meta, and pinning', () => {
  const feed = parseDatedItems(feedMarkdown);

  assert.equal(feed.title, 'Mededelingen');
  assert.equal(feed.intro, 'Intro tekst.');
  assert.equal(feed.items.length, 2);

  const [pinnedItem, tbd] = feed.items;
  assert.equal(pinnedItem.date, '2026-04-13');
  assert.equal(pinnedItem.meta, 'Besluit ALV');
  assert.equal(pinnedItem.title, 'Watermeters door Techem');
  assert.equal(pinnedItem.pinned, true);
  assert.equal(pinnedItem.body, 'Body van de mededeling.');

  assert.equal(tbd.date, null);
  assert.equal(tbd.dateLabel, 'Datum volgt');
  assert.equal(tbd.pinned, false);
});

test('parseDatedItems supports two-field headings (date | title)', () => {
  const feed = parseDatedItems('# T\n\n## 2026-01-01 | Alleen titel\n\nBody.');

  assert.equal(feed.items[0].title, 'Alleen titel');
  assert.equal(feed.items[0].meta, '');
});
