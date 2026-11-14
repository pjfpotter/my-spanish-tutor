import type { CorrectionNotice } from './ingest.ts';

/**
 * The teacher's notice of what was corrected (task 4.9). It is informational: students can already use
 * the sheet, and nothing waits on the teacher opening this.
 */
const TYPE_NAMES: Record<string, string> = {
  spelling: 'Spelling',
  agreement: 'Agreement',
  'missing-english': 'Added English',
  'wrong-english': 'English fixed',
};

export interface NoticeLine { type: string; original: string; corrected: string; text: string }
export interface Notice { count: number; headline: string; lines: NoticeLine[] }

export function describeNotice(corrections: CorrectionNotice[]): Notice {
  const lines = corrections.map((c) => {
    const type = TYPE_NAMES[c.type] ?? c.type;
    const original = c.original ?? '';
    return { type, original, corrected: c.corrected, text: c.original ? `${type}: “${c.original}” is now “${c.corrected}”` : `${type}: “${c.corrected}”` };
  });
  const n = lines.length;
  return { count: n, headline: n === 0 ? 'No corrections were needed.' : `${n} ${n === 1 ? 'correction was' : 'corrections were'} made.`, lines };
}
