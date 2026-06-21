// #17 — Effortless writing UX: Medium-style selection bubble, de-emphasized
// toolbar, empty-line placeholder. No regression to existing formatting.

import { freshPage, group, check } from '../harness.mjs';

// Select a sub-range of the single text node in the editing line.
async function selectRange(page, from, to) {
  await page.evaluate(({ from, to }) => {
    const input = document.getElementById('lineInput');
    input.focus();
    const tn = input.firstChild;
    const r = document.createRange();
    r.setStart(tn, from); r.setEnd(tn, to);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    document.dispatchEvent(new Event('selectionchange'));
  }, { from, to });
}

group('bubble: appears on selection inside an editing line');
{
  const page = await freshPage();
  await page.evaluate(() => { lines = ['hello world']; editingLine = 0; window.render(); });
  await selectRange(page, 6, 11); // "world"
  await page.waitForTimeout(30);
  const shown = await page.evaluate(() => document.getElementById('selBubble').classList.contains('show'));
  check('selection bubble shows for a non-collapsed selection', shown);

  // Collapsing the selection hides it.
  await page.evaluate(() => { const s = window.getSelection(); s.collapseToEnd(); document.dispatchEvent(new Event('selectionchange')); });
  await page.waitForTimeout(30);
  const hidden = await page.evaluate(() => !document.getElementById('selBubble').classList.contains('show'));
  check('bubble dismisses when selection collapses', hidden);
  await page.close();
}

group('bubble: actions format the selection (wired to wrapSelection)');
{
  const page = await freshPage();
  await page.evaluate(() => { lines = ['hello world']; editingLine = 0; window.render(); });
  await selectRange(page, 6, 11);
  const line = await page.evaluate(() => {
    bubbleAction({ preventDefault() {} }, '**');
    return lines[0];
  });
  check('bold action wraps the selected word', line === 'hello **world**', `got: ${line}`);
  await page.close();
}

group('placeholder: empty focused line shows ghost text, clears on input');
{
  const page = await freshPage();
  await page.evaluate(() => { lines = ['']; editingLine = 0; window.render(); });
  const r = await page.evaluate(() => {
    const input = document.getElementById('lineInput');
    const before = getComputedStyle(input, '::before').content;
    input.textContent = 'x'; // simulate typing
    const after = getComputedStyle(input, '::before').content;
    return { hasAttr: input.getAttribute('data-placeholder'), before, after };
  });
  check('editing line carries a placeholder attribute', /commands/.test(r.hasAttr || ''));
  check('placeholder text shows while empty', /commands/.test(r.before), `before=${r.before}`);
  check('placeholder gone once the line has text', !/commands/.test(r.after), `after=${r.after}`);
  await page.close();
}

group('chrome: persistent toolbar is de-emphasized by default');
{
  const page = await freshPage();
  const opacity = await page.evaluate(() => getComputedStyle(document.getElementById('mainToolbar')).opacity);
  check('toolbar is dimmed (opacity < 1) by default', parseFloat(opacity) < 1, `opacity=${opacity}`);
  await page.close();
}

group('no regression: existing toolbar actions still work');
{
  const page = await freshPage();
  const line = await page.evaluate(() => {
    lines = ['plain text']; editingLine = 0; window.render();
    const input = document.getElementById('lineInput'); input.focus();
    const tn = input.firstChild;
    const r = document.createRange(); r.setStart(tn, 0); r.setEnd(tn, 5);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    wrapSelection('*'); // the toolbar's italic path
    return lines[0];
  });
  check('toolbar wrapSelection still formats', line === '*plain* text', `got: ${line}`);
  await page.close();
}
