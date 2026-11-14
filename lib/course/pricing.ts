import { estimateFor, sentText } from '../audio/build.ts';
import { bitsFor } from '../audio/bits.ts';
import { planClips, type ClipSpec } from '../audio/manifest.ts';
import { PHRASE_BANK } from '../tele/phrase-bank.ts';
import { teleLines } from '../memorise/tele-lines.ts';
import { CHEEKY_POOL } from '../tele/cheeky.ts';
import type { Course } from './schema.ts';

/**
 * What loading a course will cost before anyone loads it (task 23.7). A clip is stored by its text and speed, so a phrase a
 * course shares with one already built costs nothing: only clips with no stored copy are new. The voice and model are not part
 * of a clip's slot, so a change of voice rebuilds everything; this prices the clips that do not exist at all.
 */
export interface CoursePrice {
  /** Clips the course needs in all. */
  wanted: number;
  /** Clips that already exist, whoever made them. */
  shared: number;
  /** Clips that would be built. */
  toBuild: number;
  /** Characters sent to the voice service (natural speed only; slow and fast are made locally, free). */
  characters: number;
  /** An estimate, not an invoice: the per-character rate is unverified (lib/audio/build.ts). */
  estimateGbp: number;
  /** The paid set-up call that drafts model answers, when the course has none. Not priced here: it is one small call, capped separately. */
  needsSetUp: boolean;
  /** What is new, for the dry-run list. */
  newClips: ClipSpec[];
}

/** Every clip a course needs: its questions, its key words, its chunks and the bits of its model answers, plus the shared lines. */
export function clipsFor(course: Course): ClipSpec[] {
  return planClips(course.questions, [...PHRASE_BANK, ...CHEEKY_POOL], bitsFor(course), teleLines());
}

/** Prices a course against the clips that exist (`built`, from `lib/audio/built.ts`). */
export function priceCourse(course: Course, built: readonly { slot: string }[], voice: { tag?: string } = {}): CoursePrice {
  const have = new Set(built.map((b) => b.slot));
  const specs = clipsFor(course);
  const newClips = specs.filter((s) => !have.has(s.slot));
  return {
    wanted: specs.length,
    shared: specs.length - newClips.length,
    toBuild: newClips.length,
    characters: newClips.filter((s) => s.speed === 1).reduce((n, s) => n + sentText(s.text, voice).length, 0),
    estimateGbp: estimateFor(newClips, voice),
    needsSetUp: course.modelAnswers.length === 0,
    newClips,
  };
}
