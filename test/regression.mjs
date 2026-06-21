// Test runner. Discovers and runs every test/cases/*.mjs file in order, then
// reports and sets the exit code. Owns report()/exit so case files never do.
//
// Add coverage by creating a NEW file test/cases/<n>-<slug>.mjs — never append to
// an existing case file. Two branches adding two different files never collide.

import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { report } from './harness.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const casesDir = resolve(__dirname, 'cases');

const files = (await readdir(casesDir))
  .filter(f => f.endsWith('.mjs'))
  .sort();

for (const f of files) {
  console.log(`\n▶ ${f}`);
  try {
    await import(pathToFileURL(resolve(casesDir, f)).href);
  } catch (err) {
    console.log(`  ✗ case file threw: ${err && err.stack ? err.stack : err}`);
    process.exitCode = 1;
  }
}

const ok = await report();
process.exit(ok && !process.exitCode ? 0 : 1);
