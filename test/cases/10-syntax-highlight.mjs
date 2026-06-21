// #10 — Code blocks syntax-highlighted via highlight.js. Highlight on the
// non-editing render path; editing shows raw text; commit re-highlights.

import { freshPage, group, check } from '../harness.mjs';

// freshPage waits for marked/LZString/render; also wait for hljs to load.
async function ready(page) {
  await page.waitForFunction(() => typeof window.hljs !== 'undefined', { timeout: 15000 });
}

group('highlight: a js code block gets token spans');
{
  const page = await freshPage();
  await ready(page);
  const r = await page.evaluate(() => {
    lines = ['```js', 'const x = 42; // hi', 'function f(){ return "s"; }', '```'];
    editingLine = -1; window.render();
    const code = document.querySelector('#editor pre code');
    return { cls: code.className, spans: code.querySelectorAll('span.hljs-keyword, span[class^="hljs-"]').length, text: code.textContent };
  });
  check('code element has hljs class', /hljs/.test(r.cls), r.cls);
  check('produces highlight token spans', r.spans > 0, `spans=${r.spans}`);
  check('code text is preserved', r.text.includes('const x = 42'));
  await page.close();
}

group('highlight: unlabelled block still renders (autodetect, no crash)');
{
  const page = await freshPage();
  await ready(page);
  const ok = await page.evaluate(() => {
    lines = ['```', 'plain = 1', '```'];
    editingLine = -1; window.render();
    const code = document.querySelector('#editor pre code');
    return code && code.textContent.includes('plain = 1');
  });
  check('unlabelled code block renders its content', ok);
  await page.close();
}

group('highlight: editing a code line shows raw text (no highlight)');
{
  const page = await freshPage();
  await ready(page);
  const r = await page.evaluate(() => {
    lines = ['```js', 'const x = 42;', '```'];
    editingLine = 1; window.render();   // editing the middle code line
    const input = document.getElementById('lineInput');
    return { raw: input ? input.textContent : null, isPlain: input && input.querySelectorAll('span').length === 0 };
  });
  check('editing line shows the raw source', r.raw === 'const x = 42;', `got: ${JSON.stringify(r.raw)}`);
  check('editing line is plain (no token spans)', r.isPlain);
  await page.close();
}

group('highlight: committing re-highlights');
{
  const page = await freshPage();
  await ready(page);
  const spans = await page.evaluate(() => {
    lines = ['```js', 'const x = 42;', '```'];
    editingLine = 1; window.render();   // editing
    editingLine = -1; window.render();  // commit out → regroups + highlights
    const code = document.querySelector('#editor pre code');
    return code.querySelectorAll('span[class^="hljs-"]').length;
  });
  check('re-highlights after commit', spans > 0, `spans=${spans}`);
  await page.close();
}

group('highlight: falls back to escaped text if hljs unavailable');
{
  const page = await freshPage();
  await ready(page);
  const safe = await page.evaluate(() => {
    const saved = window.hljs; window.hljs = undefined;
    const out = highlightCode('<script>alert(1)</script>', 'js');
    window.hljs = saved;
    return out;
  });
  check('fallback escapes HTML (no raw <script>)', !safe.includes('<script>') && safe.includes('&lt;script&gt;'), safe.slice(0, 40));
  await page.close();
}
