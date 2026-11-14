import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Task 14.3: the practice loop makes no language-model calls (usage-cost-control: Language model usage limits).
 * Starting from every route a student's practice round touches, follow the imports and fail if any reachable
 * file can call a model: a model tier on the cost router, a model SDK, a model endpoint, or the course set-up
 * module. Adding such a call anywhere on these paths makes this test fail.
 */
const ROOT = process.cwd();
const ENTRIES = [
  'app/api/respond/route.ts', 'app/api/attempts/route.ts', 'app/api/recall/route.ts', 'app/api/probe/route.ts',
  'app/api/transcribe/route.ts', 'app/api/answers/route.ts', 'app/api/baseline/route.ts',
  'app/phases/understand/Understand.tsx', 'app/phases/memorise/Memorise.tsx', 'app/phases/automate/Automate.tsx', 'app/phases/write/Write.tsx',
  'lib/automate/store.ts', 'lib/memorise/store.ts', 'lib/diagnostics/store.ts', 'lib/progress/writing-store.ts',
];
const FORBIDDEN: [RegExp, string][] = [
  // A call declares its tier when it goes through the router; the tier names alone (types, config) are not a call.
  [/tier:\s*['"](small|large)_model['"]/, 'a model tier on a call'],
  [/@anthropic-ai|anthropic\.com|@ai-sdk|from ['"]ai['"]|ai-gateway|generateText|streamText|generateObject/, 'a model SDK or gateway'],
  [/chat\/completions|\/v1\/responses|\/v1\/messages/, 'a model endpoint'],
  [/setUpCourse|SETUP_SERVICE/, 'the course set-up call'],
];
/** The transcription vendor is a speech service, not a language model. */
const SPEECH_ONLY = /lib\/transcription\/openai\.ts$/;

function resolve(from: string, spec: string): string | null {
  const base = spec.startsWith('.') ? path.resolve(path.dirname(from), spec) : null;
  if (!base) return null;
  for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, base.replace(/\.js$/, '.ts')]) if (existsSync(c) && /\.(ts|tsx)$/.test(c)) return c;
  return null;
}

function reachable(): string[] {
  const seen = new Set<string>();
  const queue = ENTRIES.map((e) => path.join(ROOT, e));
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    for (const m of readFileSync(file, 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
      const next = resolve(file, m[1]);
      if (next) queue.push(next);
    }
  }
  return [...seen];
}

describe('the practice loop makes no language-model calls (task 14.3)', () => {
  const files = reachable();

  it('reaches the real practice code, so the check is not empty', () => {
    const rel = files.map((f) => path.relative(ROOT, f).split(path.sep).join('/'));
    expect(rel.length).toBeGreaterThan(40);
    expect(rel).toEqual(expect.arrayContaining(['lib/automate/store.ts', 'lib/transcription/transcribe.ts', 'lib/cost-router/router.ts']));
  });

  it('reaches nothing that can call a language model', () => {
    const hits: string[] = [];
    for (const f of files) {
      if (SPEECH_ONLY.test(f.replaceAll('\\', '/'))) continue;
      const text = readFileSync(f, 'utf8');
      for (const [re, what] of FORBIDDEN) if (re.test(text)) hits.push(`${path.relative(ROOT, f)}: ${what}`);
    }
    expect(hits).toEqual([]);
  });

  it('would catch a model call if one were added (the scan itself works)', () => {
    for (const fake of ["route({ service: 'x', tier: 'small_model' })", 'tier: "large_model"', "import { generateText } from 'ai'", 'await setUpCourse(deps)']) {
      expect(FORBIDDEN.some(([re]) => re.test(fake)), fake).toBe(true);
    }
  });
});
