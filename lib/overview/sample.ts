import type { CostReport } from '../cost/report';
import type { OverviewData } from './overview';

/**
 * Made-up figures for demonstrations (teacher-overview: Demonstration data). Built in memory and never
 * written to the database, so sample students can never mix with real ones.
 */
export function sampleOverview(): OverviewData {
  const students: OverviewData['students'] = [
    ['Cosmic Otter', 'ready', 100], ['Zesty Taco', 'ready', 93], ['Fuzzy Panda', 'automate', 80], ['Sneaky Gecko', 'automate', 73],
    ['Turbo Mango', 'memorise', 60], ['Spicy Llama', 'memorise', 53], ['Dozy Comet', 'understand', 40], ['Wobbly Cactus', 'understand', 33],
    ['Funky Waffle', 'understand', 27], ['Snazzy Pigeon', 'write', 13], ['Cheeky Burrito', 'write', 7], ['Sleepy Toaster', 'write', 0],
  ].map(([nickname, stage, readiness]) => ({ nickname, stage, readiness }) as OverviewData['students'][number]);
  const stages = { write: 3, understand: 3, memorise: 2, automate: 2, ready: 2 };
  return {
    title: 'Year 8 Spanish (sample class)',
    testDate: '2026-11-20',
    joined: students.length,
    started: 11,
    stages,
    averageReadiness: Math.round(students.reduce((s, x) => s + x.readiness, 0) / students.length),
    students,
    questionHotspots: [
      { label: '¿Qué vas a llevar este fin de semana?', misses: 14 },
      { label: '¿Qué tipo de películas te gustan?', misses: 9 },
      { label: '¿Qué haces en tu tiempo libre?', misses: 5 },
    ],
    chunkHotspots: [
      { label: 'voy a llevar', misses: 11 },
      { label: 'porque es divertido', misses: 8 },
      { label: 'a veces', misses: 4 },
    ],
    causes: [
      { tag: 'too_fast', count: 21 },
      { tag: 'word_not_known', count: 13 },
      { tag: 'not_known_well_enough', count: 9 },
    ],
  };
}

export function sampleCost(): CostReport {
  return {
    students: 12,
    totalGbp: 0.54,
    perStudentGbp: 0.045,
    tiers: [
      { tier: 'stored', costGbp: 0, share: 0, calls: 0 },
      { tier: 'rules', costGbp: 0, share: 0, calls: 0 },
      { tier: 'speech', costGbp: 0.46, share: 0.852, calls: 310 },
      { tier: 'small_model', costGbp: 0.08, share: 0.148, calls: 2 },
      { tier: 'large_model', costGbp: 0, share: 0, calls: 0 },
    ],
    refused: 1,
  };
}
