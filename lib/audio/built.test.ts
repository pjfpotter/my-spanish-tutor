import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SEED_COURSE } from '../course/seed';
import { parseClipFile } from '../tele/clip';
import { findClip } from '../tele/clips';
import { PHRASE_BANK } from '../tele/phrase-bank';
import { planClips, slotFor, SPEEDS } from './manifest';

// Tasks 4.4 and 12.2: every clip the app needs exists, with audio and a complete timeline (word times,
// a loudness envelope and a feeling track). If a question or a line is edited and not rebuilt, this fails.
const dir = path.join(import.meta.dirname, '../../public/audio/clips');
const specs = planClips(SEED_COURSE.questions, PHRASE_BANK);
const timeline = (slot: string) => parseClipFile(JSON.parse(readFileSync(path.join(dir, `${slot}.json`), 'utf8')));

describe('every planned clip is built', () => {
  it('plans five questions at three speeds, their key words at two, and every phrase-bank line', () => {
    expect(specs.filter((s) => s.kind === 'question')).toHaveLength(25);
    expect(specs.filter((s) => s.kind === 'line')).toHaveLength(PHRASE_BANK.length);
  });

  it.each(specs.map((s) => [s.label, s] as const))('%s has audio and a valid timeline', (_label, spec) => {
    expect(existsSync(path.join(dir, `${spec.slot}.mp3`)), 'audio file').toBe(true);
    expect(findClip(spec.text, spec.speed), 'listed in the built index').toBe(spec.slot);
    const clip = timeline(spec.slot);
    expect(clip.text).toBe(spec.text);
    expect(clip.en).toBe(spec.en);
    expect(clip.words.length).toBeGreaterThan(0);
    expect(clip.envelope.length).toBeGreaterThan(0);
    expect(clip.feelings.length).toBeGreaterThan(0);
    expect(clip.source.speed).toBe(spec.speed);
    expect(clip.source.provider).toBe('elevenlabs');
  });

  it('keeps each phrase-bank line\'s baked feeling in its clip, and never uses a language model for it', () => {
    for (const line of PHRASE_BANK) {
      const clip = timeline(slotFor(line.es, SPEEDS.normal));
      expect(clip.feelings).toEqual([{ t0: 0, feelings: line.feelings }]);
    }
  });

  it('plays slow questions longer than normal, and normal longer than fast', () => {
    for (const q of SEED_COURSE.questions) {
      const [slow, normal, fast] = [SPEEDS.slow, SPEEDS.normal, SPEEDS.fast].map((s) => timeline(slotFor(q.spanish, s)).end);
      expect(slow).toBeGreaterThan(normal);
      expect(normal).toBeGreaterThan(fast);
    }
  });

  it('has no unused clips lying around (an edited question must not leave an old clip behind)', () => {
    const wanted = new Set(specs.map((s) => s.slot));
    const onDisk = existsSync(dir) ? (readFileSync(path.join(dir, '..', '..', '..', 'lib/audio/built.ts'), 'utf8').match(/"slot": "([0-9a-f]{12})"/g) ?? []) : [];
    for (const m of onDisk) expect(wanted.has(m.slice(-13, -1)), m).toBe(true);
  });
});
