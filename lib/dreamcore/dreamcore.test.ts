import { describe, expect, it } from 'vitest';
import { LAB_ANSWERS } from '../../app/lab/memorise/content';
import { START_GAP, closingRate, push, startChase, tick } from './chase';
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
