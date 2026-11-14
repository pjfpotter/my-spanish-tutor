import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { WINDOW_TITLES } from './window-titles';

const SPANISH = /[áéíóúñ¿¡]|\b(preguntas|correcciones|leyendo|hablar|lámpara|reloj|planta)\b/i;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? sourceFiles(full) : /\.tsx$/.test(name) ? [full] : [];
  });
}

describe('window titles are plain English', () => {
  it('has no file-name styling and no Spanish in the home-screen titles', () => {
    for (const title of Object.values(WINDOW_TITLES)) {
      expect(title).not.toMatch(/\.exe/i);
      expect(title).not.toMatch(SPANISH);
    }
  });

  it('keeps every window title in the app free of ".exe" and Spanish labels', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(path.join(process.cwd(), 'app'))) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/<Win\s+title=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        const title = m[1] ?? m[2] ?? '';
        if (/\.exe/i.test(title) || SPANISH.test(title)) offenders.push(`${path.relative(process.cwd(), file)}: ${title}`);
      }
      if (/<span>[a-z-]+\.exe<\/span>/i.test(text)) offenders.push(`${path.relative(process.cwd(), file)}: a title bar span`);
    }
    expect(offenders).toEqual([]);
  });
});
