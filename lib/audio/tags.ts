import type { CharAlignment } from '../tele/alignment.ts';

/**
 * ElevenLabs reads square-bracket tags such as [very slowly] as directions, not words (a feature of the v3 model;
 * other models may say them aloud). The build puts the tag at the start of every sentence it sends, and takes it back
 * out of the character timings it gets back, so captions, the mouth and the clip's text never see it.
 */
export interface Tagged {
  /** What is sent to the voice service. */
  text: string;
  /** For each character of `text`, whether the build added it. */
  added: boolean[];
}

/** Sentences end at . ! or ?, as in lib/memorise/sentences.ts. */
export function tagSentences(text: string, tag: string): Tagged {
  if (!tag) return { text, added: new Array(text.length).fill(false) };
  const sentences = text.split(/(?<=[.!?])(\s+)/);
  let out = '';
  const added: boolean[] = [];
  const push = (s: string, isAdded: boolean) => {
    out += s;
    for (let i = 0; i < s.length; i++) added.push(isAdded);
  };
  for (const part of sentences) {
    if (!part) continue;
    if (/^\s+$/.test(part)) push(part, false);
    else {
      push(`${tag} `, true);
      push(part, false);
    }
  }
  return { text: out, added };
}

/** The timings of the original text only. Throws if the service did not return the characters that were sent. */
export function withoutAdded(a: CharAlignment, t: Tagged): CharAlignment {
  if (a.characters.join('') !== t.text) throw new Error('the voice service returned different characters from those sent');
  const keep = a.characters.map((_, i) => !t.added[i]);
  const pick = <T,>(xs: T[]) => xs.filter((_, i) => keep[i]);
  return {
    characters: pick(a.characters),
    character_start_times_seconds: pick(a.character_start_times_seconds),
    character_end_times_seconds: pick(a.character_end_times_seconds),
  };
}
