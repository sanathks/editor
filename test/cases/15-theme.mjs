// #15 — Light "paper" theme (default), variable-driven, with the dark theme
// preserved and toggleable + persisted. Colors resolve from CSS variables.

import { freshPage, group, check } from '../harness.mjs';

const LIGHT_BG = 'rgb(250, 250, 250)'; // #FAFAFA
const DARK_BG = 'rgb(26, 27, 38)';     // #1a1b26

group('theme: default is the light paper theme');
{
  const page = await freshPage();
  // No persisted theme → clear any leftover and reload to a clean default.
  await page.evaluate(() => { try { localStorage.removeItem('theme'); } catch (e) {} });
  await page.reload();
  await page.waitForFunction(() => typeof window.render === 'function', { timeout: 15000 });
  const r = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-theme'),
    bg: getComputedStyle(document.body).backgroundColor,
    accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
  }));
  check('no data-theme attribute by default (light)', r.attr === null, `attr=${r.attr}`);
  check('body background resolves to the paper light bg', r.bg === LIGHT_BG, `bg=${r.bg}`);
  check('--accent variable resolves (indigo)', r.accent.toLowerCase() === '#6366f1', `accent=${r.accent}`);
  await page.close();
}

group('theme: toggle flips to dark (preserved Tokyo-Night bg)');
{
  const page = await freshPage();
  await page.evaluate(() => { try { localStorage.removeItem('theme'); } catch (e) {} });
  await page.reload();
  await page.waitForFunction(() => typeof window.render === 'function', { timeout: 15000 });
  await page.evaluate(() => toggleTheme());
  await page.waitForTimeout(250); // let the 150ms color transition settle
  const r = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-theme'),
    bg: getComputedStyle(document.body).backgroundColor,
    stored: localStorage.getItem('theme'),
  }));
  check('data-theme becomes dark', r.attr === 'dark');
  check('dark bg matches the original #1a1b26', r.bg === DARK_BG, `bg=${r.bg}`);
  check('choice written to localStorage', r.stored === 'dark');
  await page.close();
}

group('theme: choice persists across reload (no flash)');
{
  const page = await freshPage();
  await page.evaluate(() => { try { localStorage.setItem('theme', 'dark'); } catch (e) {} });
  await page.reload();
  await page.waitForFunction(() => typeof window.render === 'function', { timeout: 15000 });
  const r = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-theme'),
    bg: getComputedStyle(document.body).backgroundColor,
  }));
  check('dark restored on reload from localStorage', r.attr === 'dark' && r.bg === DARK_BG, JSON.stringify(r));

  // Toggle back to light and confirm it persists too.
  await page.evaluate(() => toggleTheme());
  await page.reload();
  await page.waitForFunction(() => typeof window.render === 'function', { timeout: 15000 });
  const back = await page.evaluate(() => ({ attr: document.documentElement.getAttribute('data-theme'), bg: getComputedStyle(document.body).backgroundColor }));
  check('light restored on reload after toggling back', back.attr === null && back.bg === LIGHT_BG, JSON.stringify(back));
  await page.close();
}

group('theme: text colors are variable-driven and differ per theme');
{
  const page = await freshPage();
  await page.evaluate(() => { try { localStorage.removeItem('theme'); } catch (e) {} lines = ['# Heading', 'body text']; window.render(); });
  const lightH = await page.$eval('#editor h1', el => getComputedStyle(el).color);
  await page.evaluate(() => { toggleTheme(); });
  const darkH = await page.$eval('#editor h1', el => getComputedStyle(el).color);
  check('heading color differs between light and dark', lightH !== darkH, `light=${lightH} dark=${darkH}`);
  check('dark heading is the Tokyo-Night bright (#c0caf5)', darkH === 'rgb(192, 202, 245)', `dark=${darkH}`);
  await page.close();
}

group('theme: toggle control exists');
{
  const page = await freshPage();
  const has = await page.evaluate(() => !!document.querySelector('.tool-btn[onclick="toggleTheme()"]'));
  check('a theme toggle button is in the toolbar', has);
  await page.close();
}
