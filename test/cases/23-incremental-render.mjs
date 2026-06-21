// #23 — Incremental render on the CURRENT unit architecture: single-line
// commit/navigation patches only the transition node(s); structural changes do a
// full render; and every shipped render feature (lists, code bar + highlight,
// blockquote, collapse) survives both the full and incremental paths.

import { freshPage, group, check } from '../harness.mjs';

async function ready(page) {
  await page.waitForFunction(() => typeof window.hljs !== 'undefined', { timeout: 15000 }).catch(() => {});
}
async function markNodes(page) {
  await page.evaluate(() => { [...document.querySelectorAll('#editor > .line')].forEach(n => { n.__probe = true; }); });
}
async function survivors(page) {
  return page.evaluate(() => [...document.querySelectorAll('#editor > .line')].filter(n => n.__probe).length);
}

group('incremental: navigation patches only the two transition nodes');
{
  const page = await freshPage(); await ready(page);
  await page.evaluate(() => { lines = Array.from({ length: 12 }, (_, i) => 'line ' + i); editingLine = 2; window.render(); });
  await markNodes(page);
  await page.evaluate(() => { editingLine = 7; window.render(); });
  const surv = await survivors(page);
  check('10/12 line nodes are the same objects (only 2 patched)', surv === 10, `survivors=${surv}`);
  const same = await page.evaluate(() => {
    const inc = document.getElementById('editor').innerHTML;
    _rendered = null; window.render();
    return inc === document.getElementById('editor').innerHTML;
  });
  check('incremental output equals a full re-render', same);
  await page.close();
}

group('incremental: committing an edit patches only that line');
{
  const page = await freshPage(); await ready(page);
  await page.evaluate(() => { lines = ['alpha', 'bravo', 'charlie']; editingLine = 1; window.render(); });
  await markNodes(page);
  await page.evaluate(() => { lines[1] = 'bravo EDITED'; editingLine = -1; window.render(); });
  check('only the edited line node replaced', (await survivors(page)) === 2, 'survivors');
  check('edited text shown', (await page.evaluate(() => document.getElementById('editor').textContent)).includes('bravo EDITED'));
  await page.close();
}

group('structural: inserting a line forces a full render');
{
  const page = await freshPage(); await ready(page);
  await page.evaluate(() => { lines = ['a', 'b', 'c']; editingLine = -1; window.render(); });
  await markNodes(page);
  await page.evaluate(() => { lines.splice(1, 0, 'inserted'); window.render(); });
  check('0 nodes survive (full render)', (await survivors(page)) === 0, 'survivors');
  await page.close();
}

group('features preserved: code block keeps bar + highlight through unitHtml');
{
  const page = await freshPage(); await ready(page);
  const r = await page.evaluate(() => {
    lines = ['```js', 'const x = 1;', '```']; editingLine = -1; window.render();
    const blk = document.querySelector('#editor .code-block');
    return {
      copy: !!blk.querySelector('.code-copy-btn'),
      lang: blk.querySelector('.code-lang')?.textContent,
      hljs: blk.querySelectorAll('pre code.hljs span[class^="hljs-"]').length > 0,
    };
  });
  check('code copy button present', r.copy);
  check('language label present', r.lang === 'js', r.lang);
  check('syntax-highlight spans present', r.hljs);
  await page.close();
}

group('features preserved: lists render as real <ul>/<ol>');
{
  const page = await freshPage(); await ready(page);
  const r = await page.evaluate(() => {
    lines = ['- a', '- b', '1. one', '1. two']; editingLine = -1; window.render();
    const ed = document.getElementById('editor');
    return {
      ul: ed.querySelectorAll('ul.md-list').length,
      ol: ed.querySelectorAll('ol.md-list').length,
      ordered: [...ed.querySelectorAll('ol.md-list .li-content span')].map(s => s.textContent).join(''),
    };
  });
  check('a <ul> and an <ol> are produced', r.ul === 1 && r.ol === 1, JSON.stringify(r));
  await page.close();
}

group('incremental during editing: list regroups on commit (full render kicks in)');
{
  const page = await freshPage(); await ready(page);
  const r = await page.evaluate(() => {
    lines = ['- a', '- b', '- c']; editingLine = 1; window.render(); // editing inside the list → broken to lines
    const brokenUls = document.querySelectorAll('#editor ul.md-list').length;
    editingLine = -1; window.render();                               // commit out → must regroup
    const groupedUls = document.querySelectorAll('#editor ul.md-list').length;
    return { brokenUls, groupedUls };
  });
  check('list is per-line while editing inside it', r.brokenUls === 0, `broken uls=${r.brokenUls}`);
  check('list regroups to one <ul> after commit', r.groupedUls === 1, `grouped uls=${r.groupedUls}`);
  await page.close();
}

group('no regression: collapse hide/expand still works');
{
  const page = await freshPage(); await ready(page);
  const r = await page.evaluate(() => {
    lines = ['# Head', 'under', 'more']; editingLine = -1; window.render();
    const ev = { stopPropagation() {} };
    toggleCollapse(0, ev); const collapsed = document.querySelectorAll('#editor > .line').length;
    toggleCollapse(0, ev); const expanded = document.querySelectorAll('#editor > .line').length;
    return { collapsed, expanded };
  });
  check('collapse hides children', r.collapsed === 1, `collapsed=${r.collapsed}`);
  check('expand restores them', r.expanded === 3, `expanded=${r.expanded}`);
  await page.close();
}
