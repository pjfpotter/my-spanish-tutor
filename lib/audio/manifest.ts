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
  kind: 'question' | 'line' | 'bit';
  /** Human label for bills and logs. */
  label: string;
}

/** The slot a clip is stored under. The voice and model are not part of it: they mark a clip stale instead. */
export const slotFor = (text: string, speed: number) =>
  createHash('sha1').update(JSON.stringify({ text, speed })).digest('hex').slice(0, 12);

/** What marks a stored clip as out of date: change the text, voice, model or speed and it differs. */
export const sourceHash = (text: string, voiceId: string, model: string, speed: number, tag?: string, how?: string) =>
  createHash('sha1').update(JSON.stringify({ text, voiceId, model, speed, ...(tag ? { tag } : {}), ...(how ? { how } : {}) })).digest('hex').slice(0, 12);

export interface QuestionLike {
  position: number;
  spanish: string;
  english: string;
  /** Played alone by the comprehension probe, at slow and normal speed only. */
  keyWord?: { spanish: string; english: string };
}

/** A course chunk: one bit of an answer the memorise ladder teaches and says aloud (task 27.4). */
export interface ChunkLike {
  spanish: string;
  english: string;
}

/**
 * Every clip the app needs: each question at three speeds, each key word at two, each phrase-bank line at normal speed,
 * and each course chunk at slow and normal speed. A student's answer is made of the course's chunks, so Tele says a bit,
 * or a whole answer bit by bit, from clips built ahead of time and never from a clip made for one student.
 */
export function planClips(questions: QuestionLike[], bank: PhraseLine[], chunks: ChunkLike[] = []): ClipSpec[] {
  const specs: ClipSpec[] = [];
  for (const q of questions) {
    for (const [name, speed] of Object.entries(SPEEDS) as [SpeedName, number][]) {
      specs.push({
        slot: slotFor(q.spanish, speed), text: q.spanish, en: q.english, speed, feelings: null,
        kind: 'question', label: `question ${q.position} (${name})`,
      });
    }
  }
  for (const q of questions) {
    if (!q.keyWord) continue;
    for (const name of ['slow', 'normal'] as const) {
      specs.push({
        slot: slotFor(q.keyWord.spanish, SPEEDS[name]), text: q.keyWord.spanish, en: q.keyWord.english, speed: SPEEDS[name], feelings: null,
        kind: 'question', label: `key word of question ${q.position} (${name})`,
      });
    }
  }
  for (const l of bank) {
    specs.push({
      slot: slotFor(l.es, SPEEDS.normal), text: l.es, en: l.en, speed: SPEEDS.normal, feelings: l.feelings,
      kind: 'line', label: `line ${l.id}`,
    });
  }
  for (const c of chunks) {
    for (const name of ['slow', 'normal'] as const) {
      specs.push({
        slot: slotFor(c.spanish, SPEEDS[name]), text: c.spanish, en: c.english, speed: SPEEDS[name], feelings: null,
        kind: 'bit', label: `bit "${c.spanish.slice(0, 20)}" (${name})`,
      });
    }
  }
  // The same text at the same speed is one clip, however many places want it.
  return [...new Map(specs.map((s) => [s.slot, s])).values()];
}
