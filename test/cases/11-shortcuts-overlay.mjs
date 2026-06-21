// #11 — Keyboard shortcut help overlay: "?" opens it (not while editing), Esc
// and click-outside close it, and it lists the actually-implemented shortcuts.

import { freshPage, group, check } from '../harness.mjs';

group('overlay: "?" opens it when not editing');
{
  const page = await freshPage();
  await page.evaluate(() => { lines = ['hello']; editingLine = -1; window.render(); });
  await page.evaluate(() => document.body.focus());
  await page.keyboard.press('?');
  const open = await page.evaluate(() => document.getElementById('shortcutsOverlay').classList.contains('open'));
  check('? opens the overlay', open);
  await page.close();
}

group('overlay: Escape and click-outside close it');
{
  const page = await freshPage();
  await page.evaluate(() => openShortcuts());
  await page.keyboard.press('Escape');
  const afterEsc = await page.evaluate(() => document.getElementById('shortcutsOverlay').classList.contains('open'));
  check('Escape closes', afterEsc === false);

  // Re-open and click the backdrop.
  await page.evaluate(() => openShortcuts());
  const closedByClick = await page.evaluate(() => {
    const ov = document.getElementById('shortcutsOverlay');
    ov.dispatchEvent(new MouseEvent('click', { bubbles: true })); // target === overlay backdrop
    return !ov.classList.contains('open');
  });
  check('click outside (backdrop) closes', closedByClick);

  // Clicking inside the card does NOT close.
  await page.evaluate(() => openShortcuts());
  const stillOpen = await page.evaluate(() => {
    document.querySelector('.shortcuts-card').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return document.getElementById('shortcutsOverlay').classList.contains('open');
  });
  check('clicking inside the card keeps it open', stillOpen);
  await page.close();
}

group('overlay: "?" does NOT open while editing a line');
{
  const page = await freshPage();
  await page.evaluate(() => { lines = ['x']; editingLine = 0; window.render(); document.getElementById('lineInput').focus(); });
  await page.keyboard.press('?');
  const r = await page.evaluate(() => ({
    open: document.getElementById('shortcutsOverlay').classList.contains('open'),
    text: document.getElementById('lineInput').textContent,
  }));
  check('overlay stays closed while editing', r.open === false);
  check('the "?" is typed into the line instead', r.text.includes('?'), `text=${r.text}`);
  await page.close();
}

group('overlay: lists real implemented shortcuts');
{
  const page = await freshPage();
  const text = await page.evaluate(() => {
    openShortcuts();
    return document.querySelector('.shortcuts-card').textContent;
  });
  for (const label of ['Bold', 'Italic', 'Link', 'Undo', 'Redo']) {
    check(`lists ${label}`, text.includes(label));
  }
  // Sanity: doesn't claim a shortcut the editor doesn't have.
  check('does not list a bogus "Command palette"', !/command palette/i.test(text));
  await page.close();
}
