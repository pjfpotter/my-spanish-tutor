import type { Builder, Item } from './builder.ts';
import { clash, fragment, isReady, type Answer, type Question } from './engine.ts';

/**
 * Sign-off by the exam rule (task 5.2): credit anything that is grammatical and could be true. Block only
 * an answer that is incomplete, half-built or contradictory, and name at most ONE thing to fix. Strange
 * but possible answers pass. No model is called; model-judged pairs have already shaped what can be built.
 */
export type SignOff =
  | { code: 'ok' }
  | { code: 'incomplete'; fix: { slot: string; noun: string; have?: string } }
  | { code: 'clash'; fix: { slot: string; message: string } };

export function signOff(B: Builder, a: Answer, Q?: Question): SignOff {
  const f = fragment(B, a, Q);
  if (f) return { code: 'incomplete', fix: { slot: f.missing, noun: B.slotMap[f.missing].noun, have: a[f.have]?.es } };
  if (!isReady(B, a, Q)) {
    const need = Q?.required ?? B.required, slot = need.find((k) => !a[k]) ?? B.requiredAny?.[0]?.find((k) => !a[k]) ?? B.auto.find((k) => !a[k]);
    return { code: 'incomplete', fix: { slot: slot ?? B.slots[0].key, noun: slot ? B.slotMap[slot].noun : 'a sentence' } };
  }
  // A contradiction: some chunk does not fit the rest. Typed answers can contain these; built ones cannot.
  for (const sd of B.slots) {
    const it = a[sd.key];
    if (!it) continue;
    const rest: Answer = { ...a };
    delete rest[sd.key];
    const c = clash(B, rest, sd.key, it as Item, Q);
    if (c) return { code: 'clash', fix: { slot: sd.key, message: c.msg } };
  }
  return { code: 'ok' };
}

/** The line Tele says, in Spanish with an English subtitle, for each outcome. The tutor never speaks English. */
export const TELE_LINES = {
  ok: { es: 'Vale, esto tiene sentido. ¡Buen trabajo!', en: 'OK, this makes sense. Good work!' },
  incomplete: { es: 'Casi. Falta una cosa.', en: 'Nearly. One thing is missing.' },
  clash: { es: 'Mmm… estas dos cosas no van juntas.', en: "Hmm… these two things don't go together." },
} as const;
