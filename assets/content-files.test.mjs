import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseNoticeMarkdown } from './content-model.mjs';

const editorNote =
  '<!-- Editor note: keep the bracketed ids in ##/### headings unchanged; edit only the visible heading text and body content. An emoji at the start of a ### title becomes the icon next to the rule. -->';

const expectedSectionIds = ['obligations', 'prohibited', 'lift', 'responsibility', 'contact'];
const expectedCardIds = {
  obligations: [
    'monthly-fee',
    'private-maintenance',
    'clean-common',
    'bulky-waste',
    'doors-close',
    'escape-routes',
    'report-damage',
    'grant-access',
    'door-system',
    'tenant-declaration'
  ],
  prohibited: [
    'noise',
    'common-area-conduct',
    'vehicles-common-areas',
    'decorations-common-areas',
    'balcony',
    'pets',
    'alterations',
    'commercial-activities',
    'garage-use'
  ],
  lift: ['lift-clean', 'lift-conduct', 'lift-renovation'],
  responsibility: ['shared-vs-private', 'cleaning-schedule', 'liability'],
  contact: ['contact-details']
};

const contentSources = {
  nl: readContentFile('nl/rules.md'),
  en: readContentFile('en/rules.md')
};
const rulesHtml = readFileSync(new URL('../rules.html', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const siteCss = readFileSync(new URL('./site.css', import.meta.url), 'utf8');

const contentModels = {
  nl: parseNoticeMarkdown(contentSources.nl),
  en: parseNoticeMarkdown(contentSources.en)
};

function readContentFile(fileName) {
  return readFileSync(new URL(`../content/${fileName}`, import.meta.url), 'utf8');
}

function stripHtmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, '');
}

function assertNonEmptyText(value, message) {
  assert.ok(typeof value === 'string' && value.trim(), message);
}

function assertNonEmptyContent(value, message) {
  const cleanedValue = stripHtmlComments(value).trim();
  assert.ok(typeof value === 'string' && cleanedValue, message);
}

function assertExpectedStructure(language, model) {
  assertNonEmptyText(model.title, `${language} title should have meaningful text`);
  
  assert.deepEqual(
    model.sections.map((section) => section.id),
    expectedSectionIds,
    `${language} section ids should match the agreed order`
  );

  for (const section of model.sections) {
    assertNonEmptyText(section.title, `${language} section ${section.id} should have a title`);
    assert.deepEqual(
      section.cards.map((card) => card.id),
      expectedCardIds[section.id],
      `${language} section ${section.id} should keep the agreed card order`
    );

    for (const card of section.cards) {
      const location = `${language} card ${section.id}/${card.id}`;
      assertNonEmptyText(card.title, `${location} should have a title`);
      assertNonEmptyContent(card.bodyMarkdown, `${location} should have meaningful body content`);
    }
  }
}

test('rules content files keep the invisible editor note at the top', () => {
  for (const [language, markdown] of Object.entries(contentSources)) {
    assert.ok(
      markdown.startsWith(`${editorNote}\n\n# `),
      `${language} rules file should start with the invisible editor note`
    );
  }
});

test('rules.nl.md and rules.en.md use the agreed structure and non-empty content', () => {
  assertExpectedStructure('Dutch', contentModels.nl);
  assertExpectedStructure('English', contentModels.en);
});

test('rules.html self-hosts the markdown renderer and shows a noscript fallback', () => {
  assert.doesNotMatch(rulesHtml, /https:\/\/cdn\.jsdelivr\.net\/npm\/marked/i);
  assert.match(rulesHtml, /<script src="\.\/assets\/[^"]*marked[^"]*\.js"><\/script>/);
  assert.match(rulesHtml, /<noscript>[\s\S]*JavaScript[\s\S]*huisregels[\s\S]*<\/noscript>/i);
});

test('index.html is the community home page with a noscript fallback', () => {
  assert.match(indexHtml, /<script type="module" src="\.\/assets\/home\.mjs"><\/script>/);
  assert.match(indexHtml, /<noscript>[\s\S]*JavaScript[\s\S]*<\/noscript>/i);
  assert.match(indexHtml, /data-home/);
});

test('site.css avoids the brittle desktop-nav row magic number', () => {
  assert.doesNotMatch(siteCss, /grid-row:\s*2\s*\/\s*span\s*999/i);
});
