import { describe, expect, it } from 'vitest';
import { SEED_COURSE } from '../course/seed';
import { assessAnswer, assessTest, FEATURE_LABELS, matchChunks, tokens } from './rubric';

const course = SEED_COURSE;
const rungOf = (q: number, text: string) => assessAnswer(course, q, text).answerRung;
const spanish = (matches: ReturnType<typeof matchChunks>) => matches.map((m) => m.chunk.spanish);

describe('finding chunks in an answer', () => {
  it('ignores capitals, accents and punctuation', () => {
    expect(tokens('¡Qué LÁSTIMA!, ¿no?')).toEqual(['que', 'lastima', 'no']);
    expect(tokens('El año pasado')).toEqual(['el', 'año', 'pasado']); // ñ is kept: año is not ano
    expect(spanish(matchChunks('ME GUSTAN LAS PELICULAS DE ACCION', course.chunks))).toEqual(['Me gustan las películas de', 'acción']);
  });

  it('takes the longest chunk and counts each word once', () => {
    // "salgo con mis amigos" must not also count "con mis amigos".
    const found = spanish(matchChunks('Después, salgo con mis amigos.', course.chunks));
    expect(found).toContain('salgo con mis amigos');
    expect(found).not.toContain('con mis amigos');
    // "muy divertidas" is a phrase, not "divertidas" as well.
    const phrase = spanish(matchChunks('porque son muy divertidas', course.chunks));
    expect(phrase).toContain('muy divertidas');
    expect(phrase).not.toContain('divertidas');
  });

  it('counts a chunk used twice twice, and does not match part of a different word', () => {
    expect(matchChunks('Voy a llevar una camiseta. Voy a llevar una chaqueta.', course.chunks).filter((m) => m.chunk.spanish === 'Voy a llevar')).toHaveLength(2);
    expect(spanish(matchChunks('azules', course.chunks))).not.toContain('azul'); // a whole word, not a part of one
  });

  it('returns matches in reading order', () => {
    const m = matchChunks('Primero, voy a llevar una chaqueta. Después, salgo con mis amigos.', course.chunks);
    expect(m.map((x) => x.from)).toEqual([...m.map((x) => x.from)].sort((a, b) => a - b));
  });
});

describe('one answer: survival, opinion and detail', () => {
  it('survival is a relevant sentence: a verb phrase from the question\'s topic', () => {
    expect(rungOf(1, 'Me gustan las películas de acción.')).toBe('survival');
    expect(rungOf(3, 'Normalmente llevo unos vaqueros.')).toBe('survival');
  });

  it('is not yet survival with no verb phrase, or nothing relevant to the question', () => {
    expect(rungOf(1, 'acción miedo amor')).toBeNull(); // words, but no sentence
    expect(rungOf(1, 'Normalmente llevo unos vaqueros.')).toBeNull(); // a sentence, but about clothes, not films
    expect(rungOf(1, 'Hola, no sé.')).toBeNull();
  });

  it('reaches the opinion rung with a justified opinion', () => {
    const a = assessAnswer(course, 1, 'Me encantan las películas de miedo porque son muy divertidas.');
    expect(a.counts.justifiedOpinions).toBe(1);
    expect(a.answerRung).toBe('opinion');
  });

  it('does not count an opinion with no reason, or a reason with no opinion', () => {
    expect(assessAnswer(course, 1, 'Me gustan las películas de acción.').counts.justifiedOpinions).toBe(0);
    expect(assessAnswer(course, 2, 'Lo siento, no puedo porque tengo que hacer los deberes.').counts.justifiedOpinions).toBe(0);
  });

  it('reaches detail with no opinion at all: three verb phrases, a sequencer and enough detail words', () => {
    const a = assessAnswer(
      course, 3,
      'Primero, normalmente llevo unos vaqueros negros y una camiseta blanca. Después, cuando salgo con mis amigos, llevo unas zapatillas de moda porque quiero estar guay.',
    );
    expect(a.routes).toEqual({ opinion: false, detail: true });
    expect(a.counts).toMatchObject({ verbPhrases: 3, sequencers: 2 });
    expect(a.counts.detailPoints).toBeGreaterThanOrEqual(3);
    expect(a.answerRung).toBe('detail');
  });

  it('needs the sequencer: three verb phrases without one stay below detail', () => {
    const a = assessAnswer(course, 3, 'Normalmente llevo unos vaqueros negros y una camiseta blanca. Cuando salgo con mis amigos, llevo unas zapatillas de moda porque quiero estar guay.');
    expect(a.counts.verbPhrases).toBe(3);
    expect(a.counts.sequencers).toBe(0);
    expect(a.routes.detail).toBe(false);
    expect(a.answerRung).toBe('survival');
  });

  it('needs the verb phrases: detail words and a sequencer are not enough', () => {
    const a = assessAnswer(course, 3, 'Primero, normalmente llevo unos vaqueros negros y una camiseta blanca de moda.');
    expect(a.counts.verbPhrases).toBe(1);
    expect(a.answerRung).toBe('survival');
  });
});

describe('detail words: a phrase is worth more than a single word', () => {
  const base = 'Normalmente llevo unos vaqueros';
  const points = (text: string) => assessAnswer(course, 3, text).counts.detailPoints;

  it('values an adjective phrase above a single adjective', () => {
    expect(points(`${base} de moda.`)).toBeGreaterThan(points(`${base} negros.`));
  });

  it('values an adverb phrase above a single adverb', () => {
    const phrase = assessAnswer(course, 5, 'A veces juego a los videojuegos.').counts.detailPoints;
    const single = assessAnswer(course, 5, 'Siempre juego a los videojuegos.').counts.detailPoints;
    expect(phrase).toBe(2);
    expect(single).toBe(1);
  });
});

describe('fancy language', () => {
  it('counts other tenses, tricky syntax and idioms as fancy, and other tenses are not basic tenses', () => {
    const perfect = assessAnswer(course, 1, 'Me gustan las películas de acción. He visto muchas películas este año.');
    expect(perfect.counts.fancy).toBe(1);
    expect(perfect.tenses).toEqual(['present']); // the perfect does not count as a basic tense
    expect(assessAnswer(course, 1, 'A mis padres les encantan las películas de amor.').counts.fancy).toBe(1); // tricky syntax
    expect(assessAnswer(course, 2, 'Lo siento, no puedo. ¡Qué lástima!').counts.fancy).toBe(1); // idiom
  });
});

describe('the whole test: the range rung needs three basic tenses across all five answers', () => {
  const all = (texts: Record<number, string>) => Object.entries(texts).map(([q, text]) => ({ questionPosition: Number(q), text }));
  const detailQ3 = 'Primero, normalmente llevo unos vaqueros negros y una camiseta blanca. Después, cuando salgo con mis amigos, llevo unas zapatillas de moda porque quiero estar guay.';

  it('holds a detailed answer at detail while the test has only two basic tenses', () => {
    const t = assessTest(course, all({ 1: 'Me gustan las películas de acción.', 2: 'Me gustaría ir al cine el sábado.', 3: detailQ3 }));
    expect(t.tenses.sort()).toEqual(['conditional', 'present']);
    expect(t.gatePassed).toBe(false);
    expect(t.answers[2].rung).toBe('detail'); // however detailed it is
  });

  it('lifts it to range once a third basic tense is used anywhere in the test', () => {
    const t = assessTest(course, all({ 1: 'Me gustan las películas de acción.', 2: 'Me gustaría ir al cine el sábado.', 3: detailQ3, 4: 'Voy a llevar una camiseta blanca para la fiesta.' }));
    expect(t.tenses.sort()).toEqual(['conditional', 'near_future', 'present']);
    expect(t.gatePassed).toBe(true);
    expect(t.answers[2].rung).toBe('range');
  });

  it('does not lift answers that are not detailed, however many tenses the test has', () => {
    const t = assessTest(course, all({ 1: 'Me gustan las películas de acción.', 2: 'Me gustaría ir al cine el sábado.', 4: 'Voy a llevar una camiseta blanca para la fiesta.' }));
    expect(t.gatePassed).toBe(true);
    expect(t.answers.map((a) => a.rung)).toEqual(['survival', 'survival', 'survival']);
  });

  it('reaches showing off only with range and a fancy feature', () => {
    const fancyQ5 = 'Los fines de semana juego a los videojuegos y escucho música. A veces salgo con mis amigos. Después, me gusta montar en bici porque es divertido. Cuando era pequeño, veía dibujos animados.';
    const withGate = assessTest(course, all({ 2: 'Me gustaría ir al cine el sábado.', 4: 'Voy a llevar una camiseta blanca para la fiesta.', 5: fancyQ5 }));
    expect(withGate.answers[2].rung).toBe('showing_off');
    const noGate = assessTest(course, all({ 5: fancyQ5 }));
    expect(noGate.answers[0].rung).toBe('detail'); // the fancy phrase alone is not enough
  });

  it('counts justified opinions across the test toward the target, without gating any rung', () => {
    const t = assessTest(course, all({ 1: 'Me encantan las películas de miedo porque son muy divertidas.', 5: 'Me gusta montar en bici porque es divertido.', 3: 'Normalmente llevo unos vaqueros.' }));
    expect(t.justifiedOpinions).toBe(2);
    expect(t.justifiedOpinionsTarget).toBe(5);
    expect(t.answers.find((a) => a.questionPosition === 3)!.rung).toBe('survival'); // no opinion needed for this answer
  });
});

describe('the course\'s model answers earn the rung they claim', () => {
  // The top answer for each question is the test a student would build from them.
  const top = [1, 2, 3, 4, 5].map((q) => {
    const mine = course.modelAnswers.filter((a) => a.questionPosition === q);
    return mine[mine.length - 1];
  });
  const test = assessTest(course, top.map((a) => ({ questionPosition: a.questionPosition, text: a.text })));

  it('use enough basic tenses together for the range rung to be reachable', () => {
    expect(test.gatePassed, test.tenses.join()).toBe(true);
  });

  it.each(course.modelAnswers.map((a) => [`Q${a.questionPosition} ${a.rung}: ${a.text.slice(0, 40)}…`, a] as const))('%s', (_name, a) => {
    const alone = assessAnswer(course, a.questionPosition, a.text);
    if (a.rung === 'survival' || a.rung === 'opinion' || a.rung === 'detail') {
      expect(alone.answerRung).toBe(a.rung);
      if (a.rung === 'detail') expect(alone.counts.fancy).toBe(0);
    } else {
      // Showing off: detail by itself, plus a fancy feature; the test gate then gives it the rung.
      expect(alone.answerRung).toBe('detail');
      expect(alone.counts.fancy).toBeGreaterThanOrEqual(1);
      expect(test.answers[a.questionPosition - 1].rung).toBe('showing_off');
    }
  });
});

describe('what the student sees', () => {
  it('lights up the features an answer used, by name, matching the counts', () => {
    const a = assessAnswer(course, 1, 'Primero, me gustan las películas de acción porque son muy divertidas y emocionantes.');
    const byKind = Object.fromEntries(a.litFeatures.map((f) => [f.kind, f.count]));
    expect(byKind.opinion).toBe(1);
    expect(byKind.justification).toBe(1);
    expect(byKind.sequencer).toBe(1);
    expect(byKind.verb_phrase).toBe(a.counts.verbPhrases);
    expect(a.litFeatures.every((f) => f.label === FEATURE_LABELS[f.kind] && f.examples.length === f.count)).toBe(true);
  });

  it('never mentions grades, marks or numbers about levels', () => {
    for (const label of Object.values(FEATURE_LABELS)) expect(label).not.toMatch(/grade|mark|wtg|level|\d/i);
  });

  it('is independent of who wrote the answer: the same text gets the same result', () => {
    const text = 'Me encantan las películas de miedo porque son muy divertidas.';
    expect(assessAnswer(course, 1, text)).toEqual(assessAnswer(course, 1, text));
  });

  it('rejects a question that does not exist', () => {
    expect(() => assessAnswer(course, 9, 'hola')).toThrow(/no question 9/);
  });
});
