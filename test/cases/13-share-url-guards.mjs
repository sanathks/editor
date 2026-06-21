// #13 — Warn on over-length share links, and fail loudly on a corrupt/truncated
// #doc=. Small docs share with no warning (no false positives).

import { freshPage, group, check } from '../harness.mjs';

group('share: oversized doc warns but still copies');
{
  const page = await freshPage();
  const r = await page.evaluate(async () => {
    // Big, low-compressibility doc so the encoded URL clears the threshold.
    lines = Array.from({ length: 4000 }, (_, i) => `Section ${i}: ${(i * 7).toString(36)} lorem ipsum dolor ${i}`);
    let copied = null;
    navigator.clipboard.writeText = t => { copied = t; return Promise.resolve(); };
    shareDoc();
    await new Promise(r => setTimeout(r, 50));
    const toast = document.querySelector('.toast');
    return { hrefLen: location.href.length, copiedLen: (copied || '').length, toast: toast && toast.textContent };
  });
  check('share URL actually exceeds the threshold', r.hrefLen > 8000, `len=${r.hrefLen}`);
  check('link is still copied', r.copiedLen === r.hrefLen);
  check('a long-link warning toast is shown', !!r.toast && /long|truncat/i.test(r.toast), `toast=${r.toast}`);
  await page.close();
}

group('share: small doc copies with no warning (no false positive)');
{
  const page = await freshPage();
  const toast = await page.evaluate(async () => {
    lines = ['# Small', 'just a line'];
    navigator.clipboard.writeText = () => Promise.resolve();
    shareDoc();
    await new Promise(r => setTimeout(r, 50));
    return document.querySelector('.toast')?.textContent;
  });
  check('small share shows the plain "Link copied!"', toast === 'Link copied!', `toast=${toast}`);
  await page.close();
}

group('load: corrupt #doc= fails loudly, not silently blank');
{
  const page = await freshPage();
  const r = await page.evaluate(() => {
    // Simulate a truncated/garbled share hash and re-run the load path.
    location.hash = '#doc=@@@not-valid-lzstring@@@';
    const doc = loadFromUrl();           // returns '' for undecodable input
    warnIfCorruptHash(doc);
    const toast = document.querySelector('.toast');
    return { doc, toast: toast && toast.textContent };
  });
  check('corrupt hash decodes to empty', r.doc === '');
  check('shows a clear "couldn\'t load" message', !!r.toast && /couldn.t load/i.test(r.toast), `toast=${r.toast}`);
  await page.close();
}

group('load: bare URL (no hash) shows no error toast');
{
  const page = await freshPage();
  const toast = await page.evaluate(() => {
    history.replaceState(null, '', location.pathname); // ensure no hash
    const doc = loadFromUrl();
    warnIfCorruptHash(doc);
    return document.querySelector('.toast')?.textContent || null;
  });
  check('no false-positive error on an empty/bare URL', toast === null, `toast=${toast}`);
  await page.close();
}
