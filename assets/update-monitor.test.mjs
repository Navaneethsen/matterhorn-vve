import test from 'node:test';
import assert from 'node:assert/strict';
import * as updateMonitor from './update-monitor.mjs';

const { createSourceSnapshot, hasSourceChanged } = updateMonitor;

test('hasSourceChanged only reports true when either language source changes', () => {
  const first = createSourceSnapshot({ nlText: '# Huisregels', enText: '# House Rules' });
  const same = createSourceSnapshot({ nlText: '# Huisregels', enText: '# House Rules' });
  const changedDutch = createSourceSnapshot({ nlText: '# Nieuwe Huisregels', enText: '# House Rules' });
  const changedEnglish = createSourceSnapshot({ nlText: '# Huisregels', enText: '# Updated House Rules' });

  assert.equal(hasSourceChanged(first, same), false);
  assert.equal(hasSourceChanged(first, changedDutch), true);
  assert.equal(hasSourceChanged(first, changedEnglish), true);
});

test('createSourceSnapshot normalizes nullish and non-string inputs safely', () => {
  assert.deepEqual(createSourceSnapshot(), { nlText: '', enText: '' });
  assert.deepEqual(createSourceSnapshot(null), { nlText: '', enText: '' });
  assert.deepEqual(createSourceSnapshot({ nlText: null, enText: 42 }), { nlText: '', enText: '' });
  assert.deepEqual(createSourceSnapshot('unexpected input'), { nlText: '', enText: '' });
});

test('createSingleFlightRunner reuses an in-flight promise until it settles', async () => {
  assert.equal(typeof updateMonitor.createSingleFlightRunner, 'function');

  let calls = 0;
  let releaseFirstRun = null;
  const firstRunGate = new Promise((resolve) => {
    releaseFirstRun = resolve;
  });

  const runOnceAtATime = updateMonitor.createSingleFlightRunner(async () => {
    calls += 1;
    await firstRunGate;
    return `run-${calls}`;
  });

  const first = runOnceAtATime();
  const second = runOnceAtATime();

  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(calls, 1);

  releaseFirstRun();
  assert.equal(await first, 'run-1');

  const third = runOnceAtATime();
  assert.notEqual(third, first);
  assert.equal(await third, 'run-2');
  assert.equal(calls, 2);
});

test('shouldIncludeEnglishOnRetry preserves a pending English retry intent', () => {
  assert.equal(typeof updateMonitor.shouldIncludeEnglishOnRetry, 'function');
  assert.equal(
    updateMonitor.shouldIncludeEnglishOnRetry({ englishLoaded: false, pendingEnglishRetry: true }),
    true
  );
  assert.equal(
    updateMonitor.shouldIncludeEnglishOnRetry({ englishLoaded: false, pendingEnglishRetry: false }),
    false
  );
  assert.equal(
    updateMonitor.shouldIncludeEnglishOnRetry({ englishLoaded: true, pendingEnglishRetry: false }),
    true
  );
});

test('markdownToHtml throws a clear error when the marked parser is unavailable', () => {
  assert.equal(typeof updateMonitor.markdownToHtml, 'function');
  assert.throws(
    () => updateMonitor.markdownToHtml('**Hello**', {}),
    /Markdown renderer unavailable: expected window\.marked\.parse to be a function\./
  );
});
