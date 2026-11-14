import { describe, expect, it } from 'vitest';
import { SEED_COURSE } from '../course/seed';
import { automateStateFrom } from '../automate/state';
import { levelsFor } from '../practice/ladder';
import { answerPieces } from '../practice/tasks';
import { FAKE_STUDENTS, LAB_CHUNKS, LAB_ITEM_PREFIX, STUDENT_KEYS } from './fake-students';
import { formatReport, readJson, resetRound, rowsKey, writeJson, type LogRow, type Note, type Stamp } from './notes';

const depth = (answer: string) => levelsFor(answerPieces(answer, LAB_CHUNKS).length || 1).length;

describe('the fake students', () => {
  it('each has the five seeded questions with a real model answer', () => {
    for (const key of STUDENT_KEYS) {
      const s = FAKE_STUDENTS[key];
      expect(s.items).toHaveLength(5);
      for (const it of s.items) {
        expect(SEED_COURSE.modelAnswers.some((a) => a.questionPosition === it.position && a.text === it.answer)).toBe(true);
      }
    }
  });

  it('differ in how many chunks an answer has, and in the levels for at least one question', () => {
    const chunks = (k: 'short' | 'long') => FAKE_STUDENTS[k].items.reduce((n, i) => n + answerPieces(i.answer, LAB_CHUNKS).length, 0);
    expect(chunks('long')).toBeGreaterThan(chunks('short'));
    // The ladder has at most four levels, so only a very short answer has fewer. The seeded second question does.
    const levels = (k: 'short' | 'long') => FAKE_STUDENTS[k].items.map((i) => depth(i.answer));
    expect(levels('short')).not.toEqual(levels('long'));
    const mixed = FAKE_STUDENTS.mixed.items.map((i) => answerPieces(i.answer, LAB_CHUNKS).length);
    expect(new Set(mixed).size).toBeGreaterThan(1);
  });

  it('use ids that can never match a real question id', () => {
    const ids = STUDENT_KEYS.flatMap((k) => FAKE_STUDENTS[k].items.map((i) => i.id));
    expect(new Set(ids).size).toBe(15);
    for (const id of ids) {
      expect(id.startsWith(LAB_ITEM_PREFIX)).toBe(true);
      expect(id).not.toMatch(/^[0-9a-f-]{36}$/);
      expect(id.startsWith('demo-')).toBe(false);
    }
  });
});

const stamp = (over: Partial<Stamp> = {}): Stamp => ({ student: 'short', stage: 'feedback', position: 2, level: 'The first chunk', windowMs: 6800, responseMs: 3100, accuracy: 80, assisted: false, blank: false, ...over });

describe('the report', () => {
  const device = 'Chrome on a phone';

  it('says so when there are no notes and no attempts', () => {
    const text = formatReport({ device, student: 'short', notes: [], log: [] });
    expect(text).toContain('Notes (0)');
    expect(text).toContain('Attempts (0)');
    expect(text).toContain('none');
  });

  it('carries the figures with each note', () => {
    const notes: Note[] = [{ at: 't', tags: ['too fast'], text: 'The window closed before I finished.', stamp: stamp() }];
    const text = formatReport({ device, student: 'short', notes, log: [] });
    expect(text).toContain('Q2');
    expect(text).toContain('window 6.8s');
    expect(text).toContain('response 3.1s');
    expect(text).toContain('accuracy 80%');
    expect(text).toContain('tags: too fast');
    expect(text).toContain('The window closed before I finished.');
  });

  it('lists attempts even with no notes, marking blanks and hints', () => {
    const log: LogRow[] = [
      { at: 't', student: 'long', position: 1, level: 'The whole answer', windowMs: 8000, responseMs: null, accuracy: null, assisted: false, blank: true },
      { at: 't', student: 'long', position: 2, level: 'The first chunk', windowMs: 8000, responseMs: 2500, accuracy: 100, assisted: true, blank: false },
    ];
    const text = formatReport({ device, student: 'long', notes: [], log });
    expect(text).toContain('blank');
    expect(text).toContain('hint');
    expect(text).toContain('2.5s');
  });
});

describe('device storage', () => {
  it('does not throw when storage is blocked', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    const real = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: blocked, setItem: blocked, removeItem: blocked } });
    try {
      expect(readJson('x', 7)).toBe(7);
      expect(() => writeJson('x', 1)).not.toThrow();
      expect(() => resetRound('short', ['lab:short:1'])).not.toThrow();
    } finally {
      if (real) Object.defineProperty(globalThis, 'localStorage', real);
      else delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });
});

describe('the lab keeps its own state', () => {
  it('works out the window and rank from its own attempts with the same rules as the phase', () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({ item_id: `lab:short:${(i % 5) + 1}`, session_id: 's', outcome: 'correct', accuracy: 100, response_time_ms: 1200, assisted: false }));
    const s = automateStateFrom(rows, FAKE_STUDENTS.short.items.map((i) => i.id));
    expect(s.windowMs).toBeLessThan(8000);
    expect(s.rank.rank).not.toBeNull();
    expect(automateStateFrom([], ['a']).windowMs).toBe(8000);
  });

  it('keys its attempts per student so they cannot touch another student or the real phase', () => {
    expect(rowsKey('short')).toBe('lab:automate:rows:short');
    expect(rowsKey('short')).not.toBe(rowsKey('long'));
  });
});
