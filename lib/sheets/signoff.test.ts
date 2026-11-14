import { describe, expect, it } from 'vitest';
import { buildBuilder } from './builder';
import { mkAns, prepare, slotItems, type Answer } from './engine';
import { FREE_TIME, FREE_TIME_SHEET } from './samples/free-time';
import { signOff, TELE_LINES } from './signoff';

const B = prepare(buildBuilder('free', FREE_TIME_SHEET, FREE_TIME));
const ans = (spec: Record<string, string>) => mkAns(B, spec);

describe('sign-off by the exam rule (task 5.2)', () => {
  it('credits a complete answer', () => {
    expect(signOff(B, ans({ starter: 'Me gusta', activity: 'bailar', connector: 'porque', reason: 'es divertido' }))).toEqual({ code: 'ok' });
  });

  it('credits a strange but possible answer', () => {
    expect(signOff(B, ans({ starter: 'Me gusta', activity: 'jugar al baloncesto', connector: 'porque', reason: 'es relajante' }))).toEqual({ code: 'ok' });
    expect(signOff(B, ans({ starter: 'Me encanta', activity: 'leer libros', connector: 'aunque', reason: 'es aburrido' }))).toEqual({ code: 'ok' });
  });

  it('says an answer with nothing in it is incomplete, naming one thing', () => {
    expect(signOff(B, {})).toEqual({ code: 'incomplete', fix: { slot: 'starter', noun: 'an opinion' } });
    expect(signOff(B, ans({ starter: 'Me gusta' }))).toEqual({ code: 'incomplete', fix: { slot: 'activity', noun: 'an activity', have: 'Me gusta' } });
  });

  it('says a half-built part is incomplete and what is missing', () => {
    expect(signOff(B, ans({ starter: 'Me gusta', activity: 'bailar', connector: 'porque' }))).toEqual({ code: 'incomplete', fix: { slot: 'reason', noun: 'a reason', have: 'porque' } });
    expect(signOff(B, ans({ starter: 'Me gusta', activity: 'bailar', contrast: 'sin embargo' })).code).toBe('incomplete');
  });

  it('blocks a contradiction, naming the one chunk that does not fit', () => {
    // A typed or imported answer can hold a pair the picker would never offer.
    const a: Answer = ans({ starter: 'Me gusta', activity: 'bailar', connector: 'porque' });
    a.reason = slotItems(B, B.slotMap.reason).find((i) => i.es === 'es aburrido');
    const r = signOff(B, a);
    expect(r.code).toBe('clash');
    if (r.code === 'clash') expect(r.fix.message).toContain('doesn\'t go with');
  });

  it('names at most one thing to fix, and has a Spanish line with an English subtitle for each outcome', () => {
    const r = signOff(B, {});
    expect(Object.keys((r as { fix: object }).fix).length).toBeLessThanOrEqual(3);
    for (const l of Object.values(TELE_LINES)) { expect(l.es).not.toBe(l.en); expect(l.es.length).toBeGreaterThan(5); }
  });
});
