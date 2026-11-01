// Performance budget check (task 18.6): fails if the production build is bigger than the budget in
// docs/performance-budget.md. Run after `npm run build`:  npm run check:budget
import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const KB = 1024;

// Keep these in step with docs/performance-budget.md.
const BUDGET = {
  jsGzipKb: 300, // all JavaScript chunks, gzipped (measured 203 KB on 2026-11-01)
  cssGzipKb: 20, // all CSS, gzipped (measured 4 KB)
  fontsKb: 250, // web fonts as shipped (measured 117 KB)
  publicKb: 3072, // everything under public/, including wallpapers when they arrive (measured 8 KB)
};

function files(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)],
  );
}
const gz = (list) => list.reduce((sum, f) => sum + gzipSync(readFileSync(f)).length, 0) / KB;
const raw = (list) => list.reduce((sum, f) => sum + statSync(f).size, 0) / KB;

const staticFiles = files(path.join(root, '.next/static'));
if (!staticFiles.length) {
  console.error('No build found. Run `npm run build` first.');
  process.exit(2);
}

const measured = {
  jsGzipKb: gz(staticFiles.filter((f) => f.endsWith('.js'))),
  cssGzipKb: gz(staticFiles.filter((f) => f.endsWith('.css'))),
  fontsKb: raw(staticFiles.filter((f) => /\.(woff2?|ttf|otf)$/.test(f))),
  publicKb: raw(files(path.join(root, 'public'))),
};

let failed = false;
for (const [key, limit] of Object.entries(BUDGET)) {
  const value = measured[key];
  const over = value > limit;
  failed ||= over;
  console.log(`${over ? 'OVER ' : 'ok   '} ${key.padEnd(10)} ${value.toFixed(1).padStart(8)} / ${limit} KB`);
}
if (failed) {
  console.error('\nBuild is over the performance budget (docs/performance-budget.md).');
  process.exit(1);
}
