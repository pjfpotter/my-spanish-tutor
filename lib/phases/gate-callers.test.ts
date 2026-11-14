import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.join(import.meta.dirname, '../..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

/** course-unlock-testing: the flag is read in one place and every gate call passes it. A new call that forgets it would ignore a testing course. */
describe('every phaseStates call passes the course flag', () => {
  const sources = [...walk(path.join(root, 'app')), ...walk(path.join(root, 'lib'))].filter(
    (f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f) && !f.endsWith(path.join('phases', 'gate.ts')),
  );
  const calls = sources.flatMap((f) =>
    readFileSync(f, 'utf8')
      .split('\n')
      .map((line, i) => ({ file: path.relative(root, f).split(path.sep).join('/'), line: i + 1, text: line }))
      .filter((l) => /phaseStates\(/.test(l.text) && !/^\s*(import|\/\/|\*)/.test(l.text)),
  );

  it('finds the five known call sites', () => {
    expect(calls.map((c) => c.file).sort()).toEqual([
      'app/phases/[phase]/page.tsx',
      'app/phases/automate/page.tsx',
      'app/phases/memorise/classic/page.tsx',
      'app/phases/memorise/page.tsx',
      'lib/server/home.ts',
    ]);
  });

  it('passes unlockAll at each', () => {
    expect(calls.filter((c) => !/unlockAll/.test(c.text)).map((c) => `${c.file}:${c.line}`)).toEqual([]);
  });
});
