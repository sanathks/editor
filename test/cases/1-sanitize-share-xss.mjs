// #1 — Security: untrusted #doc= share-link markdown must render inert (no XSS),
// while legitimate formatting still renders. Drives the real render path.

import { freshPage, group, check } from '../harness.mjs';

group('xss: malicious share content is neutralized');
{
  // Track any dialog (alert/confirm) — a fired alert means the payload executed.
  const page = await freshPage();
  let alertFired = false;
  page.on('dialog', async d => { alertFired = true; await d.dismiss(); });

  const html = await page.evaluate(() => {
    lines = [
      'Hello <img src=x onerror="alert(document.domain)">',
      '<script>alert(1)<\/script>',
      '[click](javascript:alert(2))',
    ];
    window.render();
    return document.getElementById('editor').innerHTML;
  });
  // Give any async error handler a tick to fire.
  await page.waitForTimeout(150);

  check('no alert/dialog fired from payload', alertFired === false);
  check('onerror handler stripped from <img>', !/onerror/i.test(html), html.slice(0, 160));
  check('no <script> tag survives', !/<script/i.test(html));
  check('javascript: href neutralized', !/href\s*=\s*["']?javascript:/i.test(html), html.slice(0, 200));
  await page.close();
}

group('xss: legitimate formatting still renders');
{
  const page = await freshPage();
  const html = await page.evaluate(() => {
    lines = ['# Title', 'a **bold** and *italic* and `code` and [link](https://example.com)'];
    window.render();
    return document.getElementById('editor').innerHTML;
  });
  check('heading renders', /<h1[\s>]/i.test(html));
  check('bold renders', /<strong[\s>]/i.test(html));
  check('italic renders', /<em[\s>]/i.test(html));
  check('inline code renders', /<code[\s>]/i.test(html));
  check('safe https link survives', /href\s*=\s*["']https:\/\/example\.com/i.test(html), html.slice(0, 240));
  await page.close();
}

group('xss: table cells are sanitized too');
{
  const page = await freshPage();
  let alertFired = false;
  page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
  const html = await page.evaluate(() => {
    lines = [
      '| h |',
      '| --- |',
      '| <img src=x onerror="alert(3)"> |',
    ];
    window.render();
    return document.getElementById('editor').innerHTML;
  });
  await page.waitForTimeout(150);
  check('table cell payload did not fire', alertFired === false);
  check('table cell onerror stripped', !/onerror/i.test(html), html.slice(0, 200));
  await page.close();
}
