import { describe, expect, it } from 'vitest';
import { ADJECTIVES, NOUNS, generateNickname, isNicknameShape, nicknameOptions } from './profile';

// A small seeded random source, so a test failure can be repeated.
const seeded = (seed = 1) => { let s = seed; return (max: number) => { s = (s * 16807) % 2147483647; return s % max; }; };

describe('generated nicknames', () => {
  it('have one or two different adjectives and a noun, from the closed lists', () => {
    const random = seeded(7);
    let two = 0; let three = 0;
    for (let i = 0; i < 3000; i++) {
      const words = generateNickname(random).split(' ');
      expect(words.length === 2 || words.length === 3).toBe(true);
      const adjectives = words.slice(0, -1);
      expect(adjectives.every((a) => (ADJECTIVES as readonly string[]).includes(a))).toBe(true);
      expect((NOUNS as readonly string[]).includes(words[words.length - 1])).toBe(true);
      expect(new Set(adjectives).size).toBe(adjectives.length);
      if (words.length === 2) two++; else three++;
    }
    // About one in four has two adjectives, so both shapes come up often.
    expect(three).toBeGreaterThan(500);
    expect(two).toBeGreaterThan(1800);
  });

  it('accepts what the generator makes and every name from the original 12 by 12 list', () => {
    const random = seeded(3);
    for (let i = 0; i < 500; i++) expect(isNicknameShape(generateNickname(random))).toBe(true);
    const oldAdjectives = ['Sleepy', 'Fuzzy', 'Zesty', 'Cosmic', 'Wobbly', 'Sneaky', 'Cheeky', 'Funky', 'Spicy', 'Dozy', 'Snazzy', 'Turbo'];
    const oldNouns = ['Llama', 'Taco', 'Otter', 'Burrito', 'Comet', 'Pigeon', 'Cactus', 'Gecko', 'Waffle', 'Panda', 'Toaster', 'Mango'];
    for (const a of oldAdjectives) for (const n of oldNouns) expect(isNicknameShape(`${a} ${n}`)).toBe(true);
  });

  it('refuses anything typed that is not made of the lists', () => {
    for (const bad of ['', 'Alex', 'Alex Smith', 'Sleepy', 'Llama', 'Llama Sleepy', 'Sleepy Sleepy Llama', 'Sleepy Cosmic Fuzzy Llama', 'sleepy llama', 'Sleepy  Llama', ' Sleepy Llama', 'Sleepy Llama ', 'Sleepy Cosmic', 'Sleepy Llama Taco', 'my dog is called Rex']) {
      expect(isNicknameShape(bad), bad).toBe(false);
    }
  });
});

describe('nickname options', () => {
  it('are six different names by default', () => {
    expect(new Set(nicknameOptions(6)).size).toBe(6);
    expect(nicknameOptions()).toHaveLength(6);
  });

  it('never include a name that is already taken, even when most of the two-part names are', () => {
    const everyTwoPart = ADJECTIVES.flatMap((a) => NOUNS.map((n) => `${a} ${n}`));
    const taken = new Set(everyTwoPart.slice(0, everyTwoPart.length - 20));
    const random = seeded(11);
    for (let i = 0; i < 200; i++) for (const o of nicknameOptions(6, random, taken)) expect(taken.has(o)).toBe(false);
  });

  it('can be asked for with a taken list in any order and gives distinct names', () => {
    const taken = ['Sleepy Llama', 'Fuzzy Taco'];
    const opts = nicknameOptions(6, seeded(5), taken);
    expect(new Set(opts).size).toBe(6);
    expect(opts).not.toContain('Sleepy Llama');
    expect(opts).not.toContain('Fuzzy Taco');
  });

  it('give up with an error, not a loop, when there is nothing free', () => {
    expect(() => nicknameOptions(6, () => 0, ['Sleepy Llama'])).toThrow('free nicknames');
  });
});

// Words and runs of letters that must never appear in a nickname. Checked against every two-part name, with and without its space,
// because rude words can be made across the join ("... Ass" + "ist ..."). Three-part names reuse the same words.
const BLOCKED = [
  'ass', 'arse', 'butt', 'bum', 'crap', 'damn', 'hell', 'shit', 'fuck', 'cock', 'dick', 'piss', 'pee', 'poo', 'fart', 'slut', 'tit', 'boob', 'sex', 'porn',
  'nazi', 'rape', 'drug', 'kill', 'die', 'dead', 'gay', 'fat', 'ugly', 'dumb', 'stupid', 'idiot', 'wank', 'twat', 'spaz', 'retard', 'paki', 'coon', 'nig', 'fag', 'god', 'jesus', 'hitler',
];

describe('the vocabulary', () => {
  const twoPart = ADJECTIVES.flatMap((a) => NOUNS.map((n) => `${a} ${n}`));

  it('is large: at least 1,500 two-part names and at least 50,000 three-part names, with no word listed twice', () => {
    expect(twoPart.length).toBeGreaterThanOrEqual(1500);
    expect(ADJECTIVES.length * (ADJECTIVES.length - 1) * NOUNS.length).toBeGreaterThanOrEqual(50_000);
    expect(new Set(ADJECTIVES).size).toBe(ADJECTIVES.length);
    expect(new Set(NOUNS).size).toBe(NOUNS.length);
    expect(new Set(twoPart).size).toBe(twoPart.length);
  });

  it('is letters only, each word a single capitalised word', () => {
    for (const w of [...ADJECTIVES, ...NOUNS]) expect(w).toMatch(/^[A-Z][a-z]+$/);
  });

  it('contains no rude word, in any two-part name, with or without its space', () => {
    const hits: string[] = [];
    for (const name of twoPart) {
      for (const text of [name.toLowerCase(), name.toLowerCase().replace(' ', '')]) {
        for (const bad of BLOCKED) if (text.includes(bad)) hits.push(`${name} -> ${bad}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('would catch a rude word if one were added', () => {
    const sneaky = [...ADJECTIVES, 'Dumb'].flatMap((a) => NOUNS.map((n) => `${a} ${n}`.toLowerCase()));
    expect(sneaky.some((t) => BLOCKED.some((b) => t.includes(b)))).toBe(true);
  });
});
