import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.join(import.meta.dirname, '../..');
const credits = readFileSync(path.join(root, 'docs/asset-credits.md'), 'utf8');
const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp)$/i;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
  );
}

const images = walk(path.join(root, 'public'))
  .filter((f) => IMAGE.test(f))
  .map((f) => path.relative(root, f).split(path.sep).join('/'));

const rows = credits
  .split('\n')
  .filter((l) => l.startsWith('| `public/'))
  .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));

describe('asset credits', () => {
  it('finds the images to check', () => {
    expect(images.length).toBeGreaterThan(0);
  });

  it.each(images)('%s has a row in docs/asset-credits.md', (file) => {
    expect(rows.map((r) => r[0].replaceAll('`', ''))).toContain(file);
  });

  it('gives every row a source, a licence and an attribution answer', () => {
    for (const r of rows) {
      expect(r).toHaveLength(6);
      for (const cell of r) expect(cell).not.toBe('');
      expect(r[4]).toMatch(/^(Yes|No)/);
    }
  });

  it('lists no file that does not exist', () => {
    for (const r of rows) expect(images).toContain(r[0].replaceAll('`', ''));
  });
});
