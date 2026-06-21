// #12 — Lists render as real, nestable <ul>/<ol>/<li>. Per-line click-to-edit
// maps to the right source line, checkbox toggling still works, blank/non-list
// lines end the run, and mixed bullet/numbered runs become separate lists.

import { freshPage, group, check } from '../harness.mjs';

async function setDoc(page, arr) {
  await page.evaluate(a => { lines = a; editingLine = -1; window.render(); }, arr);
}

group('lists: consecutive bullets render as one real <ul>');
{
  const page = await freshPage();
  await setDoc(page, ['- a', '- b', '- c']);
  const r = await page.evaluate(() => {
    const ed = document.getElementById('editor');
    const uls = ed.querySelectorAll('ul.md-list');
    return { ulCount: uls.length, liCount: uls[0] ? uls[0].children.length : 0, tag: uls[0]?.tagName };
  });
  check('exactly one <ul>', r.ulCount === 1, `uls=${r.ulCount}`);
  check('three <li> children', r.liCount === 3, `li=${r.liCount}`);
  check('it is a real semantic UL element', r.tag === 'UL');
  await page.close();
}

group('lists: indented item becomes a nested list');
{
  const page = await freshPage();
  await setDoc(page, ['- a', '- b', '  - b1', '- c']);
  const r = await page.evaluate(() => {
    const ed = document.getElementById('editor');
    const top = ed.querySelector('#editor > .line .line-preview > ul.md-list') || ed.querySelector('ul.md-list');
    const nested = ed.querySelectorAll('ul.md-list ul.md-list');
    // top-level li = direct children of the outermost ul
    const topLis = [...top.children].filter(c => c.tagName === 'LI').length;
    return { topLis, nestedCount: nested.length, nestedLi: nested[0]?.children.length };
  });
  check('three top-level items', r.topLis === 3, `top=${r.topLis}`);
  check('one nested <ul>', r.nestedCount === 1, `nested=${r.nestedCount}`);
  check('nested list has the indented item', r.nestedLi === 1, `nestedLi=${r.nestedLi}`);
  await page.close();
}

group('lists: numbered items render as <ol> with start');
{
  const page = await freshPage();
  await setDoc(page, ['3. third', '4. fourth']);
  const r = await page.evaluate(() => {
    const ol = document.querySelector('ol.md-list');
    return { tag: ol?.tagName, start: ol?.getAttribute('start'), li: ol?.children.length };
  });
  check('renders a real <ol>', r.tag === 'OL');
  check('start reflects the first number', r.start === '3', `start=${r.start}`);
  check('two <li>', r.li === 2, `li=${r.li}`);
  await page.close();
}

group('lists: checklist renders a checkbox and toggling updates source');
{
  const page = await freshPage();
  await setDoc(page, ['- [ ] todo one', '- [x] done two']);
  const boxes = await page.evaluate(() => {
    const cbs = document.querySelectorAll('ul.md-list input[type="checkbox"]');
    return { count: cbs.length, firstChecked: cbs[0]?.checked, secondChecked: cbs[1]?.checked, dataLine: cbs[0]?.dataset.line };
  });
  check('two checkboxes rendered', boxes.count === 2, `cb=${boxes.count}`);
  check('checked state reflects source', boxes.firstChecked === false && boxes.secondChecked === true);
  check('checkbox carries its source data-line', boxes.dataLine === '0');

  await page.click('ul.md-list input[type="checkbox"][data-line="0"]');
  const line0 = await page.evaluate(() => lines[0]);
  check('toggling the checkbox flips the markdown', line0 === '- [x] todo one', `got: ${line0}`);
  await page.close();
}

group('lists: click-to-edit maps to the exact source line (incl. nested)');
{
  const page = await freshPage();
  await setDoc(page, ['- a', '  - nested b']);
  await page.click('ul.md-list .li-content[data-line="1"]');
  const r = await page.evaluate(() => ({ editingLine, raw: document.getElementById('lineInput')?.textContent }));
  check('clicking nested item edits line 1 (not its parent)', r.editingLine === 1, `editingLine=${r.editingLine}`);
  check('editor shows the nested raw source line', r.raw === '  - nested b', `got: ${JSON.stringify(r.raw)}`);
  await page.close();
}

group('lists: blank line ends the run; mixed types split');
{
  const page = await freshPage();
  await setDoc(page, ['- a', '- b', '', '- c']);
  const split = await page.evaluate(() => document.querySelectorAll('ul.md-list').length);
  check('blank line splits into two <ul>', split === 2, `uls=${split}`);

  await setDoc(page, ['- bullet', '1. number']);
  const mixed = await page.evaluate(() => ({
    ul: document.querySelectorAll('ul.md-list').length,
    ol: document.querySelectorAll('ol.md-list').length,
  }));
  check('bullet then numbered → separate <ul> and <ol>', mixed.ul === 1 && mixed.ol === 1, JSON.stringify(mixed));
  await page.close();
}
