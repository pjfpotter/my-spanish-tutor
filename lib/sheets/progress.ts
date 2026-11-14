import type { Stage } from './ingest.ts';
import type { IngestResult } from './ingest.ts';

/**
 * What the upload screen says while a sheet is read (task 4.8). The wait is part of the product: short
 * Spanish messages with English subtitles, tied to the real stages so they never run ahead of the work.
 * A message may repeat in a loop within a stage; the stage itself only moves forward.
 */
export interface Message { es: string; en: string }

export const STAGE_MESSAGES: Record<Stage, Message[]> = {
  read: [
    { es: 'Leyendo tu hoja…', en: 'Reading your sheet…' },
    { es: 'Contando las palabras…', en: 'Counting the words…' },
    { es: 'Mirando las tablas…', en: 'Looking at the tables…' },
  ],
  draft: [
    { es: 'Pensando en tus frases…', en: 'Thinking about your sentences…' },
    { es: 'Buscando cómo se unen…', en: 'Finding how they fit together…' },
    { es: 'Poniendo los colores…', en: 'Choosing the colours…' },
  ],
  check: [
    { es: 'Probando las frases…', en: 'Trying out the sentences…' },
    { es: 'Buscando erratas…', en: 'Looking for typos…' },
  ],
  repair: [
    { es: 'Arreglando un detalle…', en: 'Fixing a little detail…' },
    { es: 'Un momento más…', en: 'One moment more…' },
  ],
  pairs: [
    { es: 'Emparejando palabras…', en: 'Matching words…' },
    { es: 'Casi listo…', en: 'Almost there…' },
  ],
  done: [{ es: '¡Listo!', en: 'Ready!' }],
};

/** How far along the bar is at the start of each stage, in percent. It never goes backwards. */
const BASE: Record<Stage, number> = { read: 6, draft: 25, check: 55, repair: 62, pairs: 80, done: 100 };
export const progressFor = (stage: Stage, previous = 0) => Math.max(previous, BASE[stage]);

export function messageAt(stage: Stage, tick: number): Message {
  const list = STAGE_MESSAGES[stage];
  return list[((tick % list.length) + list.length) % list.length];
}

export type Outcome =
  | { kind: 'ready'; note?: undefined }
  | { kind: 'fallback'; note: string }
  | { kind: 'problem'; message: string; canRetry: boolean };

/** Plain English for the teacher, whatever the pipeline returned. */
export function describeResult(r: Pick<IngestResult, 'status' | 'reason'>): Outcome {
  switch (r.status) {
    case 'ready': return { kind: 'ready' };
    case 'fallback': return { kind: 'fallback', note: 'Your sheet is ready with basic help. Some of the clever checking was not available this time.' };
    case 'blocked': return { kind: 'problem', message: 'This document has content that cannot be used with students. Remove it and try again.', canRetry: false };
    case 'unreadable': return { kind: 'problem', message: 'That file could not be read as a Word document. Check that it opens in Word, then try again.', canRetry: true };
  }
}
export const FAILURE_MESSAGE = 'Something went wrong while reading the sheet. Try again in a minute.';
