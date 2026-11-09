import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Task 19.5 (student-flow-principles: Unexplained Spanish is never shown). Every heading, button, label and window title
// is English. Spanish may appear in the interface only as learning content, or with its English translation beside it.
// This scans the interface source for Spanish and fails on anything not on the allow-list below.

const ROOT = path.resolve(__dirname, '../../app');
/** Developer-only pages that are not linked from the app. */
const SKIP_DIRS = new Set(['lab', 'spike']);

/** Accented letters and inverted marks, or common Spanish words that would be easy to leave as a title or label. */
const SPANISH = /[áéíóúñ¿¡]|\b(bienvenid[oa]|privacidad|tienda|escritorio|recuperar|automatizar|memorizar|entender|escribir|hablar|hola|progreso|clase|alumnos|problemas|ajustes|coste|borrar|historial|empezar|fases|examen|inicio|hoy|días|pregunta|respuesta|gracias|vamos|animo|ánimo)\b/i;

/**
 * Lines that may contain Spanish, each with the reason. A fragment matches if the line includes it.
 * Learning content (questions, answers, chunks, tutor lines) comes from the course data and `lib/tele`, not from this source.
 */
const ALLOWED: { fragment: string; why: string }[] = [
  { fragment: "const IDLE_ES = '· · · señal débil · · ·'", why: "Tele's caption when idle: a tutor line, and its English subtitle (IDLE_EN) sits beside it" },
  { fragment: '[.,;:!?¡¿"“”]', why: 'a punctuation-stripping pattern in code, not text shown to anyone' },
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return SKIP_DIRS.has(name) ? [] : files(full);
    return /\.(tsx?|css)$/.test(name) && !name.endsWith('.test.ts') ? [full] : [];
  });
}

describe('the interface is in English', () => {
  it('shows no Spanish outside the allow-list of learning content', () => {
    const found: string[] = [];
    for (const file of files(ROOT)) {
      readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (!SPANISH.test(line)) return;
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // a comment is for developers
        if (ALLOWED.some((a) => line.includes(a.fragment))) return;
        found.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(found, 'Spanish in the interface: translate it, or add it to ALLOWED with the reason').toEqual([]);
  });

  it('keeps every allow-list entry honest: each still matches a line, so stale entries are removed', () => {
    const all = files(ROOT).flatMap((f) => readFileSync(f, 'utf8').split(/\r?\n/));
    for (const a of ALLOWED) {
      expect(all.some((l) => l.includes(a.fragment)), a.fragment).toBe(true);
    }
  });
});
