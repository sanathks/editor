// #8 — Ordered lists auto-renumber in preview (1,2,3…) regardless of source
// digits; nested sublists number independently; raw source is preserved.

import { freshPage, group, check } from '../harness.mjs';

// Read the displayed ordered-list numbers. Since #12 ("semantic lists") ordered
// lists now render as real <ol start="N"><li>…</li></ol>, the displayed number for
// each item is (its <ol>'s start) + (its index among that <ol>'s direct <li>
// children). Walk every <li> in document order and compute that, skipping <ul>
// items (unordered, no number). This reproduces the same sequences #8 specified
// (1,2,3 / restart / independent nesting / explicit start) against the shipped DOM.
async function renderedNumbers(page, arr) {
  return page.evaluate((a) => {
    lines = a; editingLine = -1; window.render();
    const out = [];
    for (const li of document.querySelectorAll('#editor li')) {
      const ol = li.parentElement;
      if (!ol || ol.tagName !== 'OL') continue;            // unordered item → no number
      const start = parseInt(ol.getAttribute('start') || '1', 10);
      const idx = [...ol.children].filter(c => c.tagName === 'LI').indexOf(li);
      out.push(`${start + idx}.`);
    }
    return out;
  }, arr);
}

group('ordered: 1./1./1. renders 1,2,3');
{
  const page = await freshPage();
  const nums = await renderedNumbers(page, ['1. a', '1. b', '1. c']);
  check('renders sequential 1. 2. 3.', nums.join(' ') === '1. 2. 3.', nums.join(' '));
  await page.close();
}

group('ordered: blank line restarts numbering');
{
  const page = await freshPage();
  const nums = await renderedNumbers(page, ['1. a', '1. b', '', '1. c', '1. d']);
  check('two runs each restart at 1', nums.join(' ') === '1. 2. 1. 2.', nums.join(' '));
  await page.close();
}

group('ordered: nested sublist numbers independently');
{
  const page = await freshPage();
  // level0: a,b,c ; nested level1 under b: x,y
  const nums = await renderedNumbers(page, ['1. a', '1. b', '  1. x', '  1. y', '1. c']);
  check('outer 1,2 then inner 1,2 then outer 3', nums.join(' ') === '1. 2. 1. 2. 3.', nums.join(' '));
  await page.close();
}

group('ordered: honors an explicit non-1 start');
{
  const page = await freshPage();
  const nums = await renderedNumbers(page, ['3. third', '3. fourth', '3. fifth']);
  check('starts at 3 then 4,5', nums.join(' ') === '3. 4. 5.', nums.join(' '));
  await page.close();
}

group('ordered: editing a line still shows raw "1." source');
{
  const page = await freshPage();
  const raw = await page.evaluate(() => {
    lines = ['1. a', '1. b', '1. c'];
    editingLine = 2; window.render();   // edit the third item
    return document.getElementById('lineInput').textContent;
  });
  check('raw source digit preserved while editing', raw === '1. c', `got: ${JSON.stringify(raw)}`);
  // And the source array is never rewritten.
  const src = await page.evaluate(() => lines.join('|'));
  check('lines[] source unchanged', src === '1. a|1. b|1. c', src);
  await page.close();
}
