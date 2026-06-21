// Baseline / smoke coverage for the editor. Exercises the real render + marked +
// lz-string paths in a headless browser. Keep this file as the legacy baseline;
// per-ticket coverage goes in its OWN test/cases/<n>-<slug>.mjs file.

import { freshPage, group, check } from '../harness.mjs';

// ---- loads & core DOM ----
group('core: page loads');
{
  const page = await freshPage();
  check('title is the markdown editor', (await page.title()).includes('Editor'));
  check('#editor mount point exists', await page.$('#editor') !== null);
  check('marked + LZString + render are available',
    await page.evaluate(() =>
      typeof window.marked !== 'undefined' &&
      typeof window.LZString !== 'undefined' &&
      typeof window.render === 'function'));
  await page.close();
}

// ---- render: markdown -> preview DOM (exercises marked) ----
group('render: markdown to preview');
{
  const page = await freshPage();
  await page.evaluate(() => {
    // `lines` is the app's source-of-truth markdown buffer; render() rebuilds #editor.
    lines = ['# Hello', 'a **bold** and *italic* word'];
    window.render();
  });
  const html = await page.$eval('#editor', el => el.innerHTML);
  check('heading renders as <h1>', /<h1[\s>]/i.test(html), html.slice(0, 120));
  check('heading text present', html.includes('Hello'));
  check('bold renders as <strong>', /<strong[\s>]/i.test(html));
  check('italic renders as <em>', /<em[\s>]/i.test(html));
  await page.close();
}

// ---- share URL round-trip (exercises lz-string both directions) ----
group('share: #doc= round-trip');
{
  const page = await freshPage();
  const source = '# Title\n\nSome **content** here.\n\n- a\n- b';
  const roundTripped = await page.evaluate(md => {
    lines = md.split('\n');
    window.saveToUrl();                 // writes #doc=<lz-string> to location.hash
    return window.loadFromUrl();        // reads it back out
  }, source);
  check('hash now carries a #doc= payload',
    (await page.evaluate(() => location.hash)).startsWith('#doc='));
  check('decompressed markdown matches source', roundTripped === source,
    `got: ${JSON.stringify(roundTripped).slice(0, 80)}`);
  await page.close();
}

// ---- preload via share hash actually renders on load (exercises init) ----
group('init: loads document from share hash');
{
  const page = await freshPage('# Loaded from URL');
  const html = await page.$eval('#editor', el => el.innerHTML);
  check('preloaded heading rendered on init', html.includes('Loaded from URL'), html.slice(0, 120));
  await page.close();
}
