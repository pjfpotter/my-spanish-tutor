import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.join(import.meta.dirname, '../..');
const tokensCss = readFileSync(path.join(root, 'app/tokens.css'), 'utf8');

/** Plain-hex custom properties from tokens.css, e.g. "ink-navy" -> "#0b2a4a". */
const hex: Record<string, string> = {};
for (const [, name, value] of tokensCss.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) hex[name] = value.toLowerCase();

function luminance(color: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Every place text sits on a surface in the app. Add a row when a new pairing is introduced. */
const READING_PAIRS: [text: string, surface: string][] = [
  ['black', 'white'], // window body, captions
  ['black', 'win-grey'], // window chrome and buttons
  ['text-muted', 'white'],
  ['text-muted', 'win-grey'],
  ['ink-navy', 'white'],
  ['ink-navy', 'win-grey'],
  ['ink-navy', 'sky-top'], // page text on the sky gradient
  ['ink-navy', 'sky-mid'],
  ['ink-navy', 'sky-low'],
  ['white', 'title-navy'], // title bars
  ['white', 'title-navy-end'],
  ['cream', 'title-navy'],
  ['cream', 'ink-navy'], // status strips
  ['soft-pink', 'ink-navy'],
];
const DECORATION_ONLY = ['hyper-pink', 'lemon', 'toxic-cyan'];

describe('design tokens: contrast', () => {
  it('reads every colour in the reading pairs from tokens.css', () => {
    for (const [text, surface] of READING_PAIRS) {
      expect(hex[text], `--${text} missing`).toBeDefined();
      expect(hex[surface], `--${surface} missing`).toBeDefined();
    }
  });

  it.each(READING_PAIRS)('%s on %s reaches 4.5:1 (WCAG AA text)', (text, surface) => {
    expect(contrast(hex[text], hex[surface])).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps decoration-only colours out of the text pairs', () => {
    for (const [text] of READING_PAIRS) expect(DECORATION_ONLY).not.toContain(text);
  });

  it('never sets text colour to a decoration-only colour in app styles', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = path.join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.css') || p.endsWith('.tsx')) files.push(p);
      }
    };
    walk(path.join(root, 'app'));
    walk(path.join(root, 'lib'));

    const bad = /(?<![-\w])color\s*:\s*(?:var\(--(?:hyper-pink|lemon|toxic-cyan)\)|#ff1fa9|#ffeb00|#00e5e5)/i;
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(bad);
  });

  it('keeps the focus ring visible: dark ring and light halo each pass 3:1 against both light and dark surfaces', () => {
    expect(contrast(hex['ink-navy'], hex['white'])).toBeGreaterThanOrEqual(3);
    expect(contrast(hex['ink-navy'], hex['win-grey'])).toBeGreaterThanOrEqual(3);
    expect(contrast(hex['white'], hex['title-navy'])).toBeGreaterThanOrEqual(3);
  });
});
