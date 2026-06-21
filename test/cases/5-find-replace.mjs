// #5 — Find & replace across the document. Ctrl/Cmd+F opens + focuses, Escape
// closes; accurate match count + next/prev cycling with line highlight; Replace
// and Replace-all mutate lines[], re-render, and are undoable.

import { freshPage, group, check } from '../harness.mjs';

const DOC = ['# foo title', 'a line with foo in it', 'no match here', 'another foo and foo again'];
// occurrences of "foo": line0 x1, line1 x1, line3 x2  => 4

group('find: Cmd+F opens and focuses, Escape closes');
{
  const page = await freshPage();
  await page.evaluate(d => { lines = d; window.render(); }, DOC);
  await page.keyboard.press('Meta+f');
  const opened = await page.evaluate(() => ({
    open: document.getElementById('findBar').classList.contains('open'),
    focused: document.activeElement === document.getElementById('findInput'),
  }));
  check('find bar opens on Cmd+F', opened.open);
  check('find input is focused', opened.focused);
  await page.keyboard.press('Escape');
  const closed = await page.evaluate(() => document.getElementById('findBar').classList.contains('open'));
  check('Escape closes the find bar', closed === false);
  await page.close();
}

group('find: match count is accurate (counts every occurrence)');
{
  const page = await freshPage();
  await page.evaluate(d => { lines = d; window.render(); window.openFind(); }, DOC);
  await page.fill('#findInput', 'foo');
  await page.evaluate(() => window.updateFind());
  const count = await page.$eval('#findCount', el => el.textContent);
  check('counts all 4 occurrences', count === '1/4', `got: ${count}`);
  await page.close();
}

group('find: next/prev cycle and highlight the matching line');
{
  const page = await freshPage();
  await page.evaluate(d => { lines = d; window.render(); window.openFind(); }, DOC);
  await page.fill('#findInput', 'foo');
  await page.evaluate(() => window.updateFind());
  const first = await page.evaluate(() => ({
    count: document.getElementById('findCount').textContent,
    line: document.querySelector('.line.find-current')?.getAttribute('data-line'),
  }));
  check('first match highlighted on line 0', first.line === '0' && first.count === '1/4', JSON.stringify(first));

  await page.evaluate(() => window.findNext());
  const second = await page.evaluate(() => ({
    count: document.getElementById('findCount').textContent,
    line: document.querySelector('.line.find-current')?.getAttribute('data-line'),
  }));
  check('next moves to line 1 / 2-of-4', second.line === '1' && second.count === '2/4', JSON.stringify(second));

  await page.evaluate(() => window.findPrev());
  const back = await page.$eval('#findCount', el => el.textContent);
  check('prev wraps/returns to 1/4', back === '1/4', back);
  await page.close();
}

group('find: replace-all mutates the doc, re-renders, is undoable');
{
  const page = await freshPage();
  await page.evaluate(d => { lines = d; window.render(); window.openFind(); }, DOC);
  await page.fill('#findInput', 'foo');
  await page.fill('#replaceInput', 'bar');
  await page.evaluate(() => { window.updateFind(); window.replaceAll(); });
  const after = await page.evaluate(() => ({
    lines: [...lines],
    fooLeft: lines.join('\n').includes('foo'),
    rendered: document.getElementById('editor').textContent.includes('bar'),
    count: document.getElementById('findCount').textContent,
  }));
  check('all foo replaced with bar', after.fooLeft === false, after.lines.join(' | '));
  check('document re-rendered with bar', after.rendered);
  check('match count drops to 0/0', after.count === '0/0', after.count);

  await page.evaluate(() => window.doUndo());
  const undone = await page.evaluate(() => lines.join('\n').includes('foo') && !lines.join('\n').includes('bar'));
  check('undo restores the original foo text', undone);
  await page.close();
}

group('find: single replace edits only the current match');
{
  const page = await freshPage();
  await page.evaluate(() => { lines = ['foo foo foo']; window.render(); window.openFind(); });
  await page.fill('#findInput', 'foo');
  await page.fill('#replaceInput', 'X');
  await page.evaluate(() => { window.updateFind(); window.replaceOne(); });
  const line = await page.evaluate(() => lines[0]);
  check('only the first occurrence replaced', line === 'X foo foo', `got: ${JSON.stringify(line)}`);
  await page.close();
}

group('find: case-sensitive toggle changes matches');
{
  const page = await freshPage();
  await page.evaluate(() => { lines = ['Foo and foo and FOO']; window.render(); window.openFind(); });
  await page.fill('#findInput', 'foo');
  await page.evaluate(() => window.updateFind());
  const insensitive = await page.$eval('#findCount', el => el.textContent);
  check('case-insensitive matches all three', insensitive === '1/3', insensitive);
  await page.evaluate(() => window.toggleFindCase());
  const sensitive = await page.$eval('#findCount', el => el.textContent);
  check('case-sensitive matches only exact "foo"', sensitive === '1/1', sensitive);
  await page.close();
}
