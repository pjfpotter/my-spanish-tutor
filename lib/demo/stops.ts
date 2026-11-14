/**
 * The demo tour (task 24, design D22): one-minute stops, each reachable directly and in order. Nothing here touches
 * the database. Progress through the tour is the page the visitor is on, so there is nothing to store.
 */
export interface Stop {
  id: 'hear' | 'memorise' | 'round' | 'tutor' | 'rewards' | 'teacher';
  title: string;
  /** One plain sentence on what this stop shows, for the hub. */
  blurb: string;
  path: string;
}

export const STOPS: readonly Stop[] = [
  { id: 'hear', title: 'Hear a question', blurb: 'Tele asks in Spanish. English only shows as a subtitle.', path: '/demo/hear' },
  { id: 'memorise', title: 'Memorise an answer', blurb: 'Say an answer a bit at a time. Words light up as Tele hears them.', path: '/demo/memorise' },
  { id: 'round', title: 'Answer against the clock', blurb: 'Chunks appear in colour as they are said. No hearts, no lives.', path: '/demo/round' },
  { id: 'tutor', title: 'Meet Tele', blurb: 'Poke the tutor and try its feelings.', path: '/demo/tutor' },
  { id: 'rewards', title: 'Rewards', blurb: 'Euros for effort, a streak that never threatens, no real money.', path: '/demo/rewards' },
  { id: 'teacher', title: 'Teacher overview', blurb: 'Sample class data: counts by step and where the class struggles.', path: '/demo/teacher' },
];

/** The stop for a page address, or null on the hub. */
export const stopAt = (pathname: string): { stop: Stop; index: number } | null => {
  const index = STOPS.findIndex((s) => pathname === s.path || pathname.startsWith(`${s.path}/`));
  return index < 0 ? null : { stop: STOPS[index], index };
};

export const nextStop = (pathname: string): Stop | null => {
  const at = stopAt(pathname);
  return at ? STOPS[at.index + 1] ?? null : null;
};

export const prevStop = (pathname: string): Stop | null => {
  const at = stopAt(pathname);
  return at ? STOPS[at.index - 1] ?? null : null;
};
