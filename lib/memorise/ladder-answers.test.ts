import { describe, expect, it } from 'vitest';
import type { Chunk } from '../course/schema';
import { SEED_COURSE } from '../course/seed';
import { advance, finish, freshState, newSession, resolveSay, resolveTap, type World } from './ladder';
import { hasGloss, ladderAnswerOf } from './ladder-answers';

const item = (answer: string) => ({ id: 'q2', position: 2, question: '¿Te gustaría ir al cine?', english: 'Would you like to go to the cinema?', answer });
const chunks: Chunk[] = [
  { spanish: 'Lo siento, no puedo', english: "I'm sorry, I can't", category: 'other', featureTags: [], recycled: false },
  { spanish: 'porque tengo que', english: 'because I have to', category: 'reason', featureTags: [], recycled: false },
  { spanish: 'hacer los deberes', english: 'do my homework', category: 'detail', featureTags: [], recycled: false },
];

describe('ladderAnswerOf', () => {
  it("splits the student's own answer into its chunks with glosses", () => {
    const a = ladderAnswerOf(item('Lo siento, no puedo porque tengo que hacer los deberes.'), chunks);
    expect(a.chunks.map((c) => c.t)).toEqual(['Lo siento, no puedo', 'porque tengo que', 'hacer los deberes']);
    expect(a.chunks.map((c) => c.en)).toEqual(["I'm sorry, I can't", 'because I have to', 'do my homework']);
    expect(a.n).toBe(2);
    expect(a.en).toContain('do my homework');
  });

  it('keeps words that match no chunk as plain bits with no gloss', () => {
    const a = ladderAnswerOf(item('Hoy lo siento, no puedo'), chunks);
    expect(a.chunks.map((c) => c.t)).toEqual(['Hoy', 'lo siento, no puedo']);
    expect(a.chunks.map(hasGloss)).toEqual([false, true]);
  });

  it('numbers sentences from zero with no gaps, so a long answer is taught a sentence at a time', () => {
    const a = ladderAnswerOf(item('Lo siento, no puedo. Porque tengo que hacer los deberes.'), chunks);
    expect(a.chunks.map((c) => c.s)).toEqual([0, 1, 1]);
  });

  it('works on every seed model answer, and a whole lesson of each ends', () => {
    const pool = SEED_COURSE.chunks;
    for (const model of SEED_COURSE.modelAnswers ?? []) {
      const answer = ladderAnswerOf(item(model.text), pool);
      const w: World = { answers: [answer], day: 1, euros: 0, states: [freshState()] };
      for (const type of ['meet', 'build', 'wipe', 'lock'] as const) {
        const s = newSession(w, { type, a: 0, part: 0 }, () => 0.5);
        let n = 0;
        while (advance(s)) {
          if (++n > 100) throw new Error(`lesson ${type} did not end for "${model.text}"`);
          if (s.cur!.t === 'say') resolveSay(w, s, { kind: 'clean' }, () => 0.5);
          else resolveTap(s, true, '', () => 0.5);
        }
        finish(w, s);
      }
    }
  });
});

describe('an answer the sentence builder knows nothing about', () => {
  const run = (answer: string) => {
    const a = ladderAnswerOf(item(answer), []);
    const w: World = { answers: [a], day: 1, euros: 0, states: [freshState()] };
    const taps: string[] = [];
    for (const type of ['meet', 'build', 'wipe', 'lock'] as const) {
      const s = newSession(w, { type, a: 0, part: 0 }, () => 0.5);
      let n = 0;
      while (advance(s)) {
        if (++n > 100) throw new Error(`lesson ${type} did not end`);
        const cur = s.cur!;
        if (cur.t === 'say') resolveSay(w, s, { kind: 'clean' }, () => 0.5);
        else {
          taps.push(`${cur.t}:${cur.i ?? ''}`);
          // A tap about a bit must have something real to ask.
          if (cur.t === 'meaning') expect(a.chunks[cur.i ?? 0].en).not.toBe('');
          if (cur.t === 'next') expect(a.chunks[(cur.i ?? 0) + 1]).toBeDefined();
          resolveTap(s, true, '', () => 0.5);
        }
      }
      finish(w, s);
    }
    return taps;
  };
  it('a one-word answer still gives a lesson that ends and asks nothing it cannot answer', () => {
    run('Sí');
  });
  it('plain bits are never asked about by meaning', () => {
    run('Hoy hace mucho calor pero me gusta');
  });
});
