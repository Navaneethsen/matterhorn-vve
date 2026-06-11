import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNoticePage, sectionTone, splitLeadingEmoji } from './render-page.mjs';

const model = {
  title: 'Huisregels',
  introHtml: '<p>Welkom in de gids.</p>',
  translation: {
    title: 'House Rules',
    introHtml: '<p>Welcome to the guide.</p>'
  },
  sections: [
    {
      id: 'obligations',
      title: 'Verplichtingen',
      introHtml: '<p>Alles wat bewoners moeten doen.</p>',
      translation: {
        title: 'Obligations',
        introHtml: '<p>Everything residents must do.</p>'
      },
      cards: [
        {
          id: 'monthly-fee',
          title: 'Maandelijkse bijdrage betalen',
          bodyHtml: '<ul><li>Betaal op tijd</li></ul>',
          translation: {
            title: 'Pay monthly service charge',
            bodyHtml: '<ul><li>Pay on time</li></ul>'
          }
        }
      ]
    },
    {
      id: 'prohibited',
      title: 'Verboden',
      introHtml: '',
      translation: {
        title: 'Prohibited',
        introHtml: ''
      },
      cards: [
        {
          id: 'noise',
          title: 'Geluidshinder',
          bodyHtml: '<p>Stil tussen 00:00 en 07:00.</p>',
          translation: null
        }
      ]
    }
  ]
};

test('renderNoticePage sanitizes section and card ids before placing them in HTML attributes', () => {
  const html = renderNoticePage(
    {
      ...model,
      sections: [
        {
          ...model.sections[0],
          id: 'obligations" onclick="alert(1)',
          cards: [
            {
              ...model.sections[0].cards[0],
              id: 'monthly fee<script>'
            }
          ]
        }
      ]
    },
    { showEnglish: false, hasUpdate: true }
  );

  const sectionCardMatch = html.match(/data-section-card="([^"]+)"/);
  const sectionIdMatch = html.match(/data-section-id="([^"]+)"/);
  const sectionAnchorMatch = html.match(/id="(section-[^"]+)"/);
  const ruleCardMatch = html.match(/data-rule-card="([^"]+)"/);

  assert.ok(sectionCardMatch);
  assert.ok(sectionIdMatch);
  assert.ok(sectionAnchorMatch);
  assert.ok(ruleCardMatch);
  assert.equal(sectionCardMatch[1], sectionIdMatch[1]);
  assert.equal(sectionAnchorMatch[1], `section-${sectionIdMatch[1]}`);
  assert.match(sectionIdMatch[1], /^[A-Za-z0-9_-]+$/);
  assert.match(ruleCardMatch[1], /^[A-Za-z0-9_-]+$/);
  assert.doesNotMatch(html, /onclick="alert\(1\)"/);
  assert.doesNotMatch(html, /<script>/);
});

test('renderNoticePage swaps all content to English when showEnglish is enabled', () => {
  const html = renderNoticePage(model, { showEnglish: true, hasUpdate: false });

  // Hero, section, and card content rendered in English, not appended below Dutch
  assert.match(html, /<h1 lang="en">House Rules<\/h1>/);
  assert.match(html, /<h2>Obligations<\/h2>/);
  assert.match(html, /<span class="rule-title">Pay monthly service charge<\/span>/);
  assert.match(html, /<ul><li>Pay on time<\/li><\/ul>/);
  assert.doesNotMatch(html, /Huisregels/);
  assert.doesNotMatch(html, /Verplichtingen/);
  assert.doesNotMatch(html, /Maandelijkse bijdrage betalen/);
  assert.doesNotMatch(html, /translation-block/);

  // Cards without a translation fall back to Dutch content
  assert.match(html, /<span class="rule-title">Geluidshinder<\/span>/);

  // English chrome copy
  assert.match(html, /Quick links/);
  assert.match(html, /aria-label="Back to top"/);
});

test('renderNoticePage renders Dutch by default and hides the update banner when no update is available', () => {
  const html = renderNoticePage(model, { showEnglish: false, hasUpdate: false });

  assert.match(html, /<h1>Huisregels<\/h1>/);
  assert.match(html, /<h2>Verplichtingen<\/h2>/);
  assert.match(html, /<span class="rule-title">Maandelijkse bijdrage betalen<\/span>/);
  assert.doesNotMatch(html, /House Rules/);
  assert.doesNotMatch(html, /Pay monthly service charge/);

  // Dutch chrome copy
  assert.match(html, /Snelle links/);
  assert.match(html, /aria-label="Sectienavigatie"/);
  assert.match(html, /aria-label="Terug naar boven"/);

  // Banner container present but hidden, no banner content
  assert.match(html, /id="update-banner"[^>]*hidden/);
  assert.doesNotMatch(html, /class="update-banner"/);
});

test('renderNoticePage shows the update banner when an update is available', () => {
  const html = renderNoticePage(model, { showEnglish: false, hasUpdate: true });

  assert.match(html, /<div class="update-banner" role="status">/);
  assert.match(html, /De regels zijn bijgewerkt/);

  const englishHtml = renderNoticePage(model, { showEnglish: true, hasUpdate: true });
  assert.match(englishHtml, /The rules were updated/);
});

test('renderNoticePage renders accordion cards collapsed by default and open for supplied keys', () => {
  const collapsed = renderNoticePage(model, { showEnglish: false });

  assert.match(
    collapsed,
    /<article class="rule-card" data-rule-card="monthly-fee" data-card-key="obligations:monthly-fee">/
  );
  assert.match(
    collapsed,
    /<button type="button" class="rule-card-toggle" data-action="toggle-card" aria-expanded="false" aria-controls="card-obligations-monthly-fee">/
  );
  assert.match(collapsed, /<div class="rule-card-body" id="card-obligations-monthly-fee">/);

  const expanded = renderNoticePage(model, {
    showEnglish: false,
    expandedCards: new Set(['obligations:monthly-fee'])
  });

  assert.match(expanded, /<article class="rule-card is-open" data-rule-card="monthly-fee"/);
  assert.match(expanded, /aria-expanded="true" aria-controls="card-obligations-monthly-fee"/);
  // Other cards stay collapsed
  assert.match(expanded, /aria-expanded="false" aria-controls="card-prohibited-noise"/);
});

test('renderNoticePage applies tone colors per section: do for obligations, dont for prohibited', () => {
  const html = renderNoticePage(model, { showEnglish: false });

  assert.match(html, /<section class="section-card" data-tone="do" data-section-id="obligations"/);
  assert.match(html, /<section class="section-card" data-tone="dont" data-section-id="prohibited"/);
  assert.match(html, /data-section-card="obligations" class="jump-card" data-tone="do"/);
  assert.match(html, /data-section-card="prohibited" class="jump-card" data-tone="dont"/);
});

test('sectionTone maps known section ids and falls back to info', () => {
  assert.equal(sectionTone('obligations'), 'do');
  assert.equal(sectionTone('prohibited'), 'dont');
  assert.equal(sectionTone('living'), 'home');
  assert.equal(sectionTone('responsibility'), 'info');
  assert.equal(sectionTone('contact'), 'contact');
  assert.equal(sectionTone('something-new'), 'info');
});

test('splitLeadingEmoji separates a leading pictogram from the title', () => {
  assert.deepEqual(splitLeadingEmoji('🧹 Schoon houden'), { icon: '🧹', text: 'Schoon houden' });
  assert.deepEqual(splitLeadingEmoji('🛠️ Onderhoud'), { icon: '🛠️', text: 'Onderhoud' });
  assert.deepEqual(splitLeadingEmoji('Geen emoji'), { icon: '', text: 'Geen emoji' });
});

test('renderNoticePage renders a leading emoji as a pictogram chip next to the rule', () => {
  const html = renderNoticePage(
    {
      ...model,
      sections: [
        {
          ...model.sections[0],
          cards: [{ id: 'pets', title: '🐶 Huisdieren aangelijnd', bodyHtml: '<p>Aangelijnd.</p>', translation: null }]
        }
      ]
    },
    { showEnglish: false }
  );

  assert.match(html, /<span class="rule-icon" aria-hidden="true">🐶<\/span>/);
  assert.match(html, /<span class="rule-title">Huisdieren aangelijnd<\/span>/);
  assert.doesNotMatch(html, /rule-marker/);
});
