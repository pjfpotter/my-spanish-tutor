import type { createCostRouter } from '../cost-router/router.ts';
import { SERVICE_LIMITS, SHEET_INGEST } from '../cost-router/limits.ts';
import { buildBuilder, type Builder } from './builder.ts';
import { cacheKey, type IngestCache } from './cache.ts';
import { prepare } from './engine.ts';
import { fallbackInterpretation } from './fallback.ts';
import type { Interpretation } from './interpretation.ts';
import { enumeratePairs, judgePairs, parseVerdicts, type PairQuestion } from './pairs.ts';
import { draftInput, PAIRS_SYSTEM, parseInterpretation, PROMPT_VERSION, repairInput, SCHEMA_VERSION, type ModelInput } from './prompts.ts';
import { readDocx } from './read-docx.ts';
import { screenInterpretation, screenSheet } from './screen.ts';
import type { Sheet } from './types.ts';
import { validateInterpretation } from './validate.ts';
import { verifyBuilder, type Failure } from './verify.ts';

type Router = ReturnType<typeof createCostRouter>;
export const INGEST_SERVICE = 'sheet-ingest';
export const INGEST_LIMITS = { [INGEST_SERVICE]: SERVICE_LIMITS[SHEET_INGEST] };

/**
 * The upload pipeline (tasks 4.2 to 4.7): read, draft, verify and repair, judge pairs, with a safe fallback.
 * Every model call goes through the cost router and returns data that is checked before use. Nothing here
 * is shown to a student unless it has passed the validator, the screen and the verification gate.
 */
export interface ModelResult { output: unknown; units: number; costGbp: number }
export interface SheetModel { call(input: ModelInput): Promise<ModelResult> }
export type Stage = 'read' | 'draft' | 'check' | 'repair' | 'pairs' | 'done';

export interface CorrectionNotice { chunk: string; field: 'es' | 'en'; original: string | null; corrected: string; type: string }
export interface IngestResult {
  status: 'ready' | 'fallback' | 'blocked' | 'unreadable';
  reason?: string;
  hash?: string;
  sheet?: Sheet;
  interpretation?: Interpretation;
  builder?: Builder;
  failures: Failure[] | string[];
  repairs: number;
  pairs?: { asked: number; blocked: number; disagreed: number; truncated: boolean };
  /** What was corrected, for the teacher's notice (task 4.9). */
  corrections: CorrectionNotice[];
  costGbp: number;
  cached: boolean;
}

export interface IngestDeps {
  route: Router;
  model: SheetModel;
  cache?: IngestCache;
  courseId?: string | null;
  onStage?: (s: Stage) => void;
  maxRepairs?: number;
  maxPairs?: number;
  estimateGbp?: number;
  walks?: number;
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function correctionNotice(sheet: Sheet, i: Interpretation): CorrectionNotice[] {
  return i.corrections.map((c) => {
    const [col, idx] = c.chunk.split(':');
    const cell = i.columns.find((x) => x.key === col)?.cell;
    const src = cell === 'float0' ? sheet.floats.flatMap((f) => f.items)[Number(idx)] : sheet.tables.flatMap((t) => t.cells).find((x) => x.id === cell)?.items[Number(idx)];
    return { chunk: c.chunk, field: c.field, original: src ? (c.field === 'es' ? src.es : src.en) : null, corrected: c.to, type: c.type };
  });
}

export async function ingestSheet(input: ArrayBuffer | Uint8Array, deps: IngestDeps): Promise<IngestResult> {
  const stage = (s: Stage) => deps.onStage?.(s);
  const base = { failures: [] as Failure[] | string[], repairs: 0, corrections: [] as CorrectionNotice[], costGbp: 0, cached: false };
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  stage('read');
  let sheet: Sheet;
  try { sheet = readDocx(bytes); } catch (e) { return { ...base, status: 'unreadable', reason: (e as Error).message }; }
  if (!sheet.stats.items) return { ...base, status: 'unreadable', reason: 'No chunks were found in that document.', sheet };
  const screened = screenSheet(sheet);
  if (!screened.ok) return { ...base, status: 'blocked', reason: 'The document contains content that cannot be used with students.', sheet };

  const hash = await sha256(bytes), key = cacheKey(hash, PROMPT_VERSION, SCHEMA_VERSION);
  const done = (r: Omit<IngestResult, 'sheet' | 'hash' | 'cached' | 'costGbp' | 'corrections'> & Partial<IngestResult>): IngestResult => {
    const interp = r.interpretation as Interpretation;
    const out: IngestResult = { ...base, ...r, sheet, hash, corrections: correctionNotice(sheet, interp), costGbp: r.costGbp ?? 0, cached: r.cached ?? false, builder: prepare(buildBuilder(hash.slice(0, 12), sheet, interp)) };
    stage('done');
    return out;
  };

  const hit = await deps.cache?.get(key);
  if (hit) return done({ status: 'ready', interpretation: hit.interpretation, failures: [], repairs: hit.repairs, costGbp: 0, cached: true });

  let cost = 0;
  const estimate = deps.estimateGbp ?? 0.1;
  const ask = async (mi: ModelInput): Promise<unknown | null> => {
    const r = await deps.route({
      service: INGEST_SERVICE, tier: 'large_model', courseId: deps.courseId ?? null, estimateGbp: estimate,
      call: async () => { const m = await deps.model.call(mi); cost += m.costGbp; return { value: m.output, units: m.units, costGbp: m.costGbp }; },
      fallback: () => null,
    });
    return r.status === 'ok' ? r.value : null;
  };
  const fallback = (reason: string, failures: Failure[] | string[], repairs: number) => done({ status: 'fallback', reason, interpretation: fallbackInterpretation(sheet, sheet.titles[0]?.es ?? 'Uploaded sheet'), failures, repairs, costGbp: cost });

  // Check a drafted interpretation: shape, references, content, then the verification gate.
  const check = (output: unknown): { interp?: Interpretation; builder?: Builder; problems: string[] | Failure[] } => {
    const parsed = parseInterpretation(output);
    if (!parsed.ok) return { problems: parsed.problems };
    const refs = validateInterpretation(sheet, parsed.interp);
    if (refs.length) return { problems: refs.map((p) => `${p.path}: ${p.message}`) };
    const s = screenInterpretation(parsed.interp);
    if (!s.ok) return { problems: ['The draft contains content that cannot be used with students.'] };
    const builder = prepare(buildBuilder(hash.slice(0, 12), sheet, parsed.interp));
    const v = verifyBuilder(builder, { walks: deps.walks ?? 100, sheet });
    return v.ok ? { interp: parsed.interp, builder, problems: [] } : { interp: parsed.interp, builder, problems: v.failures };
  };

  stage('draft');
  let out = await ask(draftInput(sheet));
  if (out === null) return fallback('The model was not available.', [], 0);
  stage('check');
  let res = check(out), repairs = 0;
  const maxRepairs = deps.maxRepairs ?? 3;
  while (res.problems.length && repairs < maxRepairs) {
    repairs++;
    stage('repair');
    const prev = res.interp ?? ((out && typeof out === 'object' ? out : {}) as Interpretation);
    out = await ask(repairInput(sheet, prev, res.problems as string[]));
    if (out === null) return fallback('The model was not available.', res.problems, repairs);
    stage('check');
    res = check(out);
  }
  if (res.problems.length || !res.interp || !res.builder) return fallback('The draft still failed the checks after repair.', res.problems, repairs);

  // Pair verdicts: two independent passes, a block only when both say clash.
  let interp = res.interp, pairInfo: IngestResult['pairs'];
  stage('pairs');
  const { pairs, truncated } = enumeratePairs(res.builder, deps.maxPairs);
  if (pairs.length) {
    const outcome = await judgePairs(pairs, async (batch: PairQuestion[], pass: number) => {
      const r = await ask({ system: PAIRS_SYSTEM, data: { pairs: batch }, pass });
      return r === null ? null : parseVerdicts(r);
    });
    pairInfo = { asked: outcome.asked, blocked: outcome.blocks.length, disagreed: outcome.disagreed, truncated };
    if (outcome.blocks.length) {
      const withBlocks: Interpretation = { ...interp, pairBlocks: outcome.blocks };
      const rebuilt = prepare(buildBuilder(hash.slice(0, 12), sheet, withBlocks));
      // Blocking pairs must never leave a required part with nothing to pick.
      const v = verifyBuilder(rebuilt, { walks: deps.walks ?? 100, sheet });
      if (v.ok) interp = withBlocks; else pairInfo = { ...pairInfo, blocked: 0 };
    }
  }
  const result = done({ status: 'ready', interpretation: interp, failures: [], repairs, pairs: pairInfo, costGbp: cost });
  await deps.cache?.put(key, { status: 'ready', interpretation: interp, repairs, costGbp: cost });
  return result;
}
