import type { Chunk } from '../course/schema';
import { LAB_ANSWERS } from '../../app/lab/memorise/content';
import { DEMO_ITEM_PREFIX } from './session';

/**
 * The built-in sample course. It reuses the made-up student's five signed-off answers from the memorise lab, so every
 * question and answer bit already has a built clip and the demo makes no paid calls.
 */
export const DEMO_ANSWERS = LAB_ANSWERS;

/** The sample answers as the timed round expects them. Ids carry a prefix so the device stores can be cleared on reset. */
export const DEMO_ITEMS = DEMO_ANSWERS.map((a) => ({
  id: `${DEMO_ITEM_PREFIX}${a.n}`,
  position: a.n,
  question: a.q,
  english: a.qen,
  answer: a.chunks.map((c) => c.t).join(' '),
}));

const TAGS = { opinion: ['opinion'], reason: ['justification'], link: ['connective'], time: ['adverb_phrase'], detail: ['adjective'], other: [] } as const;

/** The answers' bits as course chunks, so the round can split an answer into the same pieces the memorise stop uses. */
export const DEMO_CHUNKS: Chunk[] = DEMO_ANSWERS.flatMap((a) =>
  a.chunks.map((c) => ({ spanish: c.t, english: c.en, category: c.k, featureTags: [...TAGS[c.k as keyof typeof TAGS]] as Chunk['featureTags'], recycled: false })),
);
