// Performance budget check (task 18.6): fails if the production build is bigger than the budget in
// docs/performance-budget.md. Run after `npm run build`:  npm run check:budget
import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const KB = 1024;

// Keep these in step with docs/performance-budget.md.
const BUDGET = {
  // JavaScript that any student or teacher screen can load, gzipped. Lab and spike pages are left out: nobody
  // meets them in normal use. Raised from 300 on 2026-11-12 (measured then: see docs/performance-budget.md); optimise later.
  jsGzipKb: 400,
  cssGzipKb: 20, // all CSS, gzipped (measured 4 KB)
  fontsKb: 250, // web fonts as shipped (measured 117 KB)
  publicKb: 3072, // everything under public/, including wallpapers when they arrive (measured 2.8 MB after the sound effects were compressed)
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

// Which chunks each page loads, from the build's own records: the shared chunks every page starts with, plus
// the chunks named in that page's client manifest. The legacy-browser polyfill is not counted: modern browsers skip it.
const EXCLUDED = [/^\/lab(\/|$)/, /^\/spike(\/|$)/, /^\/_/];
const manifest = JSON.parse(readFileSync(path.join(root, '.next/build-manifest.json'), 'utf8'));
const shared = new Set(manifest.rootMainFiles ?? []);
const appDir = path.join(root, '.next/server/app');
const routes = files(appDir)
  .filter((f) => f.endsWith('page_client-reference-manifest.js'))
  .map((f) => ({
    route: '/' + path.relative(appDir, path.dirname(f)).split(path.sep).join('/').replace(/^\.$/, ''),
    chunks: new Set([...shared, ...(readFileSync(f, 'utf8').match(/static\/chunks\/[^"'\\]+?\.js/g) ?? [])]),
  }));
const counted = routes.filter((r) => !EXCLUDED.some((x) => x.test(r.route)));
if (!counted.length) {
  console.error('Could not read which chunks each page loads. Has the build layout changed?');
  process.exit(2);
}
const sizeOf = (chunks) => gz([...chunks].map((c) => path.join(root, '.next', c)).filter((f) => existsSync(f)));
const used = new Set(counted.flatMap((r) => [...r.chunks]));
const heaviest = counted.map((r) => ({ route: r.route, kb: sizeOf(r.chunks) })).sort((a, b) => b.kb - a.kb)[0];

const measured = {
  jsGzipKb: sizeOf(used),
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
console.log(`\nHeaviest page: ${heaviest.route} loads ${heaviest.kb.toFixed(1)} KB of JavaScript, gzipped.`);
console.log(`Left out: ${routes.filter((r) => !counted.includes(r)).map((r) => r.route).join(', ') || 'nothing'}.`);
if (failed) {
  console.error('\nBuild is over the performance budget (docs/performance-budget.md).');
  process.exit(1);
}
