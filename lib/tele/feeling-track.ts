import type { Emotion, Feelings } from './feelings';
import type { WordTime } from './timeline';

export type FeelingStep = { t0: number; feelings: Feelings };

/**
 * Cue words for the rule-based fallback (design D7): when a line has no baked feeling, a few
 * Spanish words nudge the character. This list is deliberately small and hand-written; no model
 * is called at runtime or build time for it.
 */
const CUES: Record<Emotion, string[]> = {
  joy: ['hola', 'genial', 'bien', 'fantástico', 'fantastico', 'perfecto', 'excelente', 'bravo', 'felicidades', 'divertido', 'gracias'],
  sadness: ['triste', 'lástima', 'lastima', 'pena', 'lloro', 'llorar', 'perdón', 'perdon'],
  anger: ['enfadado', 'enfadada', 'furioso', 'grr', 'basta'],
  fear: ['miedo', 'ayuda', 'socorro', 'cuidado', 'peligro'],
  surprise: ['ay', 'uy', 'guau', 'vaya', 'sorpresa', 'increíble', 'increible'],
  disgust: ['asco', 'puaj', 'fuchi', 'guácala', 'guacala'],
};

const clean = (w: string) => w.toLowerCase().replace(/[^\p{L}]/gu, '');

/** The cue feeling for one word, or null. */
export function cueFor(word: string): Emotion | null {
  const w = clean(word);
  for (const [emotion, list] of Object.entries(CUES) as [Emotion, string[]][]) if (list.includes(w)) return emotion;
  return null;
}

/**
 * The feeling track stored with a clip. A baked feeling (chosen once when the phrase bank was
 * written) holds for the whole line. With none, cue words trigger a feeling for the next few
 * words and it then settles back to calm.
 */
export function buildFeelingTrack(words: WordTime[], baked?: Feelings | null): FeelingStep[] {
  if (baked && Object.keys(baked).length) return [{ t0: 0, feelings: clamp(baked) }];

  const track: FeelingStep[] = [{ t0: 0, feelings: {} }];
  let hold = 0;
  const set = (t0: number, feelings: Feelings) => {
    if (track[track.length - 1].t0 === t0) track[track.length - 1].feelings = feelings; // one step per moment
    else track.push({ t0, feelings });
  };
  for (const w of words) {
    const e = cueFor(w.text);
    if (e) {
      set(w.t0, { [e]: 0.7 });
      hold = 3; // stays for this word and the next two
    } else if (hold > 0 && --hold === 0) {
      set(w.t0, {});
    }
  }
  return track;
}

function clamp(f: Feelings): Feelings {
  return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, Math.max(0, Math.min(1, v ?? 0))]));
}
