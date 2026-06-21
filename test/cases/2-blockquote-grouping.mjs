// #2 — Consecutive `>` lines render as one blockquote block; a blank line ends
// the run; `>>` nests; clicking any quoted line edits that exact source line.

import { freshPage, group, check } from '../harness.mjs';

group('blockquote: consecutive lines group into one block');
{
  const page = await freshPage();
  const counts = await page.evaluate(() => {
    lines = ['> first', '> second', '> third'];
    window.render();
    const ed = document.getElementById('editor');
    return {
      groups: ed.querySelectorAll('blockquote.bq-group').length,
      qlines: ed.querySelectorAll('blockquote.bq-group .bq-line').length,
    };
  });
  check('exactly one grouped blockquote', counts.groups === 1, `groups=${counts.groups}`);
  check('all three lines inside it', counts.qlines === 3, `bq-line=${counts.qlines}`);
  await page.close();
}

group('blockquote: a blank line ends the run');
{
  const page = await freshPage();
  const groups = await page.evaluate(() => {
    lines = ['> a', '> b', '', '> c'];
    window.render();
    return document.getElementById('editor').querySelectorAll('blockquote.bq-group').length;
  });
  check('blank line splits into two quote blocks', groups === 2, `groups=${groups}`);
  await page.close();
}

group('blockquote: >> renders nested');
{
  const page = await freshPage();
  const r = await page.evaluate(() => {
    lines = ['> outer', '>> inner'];
    window.render();
    const ed = document.getElementById('editor');
    const nested = ed.querySelector('blockquote.bq-group blockquote.bq-nested');
    return { hasNested: !!nested, innerText: nested ? nested.textContent.trim() : '' };
  });
  check('a nested blockquote exists', r.hasNested);
  check('nested content has >> markers stripped', r.innerText === 'inner', `got: ${JSON.stringify(r.innerText)}`);
  await page.close();
}

group('blockquote: click edits the exact source line');
{
  const page = await freshPage();
  await page.evaluate(() => {
    lines = ['> first', '> second', '> third'];
    window.render();
  });
  // Click the second quoted line.
  await page.click('blockquote.bq-group .bq-line[data-line="1"]');
  const editing = await page.evaluate(() => {
    const input = document.getElementById('lineInput');
    return { editingLine, raw: input ? input.textContent : null };
  });
  check('editingLine points at clicked source line', editing.editingLine === 1, `editingLine=${editing.editingLine}`);
  check('editor shows that exact raw source line', editing.raw === '> second', `got: ${JSON.stringify(editing.raw)}`);
  await page.close();
}

group('blockquote: still renders correctly via share hash');
{
  const page = await freshPage('> shared quote line one\n> shared quote line two');
  const r = await page.evaluate(() => {
    const ed = document.getElementById('editor');
    return {
      groups: ed.querySelectorAll('blockquote.bq-group').length,
      text: ed.querySelector('blockquote.bq-group').textContent,
    };
  });
  check('preloaded quote groups into one block', r.groups === 1, `groups=${r.groups}`);
  check('both quote lines present', r.text.includes('one') && r.text.includes('two'));
  await page.close();
}
