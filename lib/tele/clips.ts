import { parseClipFile, type ClipFile } from './clip';
import built from '../audio/built';

/**
 * Clips live in public/audio/clips/<slot>.mp3 and .json, where the slot is a hash of the text and
 * speed (see lib/audio/manifest.ts). `built.ts` lists the clips that exist, written by
 * `npm run build-audio`, so the app only asks for clips it has and never guesses at a 404.
 */
export interface BuiltClip {
  slot: string;
  text: string;
  speed: number;
}
export const BUILT_CLIPS: readonly BuiltClip[] = built;

/** The built clip for this exact text at this speed, or null when there is none yet. */
export function findClip(text: string, speed = 1, clips: readonly BuiltClip[] = BUILT_CLIPS): string | null {
  return clips.find((c) => c.text === text && c.speed === speed)?.slot ?? null;
}

/** Writing that is the same to the ear: no capitals, no edge punctuation, one space between words. */
const bare = (t: string) => t.toLowerCase().replace(/^[\s.,;:!?¡¿"“”]+|[\s.,;:!?¡¿"“”]+$/g, '').replace(/\s+/g, ' ');

/** The built clip for one bit of a student's answer. A bit is a course chunk, so it is found however it was capitalised or punctuated. */
export function findBitClip(text: string, speed = 1, clips: readonly BuiltClip[] = BUILT_CLIPS): string | null {
  const want = bare(text);
  return clips.find((c) => c.speed === speed && bare(c.text) === want)?.slot ?? null;
}

export const clipUrls = (slot: string) => ({ audio: `/audio/clips/${slot}.mp3`, json: `/audio/clips/${slot}.json` });

/** Loads and checks a clip's timeline. Throws a plain message if it is missing or malformed. */
export async function loadClip(slot: string, fetchImpl: typeof fetch = fetch): Promise<ClipFile> {
  const res = await fetchImpl(clipUrls(slot).json);
  if (!res.ok) throw new Error(`clip ${slot} not found (${res.status})`);
  return parseClipFile(await res.json());
}
