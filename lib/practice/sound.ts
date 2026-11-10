/**
 * Interface sounds (task 20.4). Short, original or licensed clips under public/audio/sfx. A sound plays only
 * when the student has sound on AND the calm switch is off. Reduced motion stops animations, not sounds.
 * Repeats never play the same take twice in a row, so a long run of correct answers does not feel like one loop.
 */
export const SFX_FILES = {
  correct: ['correct-1.mp3', 'correct-2.mp3', 'correct-3.mp3', 'correct-4.mp3'],
  miss: ['miss-1.mp3', 'miss-2.mp3', 'miss-3.mp3'],
  // combo-2 has not been generated yet; add it here when it exists.
  combo: ['combo-1.mp3'],
  'personal-best': ['personal-best.mp3'],
  'section-complete': ['section-complete.mp3'],
  tap: ['tap-1.mp3', 'tap-2.mp3', 'tap-3.mp3'],
  // Tele's wordless reactions (task 20.2)
  'tele-correct': ['tele-correct-1.mp3', 'tele-correct-2.mp3', 'tele-correct-3.mp3', 'tele-correct-4.mp3'],
  'tele-wrong': ['tele-wrong-1.mp3', 'tele-wrong-2.mp3', 'tele-wrong-3.mp3'],
  'tele-skipped': ['tele-skipped-1.mp3', 'tele-skipped-2.mp3'],
} as const;
export type SfxName = keyof typeof SFX_FILES;

export const SFX_BASE = '/audio/sfx/';
export const SOUND_KEY = 'sound';

/** Sound is on unless the student turned it off. */
export const soundOn = (stored: string | null) => stored !== 'off';

export const soundAllowed = (opts: { soundOn: boolean; calm: boolean }) => opts.soundOn && !opts.calm;

/** A take that is not the one played last, when there is more than one. */
export function nextTake(name: SfxName, last: string | null, random: () => number = Math.random): string {
  const files: readonly string[] = SFX_FILES[name];
  const choices = files.length > 1 ? files.filter((f) => f !== last) : files;
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}
