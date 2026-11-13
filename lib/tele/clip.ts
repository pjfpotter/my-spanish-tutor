import { EMOTIONS, type Feelings } from './feelings.ts'; // .ts so scripts/build-audio.mjs can load this file in Node
import type { ClipTimeline } from './timeline';

/**
 * The JSON file stored beside each tutor clip (design D7): the timeline plus where it came from.
 * Written by scripts/build-audio.mjs, read by the app.
 */
export interface ClipFile extends ClipTimeline {
  id: string;
  /** The Spanish that was spoken. */
  text: string;
  /** The English subtitle. Text only; the tutor never speaks English. */
  en: string;
  envelope: number[];
  envelopeHop: number;
  feelings: { t0: number; feelings: Feelings }[];
  /** Provenance, for rebuilding and for the cost log. */
  source: { provider: string; voiceId: string; model: string; speed: number; hash: string };
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Checks loose JSON from disk or the network and returns a typed clip, or throws a plain message. */
/** `allowNoSubtitle` is for bit clips, which are only ever played as audio and never shown as captions, and so may have no English gloss. */
export function parseClipFile(input: unknown, opts: { allowNoSubtitle?: boolean } = {}): ClipFile {
  const c = input as Partial<ClipFile> | null;
  if (!c || typeof c !== 'object') throw new Error('clip file is not an object');
  if (typeof c.id !== 'string' || !c.id) throw new Error('clip file has no id');
  if (typeof c.text !== 'string' || !c.text.trim()) throw new Error('clip file has no Spanish text');
  if (typeof c.en !== 'string' || (!c.en.trim() && !opts.allowNoSubtitle)) throw new Error('clip file has no English subtitle');
  if (!isNum(c.end) || c.end <= 0) throw new Error('clip file has no end time');

  if (!Array.isArray(c.words) || !c.words.length) throw new Error('clip file has no words');
  let last = -1;
  for (const w of c.words) {
    if (typeof w?.text !== 'string' || !w.text || !isNum(w.t0)) throw new Error('clip file has a bad word');
    if (w.t0 < last) throw new Error('clip file words are out of order');
    last = w.t0;
  }
  if (last >= c.end) throw new Error('a word starts after the clip ends');

  if (!Array.isArray(c.envelope) || !c.envelope.every((v) => isNum(v) && v >= 0 && v <= 1)) {
    throw new Error('clip file envelope must be numbers from 0 to 1');
  }
  if (!isNum(c.envelopeHop) || c.envelopeHop <= 0) throw new Error('clip file has no envelope hop');

  if (!Array.isArray(c.feelings) || !c.feelings.length) throw new Error('clip file has no feeling track');
  for (const step of c.feelings) {
    if (!isNum(step?.t0)) throw new Error('clip file has a bad feeling step');
    for (const [name, v] of Object.entries(step.feelings ?? {})) {
      if (!(EMOTIONS as readonly string[]).includes(name)) throw new Error(`unknown feeling "${name}"`);
      if (!isNum(v) || v < 0 || v > 1) throw new Error(`feeling "${name}" must be 0 to 1`);
    }
  }
  if (!c.source || typeof c.source.hash !== 'string') throw new Error('clip file has no source');
  return c as ClipFile;
}
