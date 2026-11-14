import { buildBuilder } from '../builder';
import { prepare, sentences } from '../engine';
import { fromSelection, toSelection } from '../selection';
import { FREE_TIME, FREE_TIME_SHEET } from './free-time';

/** Finished answers on the free-time sample sheet, for tests. Each is a stored selection, as the browser sends it. */
const B = prepare(buildBuilder('free', FREE_TIME_SHEET, FREE_TIME));
const item = (slot: string, es: string) => B.cols[B.slotMap[slot].cols.find((c) => B.cols[c].items.some((i) => i.es.includes(es)))!].items.find((i) => i.es.includes(es))!;
const core = { starter: item('starter', 'Me gusta'), activity: item('activity', 'baloncesto'), connector: item('connector', 'porque'), reason: item('reason', 'es divertido') };

/** One sentence: an opinion, an activity and a reason. */
export const SHORT = toSelection(core);
/** The same with a closing line, so its words (and value) differ. */
export const LONG = toSelection({ ...core, closing: B.cols[B.slotMap.closing.cols[0]].items[0] });
/** An answer that starts but is not finished. */
export const HALF = toSelection({ starter: core.starter });

const spanish = (sel: ReturnType<typeof toSelection>) => sentences(B, fromSelection(B, sel)!, 'es').join(' ');
/** What the server stores as the confirmed answer text for each. */
export const SHORT_TEXT = spanish(SHORT);
export const LONG_TEXT = spanish(LONG);
