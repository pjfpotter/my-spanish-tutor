import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normaliseWord } from '../speech/score';
import type { ClipFile } from '../tele/clip';
import { CUT_PAD, GHOST, ghostHash, ghostSlot, ghostWords, planGhost, unwantedSlots, wordCut, type GhostMeta, type SourceClip } from './ghost';
import { sourceHash } from './manifest';

const clip = (words: { text: string; t0: number; t1?: number }[], end: number, speed = 0.7): ClipFile =>
  ({ id: 'x', text: words.map((w) => w.text).join(' '), en: '', words, end, envelope: [], envelopeHop: 0.03, feelings: [], source: { provider: 'p', voiceId: 'v', model: 'm', speed, hash: 'h' } }) as ClipFile;
const at = (slot: string, c: ClipFile): SourceClip => ({ slot, clip: c });

describe('ghostWords', () => {
  const a = at('aaa', clip([{ text: 'Quiero', t0: 0 }, { text: 'una', t0: 0.5 }, { text: 'mesa.', t0: 0.9 }], 1.4));
  const b = at('bbb', clip([{ text: '¿Qué', t0: 0 }, { text: 'quiero?', t0: 0.4 }], 1));
  it('lists each distinct word once, however many clips it is in, and normalises like scoring', () => {
    const words = ghostWords([a, b]);
    expect(words.map((w) => w.word)).toEqual(['mesa', 'que', 'quiero', 'una']);
    expect(words.map((w) => w.word)).toEqual(words.map((w) => normaliseWord(w.word)));
  });
  it('picks the first clip in slot order, whatever order the clips arrive in', () => {
    const forward = ghostWords([a, b]).find((w) => w.word === 'quiero')!;
    const backward = ghostWords([b, a]).find((w) => w.word === 'quiero')!;
    expect(forward.source).toEqual({ slot: 'aaa', index: 0 });
    expect(backward).toEqual(forward);
  });
  it('uses slow clips only', () => {
    const normal = at('000', clip([{ text: 'hola', t0: 0 }], 1, 1));
    expect(ghostWords([normal, a]).map((w) => w.word)).not.toContain('hola');
    expect(ghostWords([normal])).toEqual([]);
  });
  it('gives a word the same ghost slot whatever its accents or punctuation, and different words different slots', () => {
    expect(ghostSlot('¿Qué?')).toBe(ghostSlot('que'));
    expect(ghostSlot('quiero')).not.toBe(ghostSlot('quieres'));
    expect(ghostSlot('quiero')).toMatch(/^[0-9a-f]{12}$/);
  });
  it('skips tokens with nothing to say', () => {
    expect(ghostWords([at('c', clip([{ text: '...', t0: 0 }, { text: 'sí', t0: 0.3 }], 0.8))]).map((w) => w.word)).toEqual(['si']);
  });
});

describe('wordCut', () => {
  it('cuts from just before the word to just after its own end when the end time is known', () => {
    const c = clip([{ text: 'a', t0: 0, t1: 0.3 }, { text: 'b', t0: 0.5, t1: 0.8 }, { text: 'c', t0: 1.2, t1: 1.5 }], 2);
    expect(wordCut(c, 1)).toEqual({ start: 0.47, end: 0.83 });
  });
  it('ends at the start of the next word when the clip has no end times, and at the clip end for the last word', () => {
    const c = clip([{ text: 'a', t0: 0 }, { text: 'b', t0: 0.5 }, { text: 'c', t0: 1.2 }], 2);
    expect(wordCut(c, 1)).toEqual({ start: 0.47, end: 1.2 });
    expect(wordCut(c, 2)).toEqual({ start: 1.17, end: 2 });
  });
  it('never leaves the clip, and the first word starts at zero', () => {
    const c = clip([{ text: 'a', t0: 0.01, t1: 0.9 }], 0.92);
    expect(wordCut(c, 0)).toEqual({ start: 0, end: 0.92 });
    expect(CUT_PAD).toBe(0.03);
  });
  it('does not reach into the neighbours when words almost touch', () => {
    const c = clip([{ text: 'a', t0: 0, t1: 0.5 }, { text: 'b', t0: 0.51, t1: 0.9 }, { text: 'c', t0: 0.92, t1: 1.3 }], 1.4);
    expect(wordCut(c, 1)).toEqual({ start: 0.5, end: 0.92 });
  });
  it('throws for a word that is not there', () => {
    expect(() => wordCut(clip([{ text: 'a', t0: 0 }], 1), 3)).toThrow('no word 3');
  });
});

describe('the real clips', () => {
  const dir = path.join(__dirname, '../../public/audio/clips');
  const real: SourceClip[] = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => ({ slot: f.replace('.json', ''), clip: JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as ClipFile }))
    : [];
  it.skipIf(!real.length)('gives a ghost word, cut from inside a clip, to quiero, tengo, me and gusta', () => {
    const words = ghostWords(real);
    // 294 distinct words are in the slow clips on 19 Nov 2026 (444 are in the normal-speed ones; those get no ghost word).
    expect(words.length).toBeGreaterThan(250);
    for (const w of ['quiero', 'tengo', 'me', 'gusta']) {
      const g = words.find((x) => x.word === w);
      expect(g, w).toBeDefined();
      const source = real.find((r) => r.slot === g!.source.slot)!.clip;
      const cut = wordCut(source, g!.source.index);
      expect(normaliseWord(source.words[g!.source.index].text)).toBe(w);
      expect(cut.end).toBeGreaterThan(cut.start);
      expect(cut.end).toBeLessThanOrEqual(source.end);
    }
  });
});

describe('planGhost', () => {
  const a = at('aaa', clip([{ text: 'Quiero', t0: 0 }, { text: 'una', t0: 0.5 }], 1));
  const b = at('bbb', clip([{ text: 'gusta', t0: 0 }], 0.6));
  const stored = (words: ReturnType<typeof ghostWords>): Map<string, GhostMeta> => new Map(words.map((w) => [w.slot, { word: w.word, hash: w.hash, source: w.source }]));
  const store = (m: Map<string, GhostMeta>) => ({ read: async (slot: string) => m.get(slot) ?? null });

  it('skips what is unchanged and builds what is missing', async () => {
    const words = ghostWords([a, b]);
    const have = stored(words);
    expect((await planGhost(words, store(have))).toBuild).toEqual([]);
    have.delete(words[0].slot);
    const plan = await planGhost(words, store(have));
    expect(plan.toBuild.map((w) => w.word)).toEqual([words[0].word]);
    expect(plan.upToDate).toHaveLength(words.length - 1);
  });
  it('a changed source clip makes only its own words stale', async () => {
    const have = stored(ghostWords([a, b]));
    const changedA = at('aaa', { ...a.clip, source: { ...a.clip.source, hash: 'new-voice' } });
    const plan = await planGhost(ghostWords([changedA, b]), store(have));
    expect(plan.toBuild.map((w) => w.word).sort()).toEqual(['quiero', 'una']);
    expect(plan.upToDate.map((w) => w.word)).toEqual(['gusta']);
  });
  it('a changed recipe marker makes every ghost word stale', async () => {
    const words = ghostWords([a, b]);
    const old = new Map([...stored(words)].map(([slot, m]) => [slot, { ...m, hash: ghostHash(m.word, 'h', 'ghost-whisper-v0') }]));
    expect((await planGhost(words, store(old))).toBuild).toHaveLength(words.length);
    expect(GHOST).not.toBe('ghost-whisper-v0');
  });
  it('a clip with no ghost words in common is untouched when another clip changes', async () => {
    const words = ghostWords([a, b]);
    const have = stored(words);
    const unrelated = at('zzz', clip([{ text: 'hola', t0: 0 }], 0.5));
    const plan = await planGhost(ghostWords([a, b, unrelated]), store(have));
    expect(plan.toBuild.map((w) => w.word)).toEqual(['hola']);
  });
  it('is different from a clip hash, so a ghost recipe change never rebuilds clips', () => {
    expect(ghostHash('quiero', 'h')).not.toBe(sourceHash('quiero', 'h', 'ghost', 0.7));
    expect(ghostHash('Quiero!', 'h')).toBe(ghostHash('quiero', 'h'));
  });
  it('lists ghost files that nothing wants any more', () => {
    const words = ghostWords([a]);
    expect(unwantedSlots(words, [words[0].slot, 'deadbeef0000', 'cafecafe1111'])).toEqual(['cafecafe1111', 'deadbeef0000']);
  });
  it('force rebuilds everything', async () => {
    const words = ghostWords([a, b]);
    expect((await planGhost(words, store(stored(words)), true)).toBuild).toHaveLength(words.length);
  });
});
