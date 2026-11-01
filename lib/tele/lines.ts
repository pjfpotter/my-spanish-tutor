import type { Feelings } from './feelings';
import type { ClipTimeline } from './timeline';

export interface TutorLine {
  id: string;
  /** Spanish, what Tele says. */
  es: string;
  /** English subtitle, text only. Tele never speaks English. */
  en: string;
  feelings: Feelings;
}

/**
 * PLACEHOLDER lines for poking Tele (task 18.5). Hand-written, simple Spanish, no student data.
 * Replaced by the generated phrase bank with baked feelings and real clips in tasks 12.1 and 12.2.
 */
export const PLACEHOLDER_LINES: TutorLine[] = [
  { id: 'hola', es: '¡Hola! Soy Tele. Vivo en la tele.', en: "Hi! I'm Tele. I live in the TV.", feelings: { joy: 0.7 } },
  { id: 'boton', es: '¡Ay! ¡Cuidado con el botón!', en: 'Ouch! Careful with the button!', feelings: { surprise: 0.8 } },
  { id: 'ojo', es: 'Tengo un ojo. Solo uno. Es suficiente.', en: "I have one eye. Just one. It's enough.", feelings: { joy: 0.4 } },
  { id: 'polvo', es: '¡Qué asco! Hay polvo en mi pantalla.', en: "Yuck! There's dust on my screen.", feelings: { disgust: 0.8 } },
  { id: 'ves', es: '¿Me ves? Yo te veo.', en: 'Do you see me? I see you.', feelings: { surprise: 0.3, joy: 0.3 } },
  { id: 'poco', es: 'Vamos a practicar. Poco a poco.', en: "Let's practise. Little by little.", feelings: { joy: 0.5 } },
  { id: 'lluvia', es: 'Hoy hay nubes. Estoy un poco triste.', en: "Today there are clouds. I'm a little sad.", feelings: { sadness: 0.6 } },
];

/** A random line that is not the one just played (when there is more than one to choose from). */
export function pickLine(lines: TutorLine[], lastId: string | null, random: () => number = Math.random): TutorLine {
  const pool = lines.length > 1 ? lines.filter((l) => l.id !== lastId) : lines;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

/** Splits a Spanish line into words, keeping punctuation attached so it reads naturally. */
export function wordsOf(es: string): string[] {
  return es.split(/\s+/).filter(Boolean);
}

/**
 * A rough timeline for a line with no audio yet: about 70 ms a letter, a short pause at
 * punctuation. Only used until real clip timelines exist (4.4). The feeling holds for the line.
 */
export function estimateTimeline(line: TutorLine): ClipTimeline {
  const words = wordsOf(line.es);
  let t = 0.2;
  const timed = words.map((text) => {
    const t0 = t;
    t += Math.max(0.25, text.replace(/[^\p{L}]/gu, '').length * 0.07) + (/[.!?]$/.test(text) ? 0.25 : 0);
    return { text, t0 };
  });
  return { words: timed, end: t + 0.3, feelings: [{ t0: 0, feelings: line.feelings }] };
}
