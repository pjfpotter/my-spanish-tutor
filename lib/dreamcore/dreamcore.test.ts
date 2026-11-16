import { describe, expect, it } from 'vitest';
import { LAB_ANSWERS } from '../../app/lab/memorise/content';
import { LOOK_COOLDOWN, START_GAP, TRYING_WINDOW, closingRate, fear, isTrying, lookChance, push, startChase, tick, wantsLookBehind } from './chase';
import { RUN_LENGTH, buildRun, emptyBlocks, firstLetters, plaqueOf, rungOf } from './doors';
import { fresh, load, settle } from './rewards';

const seeded = (): (() => number) => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

describe('doors', () => {
  it('climbs the ladder across a run', () => {
    const run = buildRun(LAB_ANSWERS, seeded());
    expect(run).toHaveLength(RUN_LENGTH);
    expect(run.map((d) => d.rung)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
    expect(rungOf(11)).toBe(6);
  });
  it('carries the question id and sends the last rung to questions that have not met the target', () => {
    const own = LAB_ANSWERS.map((a, i) => ({ ...a, id: `q${i}` }));
    const run = buildRun(own, seeded(), new Set(['q3']));
    expect(run.every((d) => d.itemId?.startsWith('q'))).toBe(true);
    expect(run.filter((d) => d.rung === 6).every((d) => d.itemId === 'q3')).toBe(true);
    expect(buildRun(LAB_ANSWERS, seeded())[0].itemId).toBeUndefined();
  });
  it('never makes an empty door', () => {
    for (const d of buildRun(LAB_ANSWERS, seeded())) expect(d.bits.every((b) => b.length > 0)).toBe(true);
    expect(buildRun([])).toEqual([]);
  });
  it('shows less help as rungs climb', () => {
    const [r1, , , , r3, , r4, , r5, , r6] = buildRun(LAB_ANSWERS, seeded());
    expect(plaqueOf(r1).main).toBe(r1.bits.join(' '));
    expect(plaqueOf(r3).main).toMatch(/\./);
    expect(plaqueOf(r4).main).toMatch(/▢/);
    expect(plaqueOf(r5).lang).toBe('en');
    expect(plaqueOf(r6).main).toMatch(/\?$/);
    expect(plaqueOf(r6).sub).toBe(r6.questionEnglish);
    expect(plaqueOf(r6).sub).not.toBe(r6.english);
  });
  it('formats first letters and blocks', () => {
    expect(firstLetters('Me encantan')).toBe('M. e.......');
    expect(emptyBlocks('Lo siento')).toBe('▢▢ ▢▢▢▢▢▢');
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
    expect(push({ gap: 0.5, caught: false }, 2).gap).toBeGreaterThan(0.5);
    expect(push({ gap: 0.95, caught: false }, 4).gap).toBe(1);
  });
});

describe('pressure', () => {
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
    const r = settle(fresh(), { doors: 0, bits: 0, escaped: false, tries: 0 }, 0.1);
    expect(r.newMutation).toBe(true);
    expect(r.lines.length).toBeGreaterThan(0);
    expect(r.saved.runs).toBe(1);
  });
  it('names improvement and does not repeat souvenirs until all are seen', () => {
    const first = settle(fresh(), { doors: 2, bits: 3, escaped: false, tries: 1 }, 0);
    const second = settle(first.saved, { doors: 5, bits: 8, escaped: false, tries: 0 }, 0);
    expect(second.lines.join(' ')).toMatch(/3 doors further/);
    expect(second.mutation.id).not.toBe(first.mutation.id);
  });
  it('survives junk in storage', () => {
    expect(load('{nope')).toEqual(fresh());
    expect(load(JSON.stringify({ mutations: ['x', 'ears'] })).mutations).toEqual(['ears']);
  });
});
