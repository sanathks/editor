// #3 — Accessibility: every icon-only toolbar button has a non-empty accessible
// name, decorative SVGs are aria-hidden, and dropdown toggles expose + update
// aria-expanded.

import { freshPage, group, check } from '../harness.mjs';

group('a11y: every toolbar button has an accessible name');
{
  const page = await freshPage();
  const r = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.tool-btn')];
    const unlabeled = btns
      .filter(b => !(b.getAttribute('aria-label') || '').trim())
      .map(b => b.getAttribute('title') || b.outerHTML.slice(0, 40));
    return { total: btns.length, unlabeled };
  });
  // Floor, not exact: later tickets legitimately add toolbar buttons (docs panel,
  // theme toggle, etc.). The strong a11y guarantees below (every button labeled,
  // every SVG aria-hidden) stay exact.
  check('toolbar has at least the baseline buttons', r.total >= 18, `count=${r.total}`);
  check('no toolbar button lacks an aria-label', r.unlabeled.length === 0, r.unlabeled.join(' | '));
  await page.close();
}

group('a11y: decorative toolbar SVGs are hidden from AT');
{
  const page = await freshPage();
  const r = await page.evaluate(() => {
    const svgs = [...document.querySelectorAll('.tool-btn svg')];
    const exposed = svgs.filter(s => s.getAttribute('aria-hidden') !== 'true').length;
    return { total: svgs.length, exposed };
  });
  check('toolbar SVGs exist', r.total >= 17, `count=${r.total}`);
  check('all toolbar SVGs are aria-hidden', r.exposed === 0, `exposed=${r.exposed}`);
  await page.close();
}

group('a11y: dropdown toggles expose and update aria-expanded');
{
  const page = await freshPage();
  const initial = await page.evaluate(() => {
    const t = document.querySelector('#headingDropdown .tool-btn');
    return { haspopup: t.getAttribute('aria-haspopup'), expanded: t.getAttribute('aria-expanded') };
  });
  check('heading toggle has aria-haspopup=menu', initial.haspopup === 'menu', `got ${initial.haspopup}`);
  check('heading toggle starts aria-expanded=false', initial.expanded === 'false', `got ${initial.expanded}`);

  // Open it.
  await page.click('#headingDropdown .tool-btn');
  const opened = await page.$eval('#headingDropdown .tool-btn', t => t.getAttribute('aria-expanded'));
  check('aria-expanded flips to true when opened', opened === 'true', `got ${opened}`);

  // Toggle again to close.
  await page.click('#headingDropdown .tool-btn');
  const closed = await page.$eval('#headingDropdown .tool-btn', t => t.getAttribute('aria-expanded'));
  check('aria-expanded returns to false when closed', closed === 'false', `got ${closed}`);

  // Opening export should not leave heading expanded.
  await page.click('#headingDropdown .tool-btn');
  await page.click('#exportDropdown .tool-btn');
  const after = await page.evaluate(() => ({
    heading: document.querySelector('#headingDropdown .tool-btn').getAttribute('aria-expanded'),
    exportT: document.querySelector('#exportDropdown .tool-btn').getAttribute('aria-expanded'),
  }));
  check('switching dropdowns collapses the other', after.heading === 'false' && after.exportT === 'true',
    `heading=${after.heading} export=${after.exportT}`);
  await page.close();
}
