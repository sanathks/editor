// #7 — My documents: persist & switch docs via IndexedDB (no backend). Save,
// list (title + updated), open, rename, delete, debounced auto-save, and
// recover-on-reload for a bare URL. Existing #doc= hash behavior unchanged.

import { freshPage, group, check } from '../harness.mjs';

// The harness shares one browser across cases, and file:// IndexedDB is shared
// per origin — wipe the store so each test starts clean.
async function wipe(page) {
  await page.evaluate(async () => {
    const all = await idbGetAll();
    for (const d of all) await idbDelete(d.id);
    currentDocId = null;
  });
}

group('docs: auto-save persists the current doc with a derived title');
{
  const page = await freshPage();
  await wipe(page);
  const r = await page.evaluate(async () => {
    lines = ['# My Report', 'body text'];
    autosaveNow();
    const all = await idbGetAll();
    return { count: all.length, title: all[0]?.title, content: all[0]?.content, hasId: !!currentDocId };
  });
  check('one doc saved to IndexedDB', r.count === 1, `count=${r.count}`);
  check('title derived from first heading', r.title === 'My Report', `title=${r.title}`);
  check('content stored verbatim', r.content === '# My Report\nbody text');
  check('currentDocId set after save', r.hasId);
  await page.close();
}

group('docs: re-saving updates the same doc (no duplicate)');
{
  const page = await freshPage();
  await wipe(page);
  const count = await page.evaluate(async () => {
    lines = ['# One'];
    autosaveNow();
    lines = ['# One', 'more'];
    autosaveNow();
    return (await idbGetAll()).length;
  });
  check('still a single doc after two saves', count === 1, `count=${count}`);
  await page.close();
}

group('docs: panel lists saved docs; open loads into the editor');
{
  const page = await freshPage();
  await wipe(page);
  await page.evaluate(async () => {
    lines = ['# Alpha doc']; autosaveNow();
    currentDocId = null;
    lines = ['# Beta doc', 'beta body']; autosaveNow();
    currentDocId = null;
    lines = [];
  });
  await page.evaluate(() => openDocsPanel());
  const listed = await page.evaluate(() => [...document.querySelectorAll('#docsList .doc-title')].map(e => e.textContent));
  check('both docs listed', listed.includes('Alpha doc') && listed.includes('Beta doc'), listed.join(' | '));

  // Open Alpha by id.
  const loaded = await page.evaluate(async () => {
    const all = await idbGetAll();
    const alpha = all.find(d => d.title === 'Alpha doc');
    openDoc(alpha.id);
    await new Promise(r => setTimeout(r, 50));
    return { lines: lines.join('\n'), rendered: document.getElementById('editor').textContent.includes('Alpha doc') };
  });
  check('opening loads its content into lines[]', loaded.lines === '# Alpha doc', loaded.lines);
  check('editor re-rendered with opened doc', loaded.rendered);
  await page.close();
}

group('docs: rename updates the stored title');
{
  const page = await freshPage();
  await wipe(page);
  page.on('dialog', async d => { await d.accept('Renamed Title'); });
  const title = await page.evaluate(async () => {
    lines = ['# Original']; autosaveNow();
    const id = currentDocId;
    renameDoc(id);
    await new Promise(r => setTimeout(r, 60));
    return (await idbGet(id)).title;
  });
  check('stored title updated via rename', title === 'Renamed Title', `title=${title}`);
  await page.close();
}

group('docs: delete asks for confirmation and removes the doc');
{
  const page = await freshPage();
  await wipe(page);
  let confirmed = false;
  page.on('dialog', async d => { confirmed = d.type() === 'confirm'; await d.accept(); });
  const remaining = await page.evaluate(async () => {
    lines = ['# To Delete']; autosaveNow();
    const id = currentDocId;
    deleteDoc(id);
    await new Promise(r => setTimeout(r, 60));
    return (await idbGetAll()).length;
  });
  check('delete prompted a confirm dialog', confirmed);
  check('doc removed after confirm', remaining === 0, `remaining=${remaining}`);
  await page.close();
}

group('docs: debounced auto-save fires from saveToUrl');
{
  const page = await freshPage();
  await wipe(page);
  const count = await page.evaluate(async () => {
    lines = ['# Debounced'];
    saveToUrl();                       // schedules autosave (~800ms)
    await new Promise(r => setTimeout(r, 1000));
    return (await idbGetAll()).length;
  });
  check('saveToUrl eventually persists via debounce', count === 1, `count=${count}`);
  await page.close();
}

group('docs: bare URL recovers the most recent doc on reload');
{
  // Save a doc (autosaveNow does NOT touch the URL, so the hash stays bare),
  // then reload the same origin — init() should restore it from IndexedDB.
  const page = await freshPage();
  await wipe(page);
  await page.evaluate(async () => { lines = ['# Recovered work', 'line two']; autosaveNow(); await new Promise(r => setTimeout(r, 30)); });
  await page.reload();
  await page.waitForFunction(() => typeof window.render === 'function', { timeout: 15000 });
  await page.waitForFunction(() => lines.length > 0, { timeout: 3000 }).catch(() => {});
  const recovered = await page.evaluate(() => lines.join('\n'));
  check('most recent doc restored on bare URL reload', recovered === '# Recovered work\nline two', `got: ${JSON.stringify(recovered)}`);
  await page.close();
}

group('docs: existing #doc= share load is unchanged');
{
  const page = await freshPage('# Shared via hash');
  const r = await page.evaluate(() => ({
    rendered: document.getElementById('editor').textContent.includes('Shared via hash'),
    hash: location.hash.startsWith('#doc='),
  }));
  check('hash doc still renders on load', r.rendered);
  check('share hash still present', r.hash);
  await page.close();
}
