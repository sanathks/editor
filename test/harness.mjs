// Shared test harness for the editor.
//
// The app is a single browser-DOM `index.html` that pulls Tailwind / marked /
// lz-string / html2pdf from CDNs, so we drive the *real* page in a headless
// Chromium via Playwright rather than trying to stub the DOM.
//
// Case files (test/cases/<n>-<slug>.mjs) import from here and run group()/check()
// at module top level (top-level await is fine — they're awaited one at a time by
// the runner). They must NOT call report() or process.exit — the runner owns
// those, so adding a new case never collides with another branch's case file.

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const INDEX_URL = 'file://' + resolve(__dirname, '..', 'index.html');

const results = [];   // { group, desc, pass, detail }
let currentGroup = 'ungrouped';
let _browser = null;

export function group(name) {
  currentGroup = name;
}

export function check(desc, pass, detail = '') {
  results.push({ group: currentGroup, desc, pass: !!pass, detail });
  const mark = pass ? '  ✓' : '  ✗';
  console.log(`${mark} ${desc}${pass ? '' : (detail ? '  — ' + detail : '')}`);
}

async function browser() {
  if (!_browser) _browser = await chromium.launch();
  return _browser;
}

// Open a fresh page on index.html and wait until the CDN libs + app are ready.
// Pass a markdown string to preload it through the real #doc= share hash.
export async function freshPage(preloadMarkdown = null) {
  const b = await browser();
  const page = await b.newPage();
  page.on('pageerror', err => check('no uncaught page error', false, String(err)));

  let url = INDEX_URL;
  if (preloadMarkdown != null) {
    // Compress with the same lib the app uses, so we exercise the real share path.
    const tmp = await b.newPage();
    await tmp.goto(INDEX_URL);
    await tmp.waitForFunction(() => typeof window.LZString !== 'undefined');
    const hash = await tmp.evaluate(
      md => '#doc=' + window.LZString.compressToEncodedURIComponent(md),
      preloadMarkdown,
    );
    await tmp.close();
    url = INDEX_URL + hash;
  }

  await page.goto(url);
  // CDN scripts + init() must be ready before any test touches the page.
  await page.waitForFunction(
    () => typeof window.marked !== 'undefined'
       && typeof window.LZString !== 'undefined'
       && typeof window.render === 'function',
    { timeout: 15000 },
  );
  return page;
}

export async function report() {
  if (_browser) { await _browser.close(); _browser = null; }
  const failed = results.filter(r => !r.pass);
  const byGroup = {};
  for (const r of results) (byGroup[r.group] ??= { pass: 0, fail: 0 })[r.pass ? 'pass' : 'fail']++;

  console.log('\n' + '─'.repeat(48));
  for (const [g, c] of Object.entries(byGroup)) {
    console.log(`  ${c.fail ? '✗' : '✓'} ${g}: ${c.pass} passed${c.fail ? `, ${c.fail} FAILED` : ''}`);
  }
  console.log('─'.repeat(48));
  console.log(`  ${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('\n  FAILURES:');
    for (const f of failed) console.log(`    ✗ [${f.group}] ${f.desc}${f.detail ? '  — ' + f.detail : ''}`);
  }
  console.log('');
  return failed.length === 0;
}
