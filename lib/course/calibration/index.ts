import freeTimeJson from './free-time.json' with { type: 'json' };
import freeTimeChunksJson from './free-time.chunks.json' with { type: 'json' };
import goingOutJson from './going-out.json' with { type: 'json' };
import type { Calibration } from './types.ts';
import type { Chunk } from '../schema.ts';

/**
 * The calibration data that ships with the app. To change how answers are judged, edit the JSON next
 * to this file: features, thresholds, level names, glue words and the teacher's examples are all there.
 * `free-time` is the teacher's calibrated reference (their model answers, rubric and sentence builder);
 * `going-out` is a draft for the seeded course.
 */
export const FREE_TIME = freeTimeJson as Calibration;
export const FREE_TIME_CHUNKS = freeTimeChunksJson as Chunk[];
export const GOING_OUT = goingOutJson as Calibration;
export * from './types.ts';
