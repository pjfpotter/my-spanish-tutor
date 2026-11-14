import { describe, expect, it } from 'vitest';
import { buildBuilder } from './builder';
import { prepare } from './engine';
import { fromSelection, toSelection } from './selection';
import { FREE_TIME, FREE_TIME_SHEET } from './samples/free-time';

const B = prepare(buildBuilder('free', FREE_TIME_SHEET, FREE_TIME));
const pick = (col: string, es: string) => B.cols[col].items.find((x) => x.es.includes(es))!;

describe('selection', () => {
  it('round-trips a built answer', () => {
    const slot = B.slots[0];
    const col = slot.cols[0];
    const it = B.cols[col].items[0];
    const sel = toSelection({ [slot.key]: it });
    const back = fromSelection(B, sel)!;
    expect(back[slot.key]).toBe(it);
    expect(toSelection(back)).toEqual(sel);
  });
  it('rejects anything not on the sheet', () => {
    expect(fromSelection(B, { nope: { col: 'x', i: 0 } })).toBeNull();
    expect(fromSelection(B, { [B.slots[0].key]: { col: 'nope', i: 0 } })).toBeNull();
    expect(fromSelection(B, { [B.slots[0].key]: { col: B.slots[0].cols[0], i: 9999 } })).toBeNull();
    expect(fromSelection(B, 'x')).toBeNull();
    expect(fromSelection(B, [])).toBeNull();
  });
  it('rejects a chunk placed in a slot that does not take its list', () => {
    const other = B.slots.find((s) => !s.cols.includes(B.slots[0].cols[0]))!;
    expect(fromSelection(B, { [other.key]: { col: B.slots[0].cols[0], i: B.cols[B.slots[0].cols[0]].items[0].i } })).toBeNull();
  });
  void pick;
});
