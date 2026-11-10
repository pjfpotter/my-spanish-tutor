import { DEFAULT_MEMORISE, type MemoriseConfig } from '../memorise/fade';

/**
 * Skipping a known answer (task 21.6). A student can try an answer's final spoken recall first. If they
 * reach the accuracy threshold with no help, the earlier tasks for that answer are skipped. Mastery rules
 * still apply: skipping tasks does not make an answer memorised, only the usual successes across separate
 * sessions do.
 */
export function canSkipEarlierTasks(accuracy: number, assisted: boolean, cfg: MemoriseConfig = DEFAULT_MEMORISE): boolean {
  return !assisted && accuracy >= cfg.threshold;
}
