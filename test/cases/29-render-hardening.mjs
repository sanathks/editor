// #29 — Render-engine correctness: escaped pipes in tables, trimStart/own-line
// code fences, and undo/redo collapse reconciliation.

import { freshPage, group, check } from '../harness.mjs';

group('table: escaped pipe stays in one cell');
{
  const page = await freshPage();
  const r = await page.evaluate(() => {
    lines = ['| a \\| b | c |', '| --- | --- |', '| x | y |'];
    window.render();
    const headerCells = parseTableLines(0, 2).find(row => row.isHeader).cells;
    return headerCells;
  });
  check('escaped pipe → two cells, not three', r.length === 2, `cells=${JSON.stringify(r)}`);
  check('escaped pipe becomes a literal | in the cell', r[0] === 'a | b', `got: ${JSON.stringify(r[0])}`);
  await page.close();
}

group('table: round-trips a literal pipe through rebuild');
{
  const page = await freshPage();
  const back = await page.evaluate(() => {
    lines = ['| a \\| b | c |', '| --- | --- |', '| x | y |'];
    window.render();
    const rows = parseTableLines(0, 2);
    rebuildTableLines(0, 2, rows);            // rewrites lines[] in place
    // Re-parse: the literal pipe must survive as one cell, still "a | b".
    const cells = parseTableLines(0, lines.length - 1).find(row => row.isHeader).cells;
    return cells;
  });
  check('literal pipe survives a rebuild round-trip', back[0] === 'a | b' && back.length === 2, JSON.stringify(back));
  await page.close();
}

group('table: a normal table is unaffected');
{
  const page = await freshPage();
  const r = await page.evaluate(() => {
    lines = ['| h1 | h2 | h3 |', '| --- | --- | --- |', '| 1 | 2 | 3 |'];
    window.render();
    return parseTableLines(0, 2).find(row => row.isHeader).cells;
  });
  check('plain table still splits into 3 cells', r.length === 3 && r[2] === 'h3', JSON.stringify(r));
  await page.close();
}

group('fences: indented fence is detected as a code block');
{
  const page = await freshPage();
  const ranges = await page.evaluate(() => {
    lines = ['text', '  ```js', '  code', '  ```', 'after'];
    return getCodeBlockRanges();
  });
  check('indented ``` opens/closes a code block', ranges.length === 1 && ranges[0][0] === 1 && ranges[0][1] === 3, JSON.stringify(ranges));
  await page.close();
}

group('fences: inline triple-backtick mid-line does not start a block');
{
  const page = await freshPage();
  const ranges = await page.evaluate(() => {
    lines = ['use ```code``` inline', 'normal text'];
    return getCodeBlockRanges();
  });
  check('mid-line ``` is not a fence', ranges.length === 0, JSON.stringify(ranges));
  await page.close();
}

group('collapse: undo never collapses the wrong / a non-heading');
{
  const page = await freshPage();
  const r = await page.evaluate(() => {
    lines = ['# Head A', 'body', '## Head B', 'more'];
    editingLine = -1; collapsedHeadings = new Set([2]); window.render(); // collapse Head B
    // Snapshot for undo, then mutate lines so index 2 is no longer a heading.
    pushUndo();
    lines = ['intro', '# Head A', 'body', '## Head B', 'more']; // inserted a line at top
    collapsedHeadings = new Set([3]); window.render();
    // Undo: restores the pre-insert lines + collapsed; reconcile guards indices.
    doUndo();
    // Every collapsed index must point at a real heading line.
    return [...collapsedHeadings].map(i => ({ i, isHeading: /^#{1,6}\s/.test(lines[i] || '') }));
  });
  check('all collapsed indices are real headings after undo', r.every(x => x.isHeading), JSON.stringify(r));
  await page.close();
}

group('collapse: a stale non-heading index is dropped on undo');
{
  const page = await freshPage();
  const remaining = await page.evaluate(() => {
    lines = ['# H', 'x'];
    pushUndo();
    // Corrupt: pretend a non-heading line index is collapsed, then undo.
    lines = ['# H', 'x'];
    collapsedHeadings = new Set([1]); // line 1 "x" is not a heading
    doUndo();
    return [...collapsedHeadings];
  });
  check('non-heading collapsed index is reconciled away', !remaining.includes(1), JSON.stringify(remaining));
  await page.close();
}
