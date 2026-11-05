import { describe, expect, it } from 'vitest';
import { createVoiceDetector, DEFAULT_VOICE, levelOf } from './onset';
import { isRepeatRequest, firstWords } from './repeat';
import { DEFAULT_RANK, rankFor, RANKS, rollingAverage, stepFor } from './rank';
import { nextOrder, planRound, planSpeeds } from './round';
import { DEFAULT_AUTOMATE, foldWindow, isTestReady, meetsTarget, nextWindow, startWindow } from './window';

/** A deterministic random source for repeatable shuffles. */
const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const IDS = ['q1', 'q2', 'q3', 'q4', 'q5'];

describe('rounds (task 9.1)', () => {
  it('covers every question once, including the recycled one', () => {
    const round = planRound(IDS, null, seeded(1));
    expect(round.map((r) => r.id).sort()).toEqual(IDS);
  });

  it('never repeats the previous order, whatever the random source does', () => {
    for (let seed = 1; seed < 200; seed++) {
      const previous = nextOrder(IDS, null, seeded(seed));
      const again = nextOrder(IDS, previous, seeded(seed)); // the same seed would repeat it without the guard
      expect(again).not.toEqual(previous);
      expect([...again].sort()).toEqual(IDS);
    }
  });

  it('varies the speeds within a round', () => {
    for (let seed = 1; seed < 50; seed++) expect(new Set(planSpeeds(5, seeded(seed))).size).toBeGreaterThan(1);
  });

  it('handles one question', () => {
    expect(nextOrder(['only'], ['only'])).toEqual(['only']);
  });
});

describe('voice onset (task 9.2)', () => {
  const series = (from: number, to: number, level: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let t = from; t < to; t += 20) out.push([t, level]);
    return out;
  };

  it('computes a level from samples', () => {
    expect(levelOf(new Uint8Array(100).fill(128))).toBe(0);
    expect(levelOf(new Uint8Array(100).fill(255))).toBeCloseTo(0.99, 1);
    expect(levelOf([])).toBe(0);
  });

  it('reports onset at the moment the level first rose, not when it was confirmed', () => {
    const d = createVoiceDetector();
    for (const [t, l] of series(0, 400, 0.005)) d.feed(l, t); // quiet: learns the background
    d.arm();
    let onset: number | undefined;
    for (const [t, l] of [...series(400, 2300, 0.005), ...series(2300, 3000, 0.3)]) {
      const e = d.feed(l, t);
      if (e?.type === 'onset') onset = e.at;
    }
    expect(onset).toBe(2300);
  });

  it('ignores a click shorter than the hold time', () => {
    const d = createVoiceDetector();
    d.arm();
    const events = [...series(0, 100, 0.005), [100, 0.5] as [number, number], ...series(120, 1000, 0.005)].map(([t, l]) => d.feed(l, t)).filter(Boolean);
    expect(events).toEqual([]);
  });

  it('ends after the configured silence once speech has started', () => {
    const d = createVoiceDetector();
    d.arm();
    const events = [...series(0, 800, 0.3), ...series(800, 3000, 0.005)].map(([t, l]) => d.feed(l, t)).filter(Boolean);
    expect(events.map((e) => e!.type)).toEqual(['onset', 'end']);
    expect(events[1]!.at - 780).toBeGreaterThanOrEqual(DEFAULT_VOICE.endSilenceMs);
  });

  it('raises the threshold in a noisy room so background noise is not speech', () => {
    const d = createVoiceDetector();
    for (const [t, l] of series(0, 600, 0.05)) d.feed(l, t); // a noisy room
    d.arm();
    const events = series(600, 1500, 0.07).map(([t, l]) => d.feed(l, t)).filter(Boolean); // barely above the noise
    expect(events).toEqual([]);
    expect(series(1500, 2000, 0.4).map(([t, l]) => d.feed(l, t)).filter(Boolean)[0]).toMatchObject({ type: 'onset' });
  });

  it('does nothing before it is armed, however loud the room is', () => {
    const d = createVoiceDetector();
    expect(series(0, 1000, 0.6).map(([t, l]) => d.feed(l, t)).filter(Boolean)).toEqual([]);
  });
});

describe('adaptive window (task 9.3)', () => {
  const fast = { accuracy: 95, responseMs: 1200, blank: false };
  const slowOk = { accuracy: 90, responseMs: 7000, blank: false };
  const blank = { accuracy: null, responseMs: null, blank: true };

  it('starts at the configured window', () => {
    expect(startWindow().windowMs).toBe(DEFAULT_AUTOMATE.startMs);
  });

  it('shortens after several fast, accurate answers', () => {
    const w = foldWindow([fast, fast, fast]);
    expect(w.windowMs).toBeLessThan(DEFAULT_AUTOMATE.startMs);
    expect(w.windowMs).toBe(Math.round(DEFAULT_AUTOMATE.startMs * DEFAULT_AUTOMATE.shrinkBy));
  });

  it('does not shorten for two, or for correct but slow answers', () => {
    expect(foldWindow([fast, fast]).windowMs).toBe(DEFAULT_AUTOMATE.startMs);
    expect(foldWindow([slowOk, slowOk, slowOk, slowOk]).windowMs).toBe(DEFAULT_AUTOMATE.startMs);
  });

  it('lengthens after two struggles in a row, and a blank counts as a struggle', () => {
    expect(foldWindow([blank, blank]).windowMs).toBe(Math.round(DEFAULT_AUTOMATE.startMs * DEFAULT_AUTOMATE.growBy));
    expect(foldWindow([blank, { accuracy: 10, responseMs: 2000, blank: false }]).windowMs).toBeGreaterThan(DEFAULT_AUTOMATE.startMs);
  });

  it('a good answer between struggles resets the count', () => {
    expect(foldWindow([blank, slowOk, blank]).windowMs).toBe(DEFAULT_AUTOMATE.startMs);
  });

  it('stays inside the fixed limits', () => {
    expect(foldWindow(Array(60).fill(fast)).windowMs).toBe(DEFAULT_AUTOMATE.minMs);
    expect(foldWindow(Array(60).fill(blank)).windowMs).toBe(DEFAULT_AUTOMATE.maxMs);
  });

  it('shrinks relative to the current window, so a shorter window needs a faster answer', () => {
    let s = startWindow();
    for (let i = 0; i < 3; i++) s = nextWindow(s, fast);
    const answer = { accuracy: 95, responseMs: s.windowMs * 0.6, blank: false }; // not fast enough for this window
    expect(nextWindow({ ...s, fast: 2 }, answer).fast).toBe(0);
  });
});

describe('blank hint and repeat request (task 9.3)', () => {
  it('gives the first two words as the hint', () => {
    expect(firstWords('Me gustan las películas de acción.')).toBe('Me gustan');
    expect(firstWords('Hola')).toBe('Hola');
  });

  it.each(['¿Puede repetir, por favor?', 'puede repetir por favor', 'Repetir por favor', 'repite la pregunta', 'PUEDE REPETIR'])('hears "%s" as a repeat request', (t) => {
    expect(isRepeatRequest(t)).toBe(true);
  });

  it.each(['Me gusta el cine', 'repito', '', 'por favor'])('does not hear "%s" as one', (t) => {
    expect(isRepeatRequest(t)).toBe(false);
  });
});

describe('test-ready threshold (task 9.4)', () => {
  const ok = { accuracy: 90, responseMs: 2500, blank: false };

  it('meets the target only when accurate, quick and not blank', () => {
    expect(meetsTarget(ok)).toBe(true);
    expect(meetsTarget({ ...ok, responseMs: 5000 })).toBe(false);
    expect(meetsTarget({ ...ok, accuracy: 60 })).toBe(false);
    expect(meetsTarget({ accuracy: null, responseMs: null, blank: true })).toBe(false);
  });

  it('is ready only when every question has met it in enough separate sessions', () => {
    expect(isTestReady(IDS.map(() => ({ sessionsMet: 2 })), 5)).toBe(true);
    expect(isTestReady([...IDS.slice(1).map(() => ({ sessionsMet: 2 })), { sessionsMet: 1 }], 5)).toBe(false);
  });

  it('is not ready when a question has no record at all', () => {
    expect(isTestReady(IDS.slice(1).map(() => ({ sessionsMet: 3 })), 5)).toBe(false);
  });

  it('follows configured thresholds', () => {
    expect(isTestReady(IDS.map(() => ({ sessionsMet: 2 })), 5, { ...DEFAULT_AUTOMATE, readySessions: 3 })).toBe(false);
  });
});

describe('response-time rank (tasks 13.2 and 9.5)', () => {
  const at = (ms: number, n = 5) => Array.from({ length: n }, () => ({ accuracy: 90, responseMs: ms, blank: false }));

  it('has no rank until there are enough answers, and says how many more', () => {
    expect(rankFor(at(2000, 2))).toMatchObject({ rank: null, answersNeeded: 1 });
    expect(rankFor([])).toMatchObject({ rank: null, answersNeeded: 3 });
  });

  it('puts times on the ladder at each boundary', () => {
    const [snail, tortoise, bird, rabbit, fox, cat] = RANKS;
    const cases: [number, string][] = [
      [9000, snail], [5501, snail], [5500, tortoise], [4201, tortoise], [4200, bird], [3201, bird],
      [3200, rabbit], [2501, rabbit], [2500, fox], [1801, fox], [1800, cat], [600, cat],
    ];
    for (const [ms, name] of cases) expect(rankFor(at(ms)).rank, `${ms} ms`).toBe(name);
    expect(stepFor(5500)).toBe(1);
    expect(stepFor(5501)).toBe(0);
  });

  it('uses a rolling window of the latest answers, so improvement shows', () => {
    const history = [...at(9000, 10), ...at(1500, 10)];
    expect(rankFor(history).rank).toBe('Gato');
  });

  it('ignores blanks and answers that were mostly wrong', () => {
    const history = [...at(2000, 4), { accuracy: null, responseMs: null, blank: true }, { accuracy: 20, responseMs: 9000, blank: false }];
    expect(rollingAverage(history)).toEqual({ averageMs: 2000, count: 4 });
  });

  it('says how far the next step is, and nothing at the top', () => {
    expect(rankFor(at(3000))).toMatchObject({ rank: 'Conejo', nextStepMs: 500 });
    expect(rankFor(at(1000)).nextStepMs).toBeNull();
  });

  it('follows configured boundaries', () => {
    expect(rankFor(at(2000), { ...DEFAULT_RANK, upTo: [9000, 8000, 7000, 6000, 5000] }).rank).toBe('Gato');
  });
});
