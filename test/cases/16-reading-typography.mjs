// #16 — Reading typography: serif reading surface (Literata default, 18px/1.8),
// UI chrome stays Inter, Aa control switches font + steps size (clamped 14–24)
// and persists across reload.

import { freshPage, group, check } from '../harness.mjs';

async function clearPrefs(page) {
  await page.evaluate(() => { try { localStorage.removeItem('readingFont'); localStorage.removeItem('readingSize'); } catch (e) {} });
  await page.reload();
  await page.waitForFunction(() => typeof window.render === 'function', { timeout: 15000 });
}

group('typography: rendered content uses the serif reading font; UI stays Inter');
{
  const page = await freshPage();
  await clearPrefs(page);
  await page.evaluate(() => { lines = ['# Title', 'Body paragraph text.']; window.render(); });
  const r = await page.evaluate(() => {
    const prev = document.querySelector('.line-preview');
    const cs = getComputedStyle(prev);
    const footer = getComputedStyle(document.getElementById('footer'));
    return { font: cs.fontFamily, size: cs.fontSize, lh: cs.lineHeight, footerFont: footer.fontFamily };
  });
  check('reading body is Literata', /Literata/.test(r.font), `font=${r.font}`);
  check('default body size is 18px', r.size === '18px', `size=${r.size}`);
  check('body line-height ~1.8 (≈32.4px on 18px)', parseFloat(r.lh) > 30 && parseFloat(r.lh) < 34, `lh=${r.lh}`);
  check('UI chrome (footer) stays Inter', /Inter/.test(r.footerFont), `footer=${r.footerFont}`);
  await page.close();
}

group('typography: headings use the reading font with -0.02em tracking');
{
  const page = await freshPage();
  await clearPrefs(page);
  await page.evaluate(() => { lines = ['# Heading']; window.render(); });
  const r = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('#editor h1'));
    return { font: cs.fontFamily, tracking: cs.letterSpacing };
  });
  check('h1 uses the reading serif', /Literata/.test(r.font), `font=${r.font}`);
  // -0.02em of 36px (2em*18) ≈ -0.72px
  check('h1 has negative letter-spacing', parseFloat(r.tracking) < 0, `tracking=${r.tracking}`);
  await page.close();
}

group('typography: Aa control switches font and persists');
{
  const page = await freshPage();
  await clearPrefs(page);
  await page.evaluate(() => setReadingFont('Source Serif 4'));
  const applied = await page.evaluate(() => ({
    varVal: getComputedStyle(document.documentElement).getPropertyValue('--reading-font'),
    stored: localStorage.getItem('readingFont'),
    activeMarked: document.querySelector('#readingDropdown .dropdown-item[data-font="Source Serif 4"]').classList.contains('active'),
  }));
  check('--reading-font switches to Source Serif', /Source Serif 4/.test(applied.varVal), `var=${applied.varVal}`);
  check('choice persisted to localStorage', applied.stored === 'Source Serif 4');
  check('active item marked in the menu', applied.activeMarked);

  await page.reload();
  await page.waitForFunction(() => typeof window.render === 'function', { timeout: 15000 });
  const afterReload = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--reading-font'));
  check('font persists across reload', /Source Serif 4/.test(afterReload), `var=${afterReload}`);
  await page.close();
}

group('typography: size steps and clamps 14–24, persists');
{
  const page = await freshPage();
  await clearPrefs(page);
  // Step up to the ceiling.
  const top = await page.evaluate(() => {
    for (let i = 0; i < 10; i++) stepReadingSize(1);
    return { size: getComputedStyle(document.documentElement).getPropertyValue('--reading-size').trim(), label: document.getElementById('readingSizeLabel').textContent };
  });
  check('size clamps at the 24px ceiling', top.size === '24px', `size=${top.size}`);
  check('label reflects the size', top.label === '24px', `label=${top.label}`);

  // Step down to the floor.
  const bottom = await page.evaluate(() => {
    for (let i = 0; i < 10; i++) stepReadingSize(-1);
    return getComputedStyle(document.documentElement).getPropertyValue('--reading-size').trim();
  });
  check('size clamps at the 14px floor', bottom === '14px', `size=${bottom}`);

  await page.reload();
  await page.waitForFunction(() => typeof window.render === 'function', { timeout: 15000 });
  const persisted = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--reading-size').trim());
  check('size persists across reload', persisted === '14px', `size=${persisted}`);
  await page.close();
}
