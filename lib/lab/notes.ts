/**
 * Notes and the attempt log for the automate lab (automate-lab). Pure formatting plus guarded device storage.
 * Everything lives on the tester's device and is never sent anywhere. Free text is the tester's own.
 */
export const LAB_PREFIX = 'lab:automate:';
export const NOTES_KEY = `${LAB_PREFIX}notes`;
export const LOG_KEY = `${LAB_PREFIX}log`;
export const ORDER_KEY = `${LAB_PREFIX}last-order`;
export const rowsKey = (student: string) => `${LAB_PREFIX}rows:${student}`;

export const TAGS = ['too fast', 'too slow', 'too hard', 'unfair', 'confusing', 'good'] as const;
export type Tag = (typeof TAGS)[number];

/** What was on screen. Every field is null until there is something to say. */
export interface Stamp {
  student: string;
  stage: string | null;
  position: number | null;
  level: string | null;
  windowMs: number | null;
  responseMs: number | null;
  accuracy: number | null;
  assisted: boolean | null;
  blank: boolean | null;
}

export interface Note {
  at: string;
  tags: Tag[];
  text: string;
  stamp: Stamp;
}

export interface LogRow {
  at: string;
  student: string;
  position: number;
  level: string;
  windowMs: number;
  responseMs: number | null;
  accuracy: number | null;
  assisted: boolean;
  blank: boolean;
}

const sec = (ms: number | null) => (ms === null ? '-' : `${(ms / 1000).toFixed(1)}s`);
const pct = (n: number | null) => (n === null ? '-' : `${n}%`);

function stampText(s: Stamp): string {
  const parts = [
    s.position !== null ? `Q${s.position}` : null,
    s.level ? s.level : null,
    s.windowMs !== null ? `window ${sec(s.windowMs)}` : null,
    s.responseMs !== null ? `response ${sec(s.responseMs)}` : null,
    s.accuracy !== null ? `accuracy ${pct(s.accuracy)}` : null,
    s.blank ? 'blank' : null,
    s.assisted ? 'hint shown' : null,
    s.stage ? `(${s.stage})` : null,
  ].filter(Boolean);
  return parts.join(', ') || 'nothing on screen';
}

/** The whole report as plain text, to paste anywhere. */
export function formatReport(i: { device: string; student: string; notes: Note[]; log: LogRow[] }): string {
  const out: string[] = ['Automate lab notes', `Device: ${i.device}`, `Fake student: ${i.student}`, ''];
  out.push(`Notes (${i.notes.length})`);
  if (!i.notes.length) out.push('  none');
  i.notes.forEach((n, k) => {
    out.push(`  ${k + 1}. [${n.stamp.student}] ${stampText(n.stamp)}`);
    if (n.tags.length) out.push(`     tags: ${n.tags.join(', ')}`);
    if (n.text.trim()) out.push(`     ${n.text.trim().replace(/\n/g, '\n     ')}`);
  });
  out.push('', `Attempts (${i.log.length})`);
  if (!i.log.length) out.push('  none');
  else {
    out.push('  # | student | Q | level | window | response | accuracy | flags');
    i.log.forEach((r, k) => out.push(`  ${k + 1} | ${r.student} | ${r.position} | ${r.level} | ${sec(r.windowMs)} | ${sec(r.responseMs)} | ${pct(r.accuracy)} | ${[r.blank ? 'blank' : '', r.assisted ? 'hint' : ''].filter(Boolean).join(' ')}`));
  }
  return out.join('\n');
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked or full: this visit still works */
  }
}

/** Clears what the lab keeps for one student's rounds: ladder, personal bests, attempts and the shuffle memory. Notes and the log stay. */
export function resetRound(student: string, itemIds: string[]): void {
  try {
    for (const id of itemIds) {
      localStorage.removeItem(`ladder:${id}`);
      localStorage.removeItem(`best-ms:${id}`);
    }
    localStorage.removeItem(rowsKey(student));
    sessionStorage.removeItem(ORDER_KEY);
  } catch {
    /* nothing was kept, or storage is blocked */
  }
}
