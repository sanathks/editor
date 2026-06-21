// #22 — Notion-style slash command menu. `/` at line start opens a filterable,
// keyboard-navigable block menu wired to the existing insert helpers; mid-line
// `/` stays literal.

import { freshPage, group, check } from '../harness.mjs';

// Type a slash query on a fresh empty line and report menu state.
async function slashType(page, text) {
  return page.evaluate((t) => {
    lines = ['']; editingLine = 0; window.render();
    const input = document.getElementById('lineInput');
    input.focus();
    input.textContent = t;
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    const menu = document.getElementById('slashMenu');
    return {
      open: menu.classList.contains('show'),
      labels: [...menu.querySelectorAll('.slash-item')].map(e => e.childNodes[0].textContent.trim()),
    };
  }, text);
}

group('slash: "/" at line start opens the full menu');
{
  const page = await freshPage();
  const r = await slashType(page, '/');
  check('menu opens on "/"', r.open);
  check('lists all 11 block types', r.labels.length === 11, `count=${r.labels.length}`);
  check('includes Heading 1 and Table', r.labels.includes('Heading 1') && r.labels.includes('Table'));
  await page.close();
}

group('slash: typing filters the list');
{
  const page = await freshPage();
  const q = await slashType(page, '/quote');
  check('"/quote" filters to Quote', q.labels.length === 1 && q.labels[0] === 'Quote', q.labels.join(','));
  const tab = await slashType(page, '/tab');
  check('"/tab" filters to Table', tab.labels.includes('Table') && tab.labels.length === 1, tab.labels.join(','));
  await page.close();
}

group('slash: selecting inserts the right markdown via insert helpers');
{
  const page = await freshPage();
  // Quote
  await slashType(page, '/quote');
  const quote = await page.evaluate(() => { selectSlash(0); return lines[0]; });
  check('Quote → "> "', quote === '> ', `got: ${JSON.stringify(quote)}`);

  // Heading 2
  await slashType(page, '/h2');
  const h2 = await page.evaluate(() => { selectSlash(0); return lines[0]; });
  check('H2 → "## "', h2 === '## ', `got: ${JSON.stringify(h2)}`);

  // Code block
  await slashType(page, '/code');
  const code = await page.evaluate(() => { selectSlash(0); return lines.slice(0, 3).join('|'); });
  check('Code → fenced block', code === '```||```', `got: ${JSON.stringify(code)}`);

  // Table
  await slashType(page, '/table');
  const table = await page.evaluate(() => { selectSlash(0); return lines[0]; });
  check('Table → header row inserted', table === '| Header | Header |', `got: ${JSON.stringify(table)}`);
  await page.close();
}

group('slash: keyboard navigation + Enter select');
{
  const page = await freshPage();
  await slashType(page, '/');
  const moved = await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const active = document.querySelector('#slashMenu .slash-item.active');
    return active ? active.childNodes[0].textContent.trim() : null;
  });
  check('ArrowDown moves the active item to Heading 2', moved === 'Heading 2', `active=${moved}`);

  const inserted = await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return lines[0];
  });
  check('Enter inserts the highlighted block (H2)', inserted === '## ', `got: ${JSON.stringify(inserted)}`);
  await page.close();
}

group('slash: Escape closes the menu');
{
  const page = await freshPage();
  await slashType(page, '/');
  const closed = await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return !document.getElementById('slashMenu').classList.contains('show');
  });
  check('Escape closes the menu', closed);
  await page.close();
}

group('slash: mid-line "/" is literal, not a trigger');
{
  const page = await freshPage();
  const r = await slashType(page, 'foo/bar');
  check('no menu for a mid-text slash', r.open === false);
  await page.close();
}
