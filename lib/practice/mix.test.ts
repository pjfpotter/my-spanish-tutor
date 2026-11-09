import { describe, expect, it } from 'vitest';
import { MAX_RUN, planMix, TASK_TYPES } from './mixer';
import { containsCognate, pickDistractors, shuffleOptions } from './distractors';
import { START_SCAFFOLD, SCAFFOLDS, buildUpFor, buildUpSteps, capLevel, foldScaffold, nextScaffold, startFromCauses, supportCap, viewFor } from './scaffold';
import { canSkipEarlierTasks } from './recall-first';

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe('session mixer', () => {
  it('uses at least three types in a ten-item session, never more than three in a row, and ends spoken', () => {
    for (let s = 1; s <= 200; s++) {
      const mix = planMix(10, TASK_TYPES, seeded(s));
      expect(mix).toHaveLength(10);
      expect(new Set(mix).size).toBeGreaterThanOrEqual(3);
      expect(mix[9]).toBe('say_aloud');
      for (let i = 0; i + MAX_RUN < mix.length; i++) {
        expect(mix.slice(i, i + MAX_RUN + 1).every((t) => t === mix[i])).toBe(false);
      }
    }
  });
  it('rises: the hardest types do not open the session', () => {
    for (let s = 1; s <= 100; s++) {
      const mix = planMix(12, TASK_TYPES, seeded(s));
      expect(['scramble', 'say_aloud']).not.toContain(mix[0]);
      expect(['scramble', 'say_aloud']).not.toContain(mix[1]);
    }
  });
  it('copes with long sessions and with a restricted set of types', () => {
    const long = planMix(40, TASK_TYPES, seeded(7));
    for (let i = 0; i + MAX_RUN < long.length; i++) expect(long.slice(i, i + MAX_RUN + 1).every((t) => t === long[i])).toBe(false);
    expect(planMix(5, ['hear_choose', 'say_aloud'], seeded(3)).at(-1)).toBe('say_aloud');
    expect(planMix(0)).toEqual([]);
  });
});

describe('distractors', () => {
  const pool = [
    { spanish: 'jugar al fútbol', english: 'to play football' },
    { spanish: 'tocar la guitarra', english: 'to play the guitar' },
    { spanish: 'escuchar música', english: 'to listen to music' },
    { spanish: 'ir al cine', english: 'to go to the cinema' },
    { spanish: 'leer libros', english: 'to read books' },
    { spanish: 'bailar', english: 'to dance' },
  ];
  it('keeps wrong options close in length and never repeats the answer', () => {
    const correct = pool[1];
    for (let s = 1; s <= 50; s++) {
      for (const d of pickDistractors(correct, pool, 2, seeded(s))) {
        expect(d.spanish).not.toBe(correct.spanish);
        expect(Math.abs(d.spanish.length - correct.spanish.length)).toBeLessThanOrEqual(Math.max(3, correct.spanish.length * 0.4));
      }
    }
  });
  it('includes a cognate wrong option when the right one has a cognate', () => {
    const correct = pool[2];
    expect(containsCognate(correct.spanish, correct.english)).toBe(true);
    for (let s = 1; s <= 50; s++) {
      const picked = pickDistractors(correct, pool, 2, seeded(s));
      expect(picked.some((o) => containsCognate(o.spanish, o.english))).toBe(true);
    }
  });
  it('reports where the right option landed', () => {
    const { options, correctIndex } = shuffleOptions('right', ['a', 'b'], seeded(4));
    expect(options[correctIndex]).toBe('right');
  });
});

describe('scaffolding', () => {
  it('steps down one kind at a time as the student does well, never skipping a kind', () => {
    let s = START_SCAFFOLD;
    const seen = [s.at];
    for (let i = 0; i < 12; i++) {
      s = nextScaffold(s, 95);
      if (seen.at(-1) !== s.at) seen.push(s.at);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4]);
    expect(SCAFFOLDS[4]).toBe('english');
  });
  it('steps back up when the student struggles, and a middling attempt changes nothing', () => {
    let s = { at: 3, good: 0, hard: 0 };
    s = nextScaffold(s, 20);
    s = nextScaffold(s, 20);
    expect(s.at).toBe(2);
    expect(nextScaffold(s, 60).at).toBe(2);
  });
  it('carries across sessions and starts from the cause', () => {
    expect(foldScaffold([90, 90, 90, 90]).at).toBe(2);
    expect(startFromCauses(['chunk_hotspot']).at).toBe(2);
    expect(startFromCauses(['not_known_well_enough']).at).toBe(1);
    expect(startFromCauses([]).at).toBe(0);
  });
  it('shows the right amount of script for each kind, and never a picture', () => {
    const chunks = [['Me', 'gusta'], ['jugar', 'al', 'fútbol'], ['porque', 'es', 'divertido']];
    expect(viewFor('english', chunks).shown.every((x) => !x)).toBe(true);
    expect(viewFor('first_words', chunks).shown).toEqual([true, false, true, false, false, true, false, false]);
    expect(viewFor('gaps', chunks).shown.some(Boolean) && viewFor('gaps', chunks).shown.some((x) => !x)).toBe(true);
    expect(viewFor('chunk_reveal', chunks, 0).shown.filter(Boolean)).toHaveLength(2);
    expect(viewFor('listen_repeat', chunks).listenFirst).toBe(true);
    expect(Object.keys(viewFor('gaps', chunks))).not.toContain('picture');
  });
  it('builds up chunk by chunk: each alone, then pairs, then all', () => {
    expect(buildUpSteps(3)).toEqual([[0], [1], [2], [0, 1], [1, 2], [0, 1, 2]]);
    expect(buildUpSteps(1)).toEqual([[0]]);
  });
});

describe('recall first', () => {
  it('skips the earlier tasks only for an unassisted, accurate first try', () => {
    expect(canSkipEarlierTasks(85, false)).toBe(true);
    expect(canSkipEarlierTasks(85, true)).toBe(false);
    expect(canSkipEarlierTasks(60, false)).toBe(false);
  });
});

describe('cause tags and the build-up', () => {
  it('a live cause tag stops support falling below what it needs', () => {
    expect(supportCap([])).toBeNull();
    expect(capLevel(4, [])).toBe(4); // no tag, no cap
    expect(capLevel(4, ['chunk_hotspot'])).toBe(2); // never first words or English alone while a chunk is a hotspot
    expect(capLevel(3, ['stress_related'])).toBe(2);
    expect(capLevel(4, ['not_known_well_enough'])).toBe(1);
    expect(capLevel(0, ['chunk_hotspot'])).toBe(0); // more help than the cap is left alone
  });
  it('the strongest cap wins when several tags apply', () => {
    expect(capLevel(4, ['not_known_well_enough', 'chunk_hotspot'])).toBe(1);
    expect(capLevel(4, ['sound_spelling_gap', 'chunk_hotspot'])).toBe(0);
  });
  it('builds up a stumbling chunk: alone, then with its neighbour, then the whole answer follows', () => {
    expect(buildUpFor(4, 1)).toEqual([[1], [1, 2]]);
    expect(buildUpFor(4, 0)).toEqual([[0], [0, 1]]);
    expect(buildUpFor(4, 3)).toEqual([[3], [2, 3]]); // the last chunk pairs with the one before it
  });
  it('has nothing to build up in a short answer or for a position that is not there', () => {
    expect(buildUpFor(2, 1)).toEqual([]);
    expect(buildUpFor(4, -1)).toEqual([]);
    expect(buildUpFor(4, 4)).toEqual([]);
  });
});
