import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const doc = readFileSync(path.join(import.meta.dirname, '../../docs/device-matrix.md'), 'utf8');
const rows = doc
  .split('\n')
  .filter((l) => l.startsWith('|'))
  .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
  .filter((cells) => cells.length === 6 && cells[0] !== 'Device' && !cells[0].startsWith('---'));

describe('device matrix document', () => {
  it('lists the four target devices', () => {
    expect(rows.map((r) => `${r[0]} ${r[2]}`)).toEqual([
      'Android phone Built-in',
      'iPhone Built-in',
      'Chromebook Built-in',
      'Chromebook Headset',
    ]);
  });

  it('records a recognition path decision for every device', () => {
    for (const row of rows) expect(row[4]).toMatch(/^(Browser recognition|Server fallback)/);
  });

  it('marks any device without a verified run as unverified and on the server fallback', () => {
    for (const row of rows) {
      if (row[3] !== 'Verified') {
        expect(row[3]).toBe('Unverified');
        expect(row[4]).toMatch(/^Server fallback/);
      }
    }
  });
});
