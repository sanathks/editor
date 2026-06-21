// #4 — Code blocks show their fence language and offer one-click copy of the
// exact raw code, without breaking click-to-edit on the block body.

import { freshPage, group, check } from '../harness.mjs';

const SRC = ['```js', 'const a = 1;', 'console.log(a < 2 && "ok");', '```'];

group('code block: language label renders');
{
  const page = await freshPage();
  const lang = await page.evaluate(src => {
    lines = src;
    window.render();
    const el = document.querySelector('.code-block .code-lang');
    return el ? el.textContent : null;
  }, SRC);
  check('fence language shows as a label', lang === 'js', `got: ${JSON.stringify(lang)}`);
  await page.close();
}

group('code block: copy button copies exact raw code + confirms');
{
  const page = await freshPage();
  const r = await page.evaluate(async src => {
    lines = src;
    window.render();
    // Capture what gets written to the clipboard (avoids headless permission flakiness).
    let copied = null;
    navigator.clipboard.writeText = t => { copied = t; return Promise.resolve(); };
    document.querySelector('.code-block .code-copy-btn').click();
    await new Promise(r => setTimeout(r, 50));
    return { copied, toast: !!document.querySelector('.toast'), toastText: (document.querySelector('.toast') || {}).textContent };
  }, SRC);
  check('copies the exact raw code between fences',
    r.copied === 'const a = 1;\nconsole.log(a < 2 && "ok");', `got: ${JSON.stringify(r.copied)}`);
  check('no HTML entities leak into the copied text', r.copied && !r.copied.includes('&lt;') && !r.copied.includes('&amp;'));
  check('shows a Copied confirmation toast', r.toast && r.toastText === 'Copied', `toast=${r.toastText}`);
  await page.close();
}

group('code block: clicking the body still edits; Copy does not');
{
  const page = await freshPage();
  await page.evaluate(src => { lines = src; window.render(); }, SRC);

  // Clicking the code body enters edit mode on the block's start line.
  await page.click('.code-block pre');
  const afterBody = await page.evaluate(() => editingLine);
  check('clicking code body enters edit mode at the block start', afterBody === 0, `editingLine=${afterBody}`);

  // Reset, then clicking Copy must NOT enter edit mode.
  await page.evaluate(src => { editingLine = -1; lines = src; window.render(); }, SRC);
  await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.resolve(); });
  await page.click('.code-block .code-copy-btn');
  const afterCopy = await page.evaluate(() => editingLine);
  check('clicking Copy does not enter edit mode', afterCopy === -1, `editingLine=${afterCopy}`);
  await page.close();
}

group('code block: no language → no label text, copy still present');
{
  const page = await freshPage();
  const r = await page.evaluate(() => {
    lines = ['```', 'plain text', '```'];
    window.render();
    return {
      lang: document.querySelector('.code-block .code-lang').textContent,
      hasCopy: !!document.querySelector('.code-block .code-copy-btn'),
    };
  });
  check('empty fence language renders no label text', r.lang === '', `got: ${JSON.stringify(r.lang)}`);
  check('copy button present even without a language', r.hasCopy);
  await page.close();
}
