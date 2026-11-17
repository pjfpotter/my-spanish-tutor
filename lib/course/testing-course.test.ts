import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SEED_COURSE, TESTING_COURSE } from './seed';
import { loadTestingCourse, TESTING_DATA_DIR } from './testing-course';

// testing-course-five-builders: the testing course reads local, gitignored data when it is there and falls back
// to the default when it is not. These tests use a temporary folder and invented data, never a teacher's content.
const roots: string[] = [];
const makeRoot = (json?: string) => {
  const root = mkdtempSync(path.join(tmpdir(), 'testing-course-'));
  roots.push(root);
  if (json !== undefined) {
    mkdirSync(path.join(root, TESTING_DATA_DIR), { recursive: true });
    writeFileSync(path.join(root, TESTING_DATA_DIR, 'course.json'), json);
  }
  return root;
};
afterEach(() => { for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true }); });

describe('loadTestingCourse', () => {
  it('falls back to the default when the local folder is absent, and says so', () => {
    const r = loadTestingCourse(makeRoot());
    expect(r.source).toBe('default');
    expect(r.course).toBe(TESTING_COURSE);
    expect(r.note).toMatch(/local data not found/);
  });

  it('uses the local data when it is there, and forces the published code and unlock-all', () => {
    const { classCode: _k, unlockAll: _u, calibration: _c, ...own } = SEED_COURSE;
    const r = loadTestingCourse(makeRoot(JSON.stringify({ ...own, title: 'Local testing course', classCode: 'SOMETHING', unlockAll: false })));
    expect(r.source).toBe('local');
    expect(r.course.title).toBe('Local testing course');
    expect(r.course.classCode).toBe('PRBA7K3M');
    expect(r.course.unlockAll).toBe(true);
    expect(r.course.calibration).toEqual(SEED_COURSE.calibration); // none in the file, so the shared one
    const own2 = loadTestingCourse(makeRoot(JSON.stringify({ ...own, calibration: { ...SEED_COURSE.calibration, loadNoteValue: 99 } })));
    expect(own2.course.calibration.loadNoteValue).toBe(99);
  });

  it('falls back, with the reason, when the local data is not valid or not JSON', () => {
    const bad = loadTestingCourse(makeRoot(JSON.stringify({ title: 'Broken' })));
    expect(bad.source).toBe('default');
    expect(bad.note).toMatch(/not valid/);
    const junk = loadTestingCourse(makeRoot('{ nope'));
    expect(junk.source).toBe('default');
    expect(junk.note).toMatch(/not readable JSON/);
  });
});
