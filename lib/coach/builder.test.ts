import { describe, expect, it } from 'vitest';
import { SEED_COURSE } from '../course/seed';
import { addGlue, addSlot, clearBlock, emptyParts, fillBlock, fittingChunks, isEmpty, kindOfCategory, partsFromText, questionChunks, removePart, textFromParts } from './builder';
import { assessAnswer, matchChunks, tokens } from './rubric';
import { kindOf } from '../practice/chunk-kind';

const course = SEED_COURSE;
const cal = course.calibration;
const q1 = course.questions[0];

describe('the sentence builder model of an answer (task 26.1b)', () => {
  it('starts from empty slots, one per topic, with nothing filled in and no target', () => {
    const parts = emptyParts(q1.template!);
    expect(parts).toHaveLength(q1.template!.length);
    expect(parts.every((p) => p.kind === 'block' && p.text === null)).toBe(true);
    expect(isEmpty(parts)).toBe(true);
    expect(textFromParts(parts)).toBe('');
  });

  it('colours a slot by the same chunk kind the automatise phase uses', () => {
    for (const cat of q1.template!) {
      const first = course.chunks.find((c) => c.category === cat)!;
      expect(kindOfCategory(cat, course.chunks)).toBe(kindOf(first));
    }
  });

  it('offers only chunks of the slot\'s kind from the question\'s own builder, none already used, recycled first', () => {
    let parts = emptyParts(q1.template!);
    const type = parts.find((p) => p.kind === 'block' && p.category === 'film type')!;
    const all = fittingChunks(parts, type.id, course.chunks, q1.topics);
    expect(all.length).toBeGreaterThan(1);
    expect(all.every((c) => c.category === 'film type')).toBe(true);
    parts = fillBlock(parts, type.id, all[0]);
    const other = addSlot(parts, 'film type');
    const again = fittingChunks(other, other[other.length - 1].id, course.chunks, q1.topics);
    expect(again.map((c) => c.spanish)).not.toContain(all[0].spanish); // no repeats within an answer
    const reasons = fittingChunks(emptyParts(['reason']), 'x', course.chunks, ['reason']);
    expect(reasons).toEqual([]); // unknown part: nothing
  });

  it('never offers a chunk from another question\'s sentence builder', () => {
    const pool = new Set(questionChunks(course.chunks, q1.topics).map((c) => c.spanish));
    for (const p of emptyParts(q1.template!)) {
      for (const c of fittingChunks(emptyParts(q1.template!), p.id, course.chunks, q1.topics)) expect(pool.has(c.spanish)).toBe(true);
    }
    expect(questionChunks(course.chunks, q1.topics).some((c) => c.category === 'clothing')).toBe(false);
  });

  it('builds the answer text from filled slots, skipping empty ones, with a capital and a full stop', () => {
    let parts = emptyParts(q1.template!);
    const pick = (cat: string, spanish: string) => {
      const part = parts.find((p) => p.kind === 'block' && p.category === cat)!;
      parts = fillBlock(parts, part.id, course.chunks.find((c) => c.spanish === spanish)!);
    };
    pick('film opinion', 'Me gustan las películas de');
    pick('film type', 'acción');
    expect(textFromParts(parts)).toBe('Me gustan las películas de acción.');
    pick('reason', 'porque son');
    pick('reason adjective', 'divertidas');
    const text = textFromParts(parts);
    expect(text).toBe('Me gustan las películas de acción porque son divertidas.');
    expect(assessAnswer(cal, text).value).toBe(cal.frame.value);
  });

  it('clears a slot and removes a part', () => {
    let parts = emptyParts(['film type']);
    parts = fillBlock(parts, parts[0].id, course.chunks.find((c) => c.spanish === 'acción')!);
    expect(textFromParts(parts)).toBe('Acción.');
    expect(textFromParts(clearBlock(parts, parts[0].id))).toBe('');
    expect(removePart(parts, parts[0].id)).toEqual([]);
  });

  it('accepts joining words anywhere, between blocks, and they add no value', () => {
    let parts = emptyParts(q1.template!);
    const fill = (cat: string, spanish: string) => {
      const part = parts.find((p) => p.kind === 'block' && p.category === cat)!;
      parts = fillBlock(parts, part.id, course.chunks.find((c) => c.spanish === spanish)!);
    };
    fill('film opinion', 'Me gustan las películas de');
    fill('film type', 'acción');
    fill('reason', 'porque son');
    fill('reason adjective', 'divertidas');
    const before = assessAnswer(cal, textFromParts(parts)).value;
    const action = parts.find((p) => p.kind === 'block' && p.text === 'acción')!;
    parts = addGlue(parts, action.id, 'y');
    expect(textFromParts(parts)).toContain('acción y porque son');
    expect(assessAnswer(cal, textFromParts(parts)).value).toBe(before);
  });
});

describe('reading a saved answer back into blocks', () => {
  it('round-trips every seeded model answer without changing its words or its value', () => {
    for (const a of course.modelAnswers) {
      const q = course.questions.find((x) => x.position === a.questionPosition)!;
      const parts = partsFromText(a.text, course.chunks);
      const text = textFromParts(parts);
      expect(tokens(text), a.text).toEqual(tokens(a.text));
      expect(assessAnswer(cal, text).value, a.text).toBe(assessAnswer(cal, a.text).value);
      expect(parts.length, q.spanish).toBeGreaterThan(0);
    }
  });

  it('keeps the punctuation between sentences', () => {
    const text = 'Me gusta montar en bici porque es divertido. Los fines de semana juego a los videojuegos.';
    expect(textFromParts(partsFromText(text, course.chunks))).toBe('Me gusta montar en bici porque es divertido. Los fines de semana juego a los videojuegos.');
  });

  it('is empty for an empty answer', () => {
    expect(partsFromText('  ', course.chunks)).toEqual([]);
  });
});

describe('every question\'s own sentence builder can build its starter answers', () => {
  it('each seeded model answer uses only chunks from its question\'s topics', () => {
    for (const a of course.modelAnswers) {
      const q = course.questions.find((x) => x.position === a.questionPosition)!;
      const wanted = new Set(q.topics);
      for (const m of matchChunks(a.text, course.chunks)) {
        expect(wanted.has(m.chunk.category), `Q${q.position} "${m.chunk.spanish}" is in "${m.chunk.category}", which the question does not list`).toBe(true);
      }
    }
  });
});
