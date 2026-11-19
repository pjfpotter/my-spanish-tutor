/**
 * Effort rewards, kept on the device only. Being caught ends the run and never costs anything: every run gives a
 * souvenir, and the screen says what improved. No names, no ranking, no network.
 */
import { STAGE_NAME, type Stage } from './doors';
import { STAGE_TRY } from '../ui/step-copy';

export const MUTATIONS = [
  { id: 'ears', line: 'Your reflection has rabbit ears now. They twitch when you say hola.' },
  { id: 'eye', line: 'There is a third eye on your reflection. It blinks a beat late.' },
  { id: 'door', line: 'A small door has appeared on your chest. It is locked. For now.' },
  { id: 'static', line: 'Your reflection is a little bit TV static around the edges.' },
  { id: 'halo', line: 'A fluorescent light hums above your head and follows you.' },
  { id: 'smile', line: 'Your reflection is smiling slightly more than you are.' },
] as const;
export type MutationId = (typeof MUTATIONS)[number]['id'];

export interface Saved { runs: number; best: number; bestBits: number; mutations: MutationId[] }
export const KEY = 'dreamcore-v1';
export const fresh = (): Saved => ({ runs: 0, best: 0, bestBits: 0, mutations: [] });

export function load(raw: string | null): Saved {
  if (!raw) return fresh();
  try {
    const o = JSON.parse(raw);
    return {
      runs: Number.isFinite(o.runs) ? o.runs : 0,
      best: Number.isFinite(o.best) ? o.best : 0,
      bestBits: Number.isFinite(o.bestBits) ? o.bestBits : 0,
      mutations: Array.isArray(o.mutations) ? o.mutations.filter((m: string) => MUTATIONS.some((x) => x.id === m)) : [],
    };
  } catch {
    return fresh();
  }
}

export interface Outcome {
  doors: number; bits: number; escaped: boolean; tries: number;
  /** The stage of the door the run ended on (5 when the student got out). */
  stage: Stage;
  /** No-help doors cleared without Show me. */
  clean: number;
}
export interface Reward {
  saved: Saved; mutation: (typeof MUTATIONS)[number]; newMutation: boolean; lines: string[];
  /** Where the student got to, as a line to show. */
  stageLine: string;
  /** The one thing to try next, only when the student was caught. */
  suggestion: string | null;
}

/** What this run earned. Always at least a souvenir and one kind line; improvements are named. */
export function settle(prev: Saved, o: Outcome, pick: number): Reward {
  const unseen = MUTATIONS.filter((m) => !prev.mutations.includes(m.id));
  const pool = unseen.length ? unseen : MUTATIONS;
  const mutation = pool[Math.min(pool.length - 1, Math.floor(pick * pool.length))];
  const lines: string[] = [];
  if (o.escaped) lines.push(`You got out. ${o.clean} no-help door${o.clean === 1 ? '' : 's'} cleared.`);
  else if (o.doors > prev.best) lines.push(prev.best ? `${o.doors - prev.best} door${o.doors - prev.best === 1 ? '' : 's'} further than ever before.` : `${o.doors} door${o.doors === 1 ? '' : 's'} opened on your first run.`);
  else if (o.doors > 0) lines.push(`${o.doors} door${o.doors === 1 ? '' : 's'} opened.`);
  if (o.bits > prev.bestBits && prev.bestBits) lines.push(`More bits said than your last best (${o.bits}).`);
  else if (o.bits) lines.push(`${o.bits} bit${o.bits === 1 ? '' : 's'} of Spanish said out loud.`);
  if (o.tries > 0) lines.push(`You tried again ${o.tries} time${o.tries === 1 ? '' : 's'} on a door. That is how it sticks.`);
  if (!lines.length) lines.push('You showed up and listened. That counts.');
  const saved: Saved = {
    runs: prev.runs + 1,
    best: Math.max(prev.best, o.doors),
    bestBits: Math.max(prev.bestBits, o.bits),
    mutations: prev.mutations.includes(mutation.id) ? prev.mutations : [...prev.mutations, mutation.id],
  };
  const stageLine = o.escaped ? 'You made it through all five stages.' : `You got as far as stage ${o.stage} of 5: ${STAGE_NAME[o.stage]}.`;
  return { saved, mutation, newMutation: !prev.mutations.includes(mutation.id), lines, stageLine, suggestion: o.escaped ? null : STAGE_TRY[o.stage] };
}
