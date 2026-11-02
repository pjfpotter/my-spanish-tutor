import { createHash } from 'node:crypto';
import type { Feelings } from '../tele/feelings.ts';
import type { PhraseLine } from '../tele/phrase-bank.ts';

import { SPEEDS, type SpeedName } from './speeds.ts';

export { SPEEDS, type SpeedName };

export interface ClipSpec {
  /** Where the clip lives: a hash of the text and speed, so identical text is built once for every course. */
  slot: string;
  text: string;
  /** English subtitle, text only. */
  en: string;
  speed: number;
  /** A baked feeling for tutor lines; questions have none and use the rule-based track. */
  feelings: Feelings | null;
  kind: 'question' | 'line';
  /** Human label for bills and logs. */
  label: string;
}

/** The slot a clip is stored under. The voice and model are not part of it: they mark a clip stale instead. */
export const slotFor = (text: string, speed: number) =>
  createHash('sha1').update(JSON.stringify({ text, speed })).digest('hex').slice(0, 12);

/** What marks a stored clip as out of date: change the text, voice, model or speed and it differs. */
export const sourceHash = (text: string, voiceId: string, model: string, speed: number) =>
  createHash('sha1').update(JSON.stringify({ text, voiceId, model, speed })).digest('hex').slice(0, 12);

export interface QuestionLike {
  position: number;
  spanish: string;
  english: string;
}

/** Every clip the app needs: each question at three speeds, each phrase-bank line at normal speed. */
export function planClips(questions: QuestionLike[], bank: PhraseLine[]): ClipSpec[] {
  const specs: ClipSpec[] = [];
  for (const q of questions) {
    for (const [name, speed] of Object.entries(SPEEDS) as [SpeedName, number][]) {
      specs.push({
        slot: slotFor(q.spanish, speed), text: q.spanish, en: q.english, speed, feelings: null,
        kind: 'question', label: `question ${q.position} (${name})`,
      });
    }
  }
  for (const l of bank) {
    specs.push({
      slot: slotFor(l.es, SPEEDS.normal), text: l.es, en: l.en, speed: SPEEDS.normal, feelings: l.feelings,
      kind: 'line', label: `line ${l.id}`,
    });
  }
  // The same text at the same speed is one clip, however many places want it.
  return [...new Map(specs.map((s) => [s.slot, s])).values()];
}
