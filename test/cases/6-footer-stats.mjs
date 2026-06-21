// #6 — Footer live word / character / reading-time counter.

import { freshPage, group, check } from '../harness.mjs';

group('stats: counts words, chars, and reading time');
{
  const page = await freshPage();
  const text = await page.evaluate(() => {
    lines = ['# Title here', 'one two three four five']; // 3 (incl. '#') + 5 = 8 source words
    window.render();
    return document.getElementById('docStats').textContent;
  });
  check('word count is correct (source tokens, markdown not stripped)', /^8 words/.test(text), text);
  check('shows char count', /chars/.test(text));
  check('shows reading time ≥ 1 min', /~1 min read/.test(text), text);
  await page.close();
}

group('stats: reading time rounds up by ~200 wpm');
{
  const page = await freshPage();
  const text = await page.evaluate(() => {
    lines = [Array.from({ length: 450 }, (_, i) => 'word' + i).join(' ')]; // 450 words
    window.render();
    return document.getElementById('docStats').textContent;
  });
  check('450 words counted', /^450 words/.test(text), text);
  check('450/200 → ~3 min read', /~3 min read/.test(text), text);
  await page.close();
}

group('stats: fenced code lines are excluded from word count');
{
  const page = await freshPage();
  const text = await page.evaluate(() => {
    lines = ['hello world', '```', 'this code has many words here', '```', 'tail'];
    window.render();
    return document.getElementById('docStats').textContent;
  });
  // "hello world" (2) + "tail" (1) = 3; code body excluded.
  check('only non-code words counted (3)', /^3 words/.test(text), text);
  await page.close();
}

group('stats: empty document shows 0 words (no NaN)');
{
  const page = await freshPage();
  const text = await page.evaluate(() => {
    lines = []; editingLine = -1; window.render();
    return document.getElementById('docStats').textContent;
  });
  check('empty doc shows "0 words"', text === '0 words', text);
  check('no NaN anywhere', !/NaN/.test(text));
  await page.close();
}

group('stats: update live on input (without a full render)');
{
  const page = await freshPage();
  const text = await page.evaluate(() => {
    lines = ['']; editingLine = 0; window.render();
    const input = document.getElementById('lineInput');
    input.textContent = 'live typed words here'; // 4 words
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    return document.getElementById('docStats').textContent;
  });
  check('counter updates on input event', /^4 words/.test(text), text);
  await page.close();
}
