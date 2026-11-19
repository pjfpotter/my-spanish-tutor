import { describe, expect, it } from 'vitest';
import { LAB_ANSWERS } from '../../app/lab/memorise/content';
import { LOOK_COOLDOWN, RATE_CAP_INDEX, START_GAP, WHISPER_CHASE_COST, WHISPER_FLOOR, spendWhisperGap, TRYING_WINDOW, closingRate, fear, isTrying, lookChance, push, startChase, tick, wantsLookBehind } from './chase';
import { ESCAPE_AFTER, FIXED_DOORS, nextUnsaidWord, WHISPERS_PER_RUN, spendWhisper, whispersLeft, buildRun, countsAsClean, escapeEarned, firstLast, firstSentence, hearsQuestion, maskedWords, nextNoHelpDoor, plaqueOf, stageOf } from './doors';
import { tokenise } from '../speech/score';
import { fresh, load, settle } from './rewards';
import { STAGE_TRY } from '../ui/step-copy';

const seeded = (): (() => number) => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

describe('doors', () => {
  const own = LAB_ANSWERS.map((a, i) => ({ ...a, id: `q${i}` }));
  it('has the four fixed stages, two doors each', () => {
    const run = buildRun(LAB_ANSWERS, seeded());
    expect(run).toHaveLength(FIXED_DOORS);
    expect(run.map((d) => d.stage)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
    expect(stageOf(7)).toBe(4);
    expect([8, 9, 40].map(stageOf)).toEqual([5, 5, 5]);
    expect([1, 2, 3, 4, 5].map((s) => hearsQuestion(s as 1))).toEqual([false, false, true, true, true]);
  });
  it('stage 2 is the whole first sentence and stage 1 one bit of it', () => {
    for (const a of LAB_ANSWERS) {
      const sentence = firstSentence(a).map((c) => c.t);
      const run = buildRun([a], seeded());
      expect(run[2].bits).toEqual(sentence);
      expect(run[0].bits).toHaveLength(1);
      expect(sentence).toContain(run[0].bits[0]);
    }
  });
  it('never makes an empty door', () => {
    for (const d of buildRun(LAB_ANSWERS, seeded())) expect(d.bits.every((b) => b.length > 0)).toBe(true);
    expect(buildRun([])).toEqual([]);
    expect(nextNoHelpDoor([], 8, undefined)).toBeNull();
  });
  it('carries the question id, and sample answers have none', () => {
    expect(buildRun(own, seeded()).every((d) => d.itemId?.startsWith('q'))).toBe(true);
    expect(buildRun(LAB_ANSWERS, seeded())[0].itemId).toBeUndefined();
  });
  it('sends no-help doors to questions that have not met the target, and does not repeat a question', () => {
    const rng = seeded();
    let prev: string | undefined;
    for (let i = 8; i < 30; i++) {
      const d = nextNoHelpDoor(own, i, prev, rng, new Set(['q2', 'q4']))!;
      expect(d.stage).toBe(5);
      expect(['q2', 'q4']).toContain(d.itemId);
      expect(d.itemId).not.toBe(prev);
      prev = d.itemId;
    }
    // When only one question is left it is asked again, and with none unmet any question can come.
    expect(nextNoHelpDoor(own, 8, 'q2', seeded(), new Set(['q2']))!.itemId).toBe('q2');
    expect(nextNoHelpDoor(own, 8, undefined, seeded())!.itemId).toBeDefined();
  });
  it('shows less help as stages climb', () => {
    const [s1, , s2, , s3, , s4] = buildRun(LAB_ANSWERS, seeded());
    const s5 = nextNoHelpDoor(LAB_ANSWERS, 8, undefined, seeded())!;
    const answerWords = (d: typeof s1) => tokenise(d.bits.join(' '));
    expect(maskedWords(s1)).toEqual(answerWords(s1));
    expect(maskedWords(s2)).toEqual(answerWords(s2));
    expect(maskedWords(s3)).toEqual(answerWords(s3).map(firstLast));
    expect(maskedWords(s3).some((w) => w.includes('.'))).toBe(true);
    const shown = tokenise(s4.bits.slice(0, 1).join(' '));
    expect(maskedWords(s4).slice(0, shown.length)).toEqual(shown);
    expect(maskedWords(s4).slice(shown.length).every((w) => w === '•')).toBe(true);
    expect(maskedWords(s5).every((w) => w === '•')).toBe(true);
    expect(maskedWords(s5)).toHaveLength(answerWords(s5).length);
  });
  it('the question line from stage 3 is the Spanish question with an English subtitle, never the answer', () => {
    const [s1, , s2, , s3, , s4] = buildRun(LAB_ANSWERS, seeded());
    const s5 = nextNoHelpDoor(LAB_ANSWERS, 8, undefined, seeded())!;
    expect(plaqueOf(s1).main).toBe(s1.bits.join(' '));
    expect(plaqueOf(s2).main).toBe(s2.bits.join(' '));
    for (const d of [s3, s4, s5]) {
      expect(plaqueOf(d).main).toBe(d.question);
      expect(plaqueOf(d).main).not.toBe(d.bits.join(' '));
      expect(plaqueOf(d).sub).toBe(d.questionEnglish);
      expect(plaqueOf(d).main).toMatch(/\?$/);
    }
  });
  it('shows the first and last letter of each word', () => {
    expect(firstLast('Me encantan')).toBe('Me e......n');
    expect(firstLast('Lo siento')).toBe('Lo s....o');
    expect(firstLast('a mí')).toBe('a mí');
    expect(firstLast('¿Qué tal?')).toBe('Q.é t.l');
    expect(firstLast('jugar al fútbol,')).toBe('j...r al f....l');
  });
  it('the way out is earned by clean no-help doors only', () => {
    const [s1] = buildRun(LAB_ANSWERS, seeded());
    const s5 = nextNoHelpDoor(LAB_ANSWERS, 8, undefined, seeded())!;
    expect(countsAsClean(s5, false)).toBe(true);
    expect(countsAsClean(s5, true)).toBe(false);
    expect(countsAsClean(s1, false)).toBe(false);
    expect(ESCAPE_AFTER).toBe(3);
    expect(escapeEarned(3)).toBe(true);
    expect(escapeEarned(2)).toBe(false);
    // Two clean doors and a third cleared with help is still two clean doors.
    const clean = [false, false, true].filter((assisted) => countsAsClean(s5, assisted)).length;
    expect(clean).toBe(2);
    expect(escapeEarned(clean)).toBe(false);
  });
});

describe('chase', () => {
  it('closes with time and slows while the student is heard', () => {
    const a = tick(startChase(), { dt: 10, doorIndex: 0, trying: false, micOk: true, paused: false });
    const b = tick(startChase(), { dt: 10, doorIndex: 0, trying: true, micOk: true, paused: false });
    expect(a.gap).toBeLessThan(b.gap);
    expect(b.gap).toBeLessThan(START_GAP);
  });
  it('waits when the microphone is not working, and never catches the student for it', () => {
    const c = tick(startChase(), { dt: 1000, doorIndex: 11, trying: false, micOk: false, paused: false });
    expect(c).toEqual(startChase());
  });
  it('catches only when the gap runs out, and speed rises with the door', () => {
    expect(tick({ gap: 0.001, caught: false }, { dt: 1, doorIndex: 3, trying: false, micOk: true, paused: false }).caught).toBe(true);
    expect(closingRate(11)).toBeGreaterThan(closingRate(0));
    expect(closingRate(1)).toBeGreaterThan(closingRate(0));
    expect(push({ gap: 0.5, caught: false }, 2).gap).toBeGreaterThan(0.5);
    expect(push({ gap: 0.95, caught: false }, 4).gap).toBe(1);
  });
});

describe('pressure', () => {
  it('stops speeding up after the last door of the old run, so open-ended no-help doors stay fair', () => {
    expect(RATE_CAP_INDEX).toBe(11);
    expect(closingRate(20)).toBe(closingRate(11));
    expect(closingRate(500)).toBe(closingRate(11));
    expect(closingRate(10)).toBeLessThan(closingRate(11));
    expect(closingRate(0)).toBeCloseTo(0.018, 6);
    expect(closingRate(5)).toBeCloseTo(0.018 + 0.0045 * 5, 6);
  });
  it('only a recent matched word counts as trying', () => {
    expect(isTrying(10, 9)).toBe(true);
    expect(isTrying(10, 10 - TRYING_WINDOW - 0.1)).toBe(false);
    // Noise never moves lastProgress, so ten seconds of it closes at the full rate.
    const noise = tick(startChase(), { dt: 10, doorIndex: 0, trying: isTrying(10, 0), micOk: true, paused: false });
    expect(noise.gap).toBeCloseTo(START_GAP - closingRate(0) * 10, 5);
  });
  it('fear builds from two thirds of the gap and is strongest when caught', () => {
    expect(fear(0.9)).toBe(0);
    expect(fear(0.3)).toBeGreaterThan(3 * fear(0.7));
    expect(fear(0.3)).toBeGreaterThan(3 * fear(0.6));
    expect(fear(0)).toBe(1);
  });
  it('the look-behind gets likelier as the gap closes, and respects the cooldown', () => {
    expect(lookChance(0.2, 60)).toBeGreaterThanOrEqual(5 * lookChance(0.9, 60));
    expect(lookChance(0.2, LOOK_COOLDOWN - 1)).toBe(0);
    const c = { gap: 0.2, caught: false };
    expect(wantsLookBehind(c, 60, 0.033, 0)).toBe(true);
    expect(wantsLookBehind(c, 60, 0.033, 0.99)).toBe(false);
    expect(wantsLookBehind({ gap: 0.2, caught: true }, 60, 0.033, 0)).toBe(false);
  });
});

describe('rewards', () => {
  it('always gives a souvenir and a kind line, even for nothing', () => {
    const r = settle(fresh(), { doors: 0, bits: 0, escaped: false, tries: 0, stage: 1, clean: 0 }, 0.1);
    expect(r.newMutation).toBe(true);
    expect(r.lines.length).toBeGreaterThan(0);
    expect(r.saved.runs).toBe(1);
  });
  it('names improvement and does not repeat souvenirs until all are seen', () => {
    const first = settle(fresh(), { doors: 2, bits: 3, escaped: false, tries: 1, stage: 2, clean: 0 }, 0);
    const second = settle(first.saved, { doors: 5, bits: 8, escaped: false, tries: 0, stage: 3, clean: 0 }, 0);
    expect(second.lines.join(' ')).toMatch(/3 doors further/);
    expect(second.mutation.id).not.toBe(first.mutation.id);
  });
  it('names the stage reached and offers one thing to try when caught, and nothing to fix when the student got out', () => {
    const caught = settle(fresh(), { doors: 5, bits: 8, escaped: false, tries: 0, stage: 3, clean: 0 }, 0);
    expect(caught.stageLine).toContain('stage 3 of 5');
    expect(caught.suggestion).toBe(STAGE_TRY[3]);
    const out = settle(fresh(), { doors: 11, bits: 30, escaped: true, tries: 0, stage: 5, clean: 3 }, 0);
    expect(out.suggestion).toBeNull();
    expect(out.lines.join(' ')).toMatch(/3 no-help doors cleared/);
    expect(`${out.stageLine} ${out.lines.join(' ')}`).not.toMatch(/fail|caught|lost/i);
  });
  it('survives junk in storage', () => {
    expect(load('{nope')).toEqual(fresh());
    expect(load(JSON.stringify({ mutations: ['x', 'ears'] })).mutations).toEqual(['ears']);
  });
});

describe('ghost whispers', () => {
  it('give a small fixed supply per run, and spending past zero changes nothing', () => {
    expect(WHISPERS_PER_RUN).toBe(3);
    expect(whispersLeft(0)).toBe(3);
    expect(whispersLeft(3)).toBe(0);
    expect(whispersLeft(9)).toBe(0);
    let s = { used: 0 };
    for (let i = 1; i <= 3; i++) {
      const r = spendWhisper(s);
      expect(r.spent).toBe(true);
      expect(r.state.used).toBe(i);
      s = r.state;
    }
    const none = spendWhisper(s);
    expect(none.spent).toBe(false);
    expect(none.state).toEqual({ used: 3 });
    expect(whispersLeft(none.state.used)).toBe(0);
  });
  it('a door with a spent whisper is help: it does not count as clean, an unwhispered one still does', () => {
    const door = nextNoHelpDoor(LAB_ANSWERS, 8, undefined, seeded())!;
    expect(countsAsClean(door, false, false)).toBe(true);
    expect(countsAsClean(door, false)).toBe(true);
    expect(countsAsClean(door, false, true)).toBe(false);
    expect(countsAsClean(door, true, false)).toBe(false);
    const [s1] = buildRun(LAB_ANSWERS, seeded());
    expect(countsAsClean(s1, false, false)).toBe(false);
  });
  it('cost the student ground, but never catch them by themselves and never push the monster back', () => {
    expect(spendWhisperGap({ gap: 0.5, caught: false }).gap).toBeCloseTo(0.5 - WHISPER_CHASE_COST, 6);
    expect(spendWhisperGap({ gap: 0.05, caught: false })).toEqual({ gap: WHISPER_FLOOR, caught: false });
    expect(spendWhisperGap({ gap: 0.01, caught: false }).gap).toBe(0.01);
    expect(spendWhisperGap({ gap: 0.5, caught: true }).gap).toBe(0.5);
    for (const gap of [0.04, 0.1, 0.8, 1]) expect(spendWhisperGap({ gap, caught: false }).caught).toBe(false);
  });
  it('leave the closing speed alone, so only the whisper itself costs time', () => {
    expect(closingRate(0)).toBeCloseTo(0.018, 6);
    expect(closingRate(5)).toBeCloseTo(0.018 + 0.0045 * 5, 6);
    expect(closingRate(11)).toBeCloseTo(0.018 + 0.0045 * 11, 6);
    expect(closingRate(20)).toBe(closingRate(11));
  });
});

describe('the word a whisper offers', () => {
  const door = { bits: ['Me gusta', 'el fútbol'] };
  it('is the first word not yet understood, starting with the first word of the door', () => {
    expect(nextUnsaidWord(door, null)).toBe('Me');
    expect(nextUnsaidWord(door, { next: { chunk: 0, word: 1 } })).toBe('gusta');
    expect(nextUnsaidWord(door, { next: { chunk: 1, word: 1 } })).toBe('fútbol');
  });
  it('is nothing once every word is understood, or when the position does not exist', () => {
    expect(nextUnsaidWord(door, { next: null })).toBeNull();
    expect(nextUnsaidWord(door, { next: { chunk: 5, word: 0 } })).toBeNull();
    expect(nextUnsaidWord(door, { next: { chunk: 0, word: 9 } })).toBeNull();
  });
});
