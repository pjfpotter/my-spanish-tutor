import { createHash } from 'node:crypto';
import { normaliseWord } from '../speech/score.ts'; // .ts so scripts/build-audio.mjs can load this file in Node
import type { ClipFile } from '../tele/clip.ts';
import { sourceHash } from './manifest.ts';
import { SPEEDS } from './speeds.ts';

/**
 * Which words get a ghost whisper, and where each one is cut from. A ghost word is one short file per distinct word,
 * cut from a slow clip we already have, so no new text-to-speech call is ever made. Node only (it hashes with
 * `node:crypto`): the browser looks words up in the generated `built-ghost.ts` index and never imports this file.
 */

/** The recipe marker. Change it when the ghost recipe changes and every ghost word is rebuilt, and no clip is. */
export const GHOST = 'ghost-whisper-v1';

/** What marks a ghost word stale: the word, the clip it is cut from (so a new voice or new clip rebuilds it) and the recipe. */
export const ghostHash = (word: string, sourceClipHash: string, marker: string = GHOST): string =>
  sourceHash(normaliseWord(word), sourceClipHash, 'ghost', SPEEDS.slow, undefined, marker);

/** Seconds of audio kept either side of a word, so its edges are not clipped. */
export const CUT_PAD = 0.03;

/** A built clip and the slot it is stored under. */
export interface SourceClip { slot: string; clip: ClipFile }

export interface GhostWord {
  /** The word as scoring sees it: lower case, no accents (n stays), no punctuation. */
  word: string;
  /** The slot of its ghost file, a hash of the word. */
  slot: string;
  /** Where it is cut from: the slow clip's slot and the index of the word in that clip. */
  source: { slot: string; index: number };
  /** The hash the stored file must carry to be up to date. */
  hash: string;
}

/** Cuts one word out of a clip's MP3 and turns it into the ghost whisper, as a final MP3. Free: it runs locally. */
export interface GhostMaker {
  make(mp3: Buffer, cut: { start: number; end: number }): Promise<Buffer>;
}

/** The note stored beside each ghost file, so the next build can tell whether it is stale. */
export interface GhostMeta { word: string; hash: string; source: { slot: string; index: number } }

export interface GhostStore {
  read(slot: string): Promise<GhostMeta | null>;
}

export interface GhostPlan {
  /** Ghost words that exist and match the current clip, voice and recipe: nothing to do. */
  upToDate: GhostWord[];
  /** Ghost words that are missing or out of date. */
  toBuild: GhostWord[];
}

/** The slot of a word's ghost file. The same word always gives the same slot, whatever its accents or punctuation. */
export const ghostSlot = (word: string): string =>
  createHash('sha1').update(JSON.stringify({ ghost: normaliseWord(word) })).digest('hex').slice(0, 12);

/**
 * The distinct words of the slow clips, each mapped to the first slow clip, in slot order, that contains it. Slot order is
 * arbitrary but fixed, so the same clips always give the same choice and a rebuild changes nothing. Only slow clips are used,
 * because a slowed word suits pronunciation. Words are normalised exactly as scoring normalises them.
 */
export function ghostWords(clips: readonly SourceClip[]): GhostWord[] {
  const chosen = new Map<string, GhostWord>();
  const slow = clips.filter((c) => c.clip.source.speed === SPEEDS.slow).sort((a, b) => (a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : 0));
  for (const { slot, clip } of slow) {
    clip.words.forEach((w, index) => {
      const word = normaliseWord(w.text);
      if (word && !chosen.has(word)) chosen.set(word, { word, slot: ghostSlot(word), source: { slot, index }, hash: ghostHash(word, clip.source.hash) });
    });
  }
  return [...chosen.values()].sort((a, b) => (a.word < b.word ? -1 : a.word > b.word ? 1 : 0));
}

/**
 * Where to cut word `index` out of a clip, in seconds. It starts `CUT_PAD` before the word and ends `CUT_PAD` after the
 * word's own end `t1`. Clips built before word end times were kept have no `t1`, so the cut ends where the next word
 * starts, or at the end of the clip for the last word. The cut never reaches back into the end of the word before or
 * forward into the start of the word after (when their times are known), and never leaves the clip.
 */
export function wordCut(clip: Pick<ClipFile, 'words' | 'end'>, index: number): { start: number; end: number } {
  const word = clip.words[index];
  if (!word) throw new Error(`no word ${index} in the clip`);
  const before = clip.words[index - 1];
  const after = clip.words[index + 1];
  let start = word.t0 - CUT_PAD;
  if (before?.t1 !== undefined) start = Math.max(start, before.t1);
  let end = word.t1 !== undefined ? word.t1 + CUT_PAD : after ? after.t0 : clip.end;
  if (word.t1 !== undefined && after) end = Math.min(end, after.t0);
  start = Math.max(0, Math.min(start, word.t0));
  end = Math.min(clip.end, Math.max(end, word.t0));
  return { start: Math.round(start * 1000) / 1000, end: Math.round(end * 1000) / 1000 };
}

/** Works out what needs building without making anything. This is the dry run. Free: no service is called. */
export async function planGhost(words: readonly GhostWord[], store: GhostStore, force = false): Promise<GhostPlan> {
  const plan: GhostPlan = { upToDate: [], toBuild: [] };
  for (const w of words) {
    const existing = force ? null : await store.read(w.slot);
    (existing?.hash === w.hash ? plan.upToDate : plan.toBuild).push(w);
  }
  return plan;
}

/** Slots of ghost files that nothing wants any more (the word is gone from every slow clip), so a full build can remove them. */
export const unwantedSlots = (words: readonly GhostWord[], existing: readonly string[]): string[] => {
  const wanted = new Set(words.map((w) => w.slot));
  return existing.filter((s) => !wanted.has(s)).sort();
};
