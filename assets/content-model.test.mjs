import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNoticeMarkdown, mergeTranslations } from './content-model.mjs';

const nlSource = `# Huisregels

Welkom in het overzicht.

## [obligations] Verplichtingen

Alles wat bewoners moeten doen.

### [monthly-fee] Maandelijkse bijdrage betalen

- Betaal op tijd

## [prohibited] Verboden

### [noise] Geluidshinder

- Geen storend geluid tussen 00:00 en 07:00
`;

const enSource = `# House Rules

Welcome to the guide.

## [obligations] Obligations

Everything residents must do.

### [monthly-fee] Pay monthly service charge

- Pay on time
`;

test('parseNoticeMarkdown extracts title, intro, sections, cards, and raw body markdown', () => {
  const model = parseNoticeMarkdown(nlSource);

  assert.equal(model.title, 'Huisregels');
  assert.equal(model.intro, 'Welkom in het overzicht.');
  assert.deepEqual(model.sections.map((section) => section.id), ['obligations', 'prohibited']);
  assert.equal(model.sections[0].title, 'Verplichtingen');
  assert.equal(model.sections[0].intro, 'Alles wat bewoners moeten doen.');
  assert.equal(model.sections[0].cards[0].id, 'monthly-fee');
  assert.equal(model.sections[0].cards[0].title, 'Maandelijkse bijdrage betalen');
  assert.equal(model.sections[0].cards[0].bodyMarkdown, '\n- Betaal op tijd\n');
});

test('mergeTranslations attaches matching English content and leaves missing translations null', () => {
  const merged = mergeTranslations(
    parseNoticeMarkdown(nlSource),
    parseNoticeMarkdown(enSource)
  );

  assert.equal(merged.sections[0].translation.title, 'Obligations');
  assert.equal(
    merged.sections[0].cards[0].translation.title,
    'Pay monthly service charge'
  );
  assert.equal(merged.sections[1].translation, null);
});

test('mergeTranslations exposes top-level translation title and intro', () => {
  const merged = mergeTranslations(
    parseNoticeMarkdown(nlSource),
    parseNoticeMarkdown(enSource)
  );

  assert.equal(merged.translation.title, 'House Rules');
  assert.equal(merged.translation.intro, 'Welcome to the guide.');
});

test('parseNoticeMarkdown treats malformed heading-like lines as card body content', () => {
  const markdown = `# Rules

Intro text.

## [section1] Section One

Section intro.

### [card1] Card One

## Malformed section (missing brackets and title)

This is still body text of card1.

### Malformed card (missing brackets)

Also body text.

- List item
`;

  const model = parseNoticeMarkdown(markdown);

  assert.equal(model.title, 'Rules');
  assert.equal(model.intro, 'Intro text.');
  assert.equal(model.sections.length, 1);
  assert.equal(model.sections[0].id, 'section1');
  assert.equal(model.sections[0].cards.length, 1);
  assert.equal(model.sections[0].cards[0].id, 'card1');
  assert.match(model.sections[0].cards[0].bodyMarkdown, /## Malformed section/);
  assert.match(model.sections[0].cards[0].bodyMarkdown, /### Malformed card/);
  assert.match(model.sections[0].cards[0].bodyMarkdown, /- List item/);
});

test('parseNoticeMarkdown does not create section from malformed heading-like line', () => {
  const markdown = `# Title

## [valid] Valid Section

### [card1] Card One

Some content.

## Missing brackets

### Also malformed card

More content here.
`;

  const model = parseNoticeMarkdown(markdown);

  assert.equal(model.sections.length, 1);
  assert.equal(model.sections[0].id, 'valid');
  assert.equal(model.sections[0].cards.length, 1);
  assert.equal(model.sections[0].cards[0].id, 'card1');
  // Malformed heading lines stay in the card body
  assert.match(model.sections[0].cards[0].bodyMarkdown, /## Missing brackets/);
  assert.match(model.sections[0].cards[0].bodyMarkdown, /### Also malformed card/);
});
