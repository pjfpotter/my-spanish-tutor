import { describe, expect, it } from 'vitest';
import type { Stage } from './ingest';
import { describeNotice } from './notice';
import { describeResult, FAILURE_MESSAGE, messageAt, progressFor, STAGE_MESSAGES } from './progress';

const STAGES: Stage[] = ['read', 'draft', 'check', 'repair', 'pairs', 'done'];

describe('upload progress (task 4.8)', () => {
  it('has Spanish messages with an English subtitle for every stage', () => {
    for (const s of STAGES) {
      expect(STAGE_MESSAGES[s].length).toBeGreaterThan(0);
      for (const m of STAGE_MESSAGES[s]) { expect(m.es).toMatch(/[A-Za-záéíóúñ¡]/); expect(m.en).toMatch(/\w/); expect(m.es).not.toBe(m.en); }
    }
  });

  it('never goes backwards when a repair follows a check', () => {
    let p = 0;
    for (const s of ['read', 'draft', 'check', 'repair', 'check', 'repair', 'check', 'pairs', 'done'] as Stage[]) { const next = progressFor(s, p); expect(next).toBeGreaterThanOrEqual(p); p = next; }
    expect(p).toBe(100);
  });

  it('rotates messages within a stage and wraps', () => {
    const list = STAGE_MESSAGES.read;
    expect(messageAt('read', 0)).toEqual(list[0]);
    expect(messageAt('read', list.length)).toEqual(list[0]);
    expect(messageAt('read', -1)).toEqual(list[list.length - 1]);
  });

  it('explains each result in plain English', () => {
    expect(describeResult({ status: 'ready' })).toEqual({ kind: 'ready' });
    expect(describeResult({ status: 'fallback' })).toMatchObject({ kind: 'fallback', note: expect.stringContaining('basic help') });
    expect(describeResult({ status: 'blocked' })).toMatchObject({ kind: 'problem', canRetry: false });
    expect(describeResult({ status: 'unreadable' })).toMatchObject({ kind: 'problem', canRetry: true });
    expect(FAILURE_MESSAGE).toContain('Try again');
  });
});

describe('correction notice (task 4.9)', () => {
  it('counts and lists each correction with its type', () => {
    const n = describeNotice([
      { chunk: 'a:1', field: 'es', original: 'marrónes', corrected: 'marrones', type: 'spelling' },
      { chunk: 'b:0', field: 'en', original: null, corrected: 'normally', type: 'missing-english' },
      { chunk: 'b:2', field: 'es', original: 'un pared', corrected: 'una pared', type: 'agreement' },
    ]);
    expect(n.headline).toBe('3 corrections were made.');
    expect(n.lines.map((l) => l.text)).toEqual(['Spelling: “marrónes” is now “marrones”', 'Added English: “normally”', 'Agreement: “un pared” is now “una pared”']);
  });

  it('says one correction in the singular, and none when there are none', () => {
    expect(describeNotice([{ chunk: 'a:0', field: 'es', original: 'x', corrected: 'y', type: 'spelling' }]).headline).toBe('1 correction was made.');
    expect(describeNotice([])).toEqual({ count: 0, headline: 'No corrections were needed.', lines: [] });
  });
});
