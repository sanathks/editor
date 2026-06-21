// #9 — Paste images: embed as inline data URI. Pasting an image inserts a
// working ![](data:...) line that renders inline; oversized images warn; text
// paste is unaffected.

import { freshPage, group, check } from '../harness.mjs';

// A tiny 1x1 transparent PNG as a data URI (decoded to a File inside the page).
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

group('paste image: embeds a data-URI image line that renders inline');
{
  const page = await freshPage();
  const r = await page.evaluate(async (b64) => {
    lines = ['# Doc'];
    editingLine = -1;
    // Build a real image File and run the embed path.
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const file = new File([bytes], 'shot.png', { type: 'image/png' });
    embedImageFile(file);
    await new Promise(r => setTimeout(r, 80)); // FileReader is async
    const last = lines[lines.length - 1];
    const img = document.querySelector('#editor img');
    return {
      line: last,
      isImgLine: /^!\[pasted\]\(data:image\/png;base64,/.test(last),
      rendered: !!img,
      src: img ? img.getAttribute('src') : null,
    };
  }, PNG_B64);
  check('inserts a ![pasted](data:image/png...) line', r.isImgLine, `line=${(r.line||'').slice(0,40)}`);
  check('image renders inline in the preview', r.rendered);
  check('rendered <img> keeps the data: URI src (survives sanitizer)',
    r.src && r.src.startsWith('data:image/png;base64,'), `src=${(r.src||'').slice(0,30)}`);
  await page.close();
}

group('paste image: persists through the #doc= share hash');
{
  const page = await freshPage();
  const survives = await page.evaluate(async (b64) => {
    lines = [];
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    embedImageFile(new File([bytes], 'shot.png', { type: 'image/png' }));
    await new Promise(r => setTimeout(r, 80));
    // saveToUrl ran inside insert; round-trip through the hash decoder.
    return loadFromUrl().includes('![pasted](data:image/png;base64,');
  }, PNG_B64);
  check('image line round-trips through the share URL', survives);
  await page.close();
}

group('paste image: oversized image warns');
{
  const page = await freshPage();
  const warned = await page.evaluate(async () => {
    lines = [];
    // ~2MB file (over the 1.5MB threshold).
    const big = new File([new Uint8Array(2 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    embedImageFile(big);
    await new Promise(r => setTimeout(r, 30));
    const toast = document.querySelector('.toast');
    return toast ? toast.textContent : null;
  });
  check('shows a size-warning toast for large images', !!warned && /large image/i.test(warned), `toast=${warned}`);
  await page.close();
}

group('paste text: line-splitting unchanged (no regression)');
{
  const page = await freshPage();
  // Dispatch a synthetic text paste while editing a line; should splice into lines[].
  const r = await page.evaluate(async () => {
    lines = ['start'];
    editingLine = 0;
    window.render();
    const input = document.getElementById('lineInput');
    input.focus();
    // Put caret at end of the line.
    const sel = window.getSelection(); const range = document.createRange();
    range.selectNodeContents(input); range.collapse(false);
    sel.removeAllRanges(); sel.addRange(range);
    const dt = new DataTransfer();
    dt.setData('text', 'one\ntwo\nthree');
    // Dispatch on the input so e.target is the editing element (as in a real paste).
    input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 30));
    return lines.join('|');
  });
  check('multi-line text still splits across lines[]', r === 'startone|two|three', `got: ${r}`);
  await page.close();
}
