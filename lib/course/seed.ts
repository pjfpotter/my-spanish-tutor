import { assessAnswer } from '../coach/rubric';
import goingOut from './calibration/going-out.json' with { type: 'json' };
import type { Calibration, Chunk, Course, FeatureTag, ModelAnswer } from './schema';

/**
 * The one hand-authored course for v1 (task 3.2): Year 8 "Going out", with one question recycled
 * from Year 7 free time. DRAFT for the developer to edit and sign off before audio is built:
 * the class code and test date are placeholders. All wording is original; it follows the shape
 * of a sentence builder (openers, items, reasons, connectives) but copies no worksheet.
 *
 * Changing any question text changes its audio hash, so finish editing before running the audio build.
 *
 * Tags say what a chunk counts for in the mark scheme (see lib/course/schema.ts):
 *  - the four basic tenses are present, preterite, near_future (voy a) and conditional;
 *  - any other tense is `other_tense`, which is fancy; so is `tricky_syntax` (hard for English speakers) and `idiom`;
 *  - a phrase (adjective_phrase, adverb_phrase) is worth more than a single adjective or adverb.
 */
const c = (spanish: string, english: string, category: string, featureTags: FeatureTag[] = [], recycled = false): Chunk => ({
  spanish, english, category, featureTags, recycled,
});

const chunks: Chunk[] = [
  // Opinions about films (Q1)
  c('Me encantan las películas de', 'I love films about', 'film opinion', ['opinion', 'verb_phrase', 'present']),
  c('Me gustan las películas de', 'I like films about', 'film opinion', ['opinion', 'verb_phrase', 'present']),
  c('No me gustan las películas de', "I don't like films about", 'film opinion', ['opinion', 'verb_phrase', 'present']),
  c('Prefiero las películas de', 'I prefer films about', 'film opinion', ['opinion', 'verb_phrase', 'present']),
  c('A mis padres les encantan las películas de', 'My parents love films about', 'film opinion', ['opinion', 'verb_phrase', 'present', 'tricky_syntax']),
  c('acción', 'action', 'film type'),
  c('miedo', 'horror', 'film type'),
  c('amor', 'romance', 'film type'),
  c('ciencia ficción', 'science fiction', 'film type'),
  c('dibujos animados', 'cartoons', 'film type'),
  c('porque son', 'because they are', 'reason', ['justification', 'verb_phrase', 'present'], true),
  c('porque es', 'because it is', 'reason', ['justification', 'verb_phrase', 'present'], true),
  c('divertido', 'fun', 'reason adjective', ['adjective'], true),
  c('divertidas', 'fun', 'reason adjective', ['adjective']),
  c('emocionantes', 'exciting', 'reason adjective', ['adjective']),
  c('graciosas', 'funny', 'reason adjective', ['adjective']),
  c('aburridas', 'boring', 'reason adjective', ['adjective']),
  c('muy divertidas', 'very fun', 'reason adjective', ['adjective_phrase']),
  c('bastante graciosas', 'quite funny', 'reason adjective', ['adjective_phrase']),
  c('Me hacen reír', 'They make me laugh', 'reason', ['justification', 'verb_phrase', 'present', 'tricky_syntax']),
  c('Me dan miedo', 'They scare me', 'reason', ['justification', 'verb_phrase', 'present', 'tricky_syntax']),
  c('aunque', 'although', 'connective', ['connective'], true),
  c('pero', 'but', 'connective', ['connective'], true),
  c('además', 'also', 'connective', ['connective'], true),
  c('y', 'and', 'connective', ['connective'], true),
  c('He visto muchas películas este año', "I've seen lots of films this year", 'fancy', ['verb_phrase', 'other_tense']),

  // Invitations and excuses (Q2)
  c('Me gustaría ir', 'I would like to go', 'invitation', ['verb_phrase', 'conditional']),
  c('¿Te gustaría ir', 'Would you like to go', 'invitation', ['verb_phrase', 'conditional']),
  c('al cine', 'to the cinema', 'place'),
  c('al parque', 'to the park', 'place'),
  c('a la playa', 'to the beach', 'place'),
  c('a la bolera', 'to the bowling alley', 'place'),
  c('al centro comercial', 'to the shopping centre', 'place'),
  c('el sábado', 'on Saturday', 'when', ['adverb_phrase']),
  c('esta tarde', 'this afternoon', 'when', ['adverb_phrase']),
  c('a las cuatro y media', 'at half past four', 'when', ['adverb_phrase']),
  c('con mis amigos', 'with my friends', 'who'),
  c('¡Vale, claro!', 'OK, sure!', 'reply'),
  c('Lo siento, no puedo', "Sorry, I can't", 'excuse', ['verb_phrase', 'present']),
  c('porque tengo que', 'because I have to', 'excuse', ['justification', 'verb_phrase', 'present']),
  c('hacer los deberes', 'do my homework', 'excuse'),
  c('ayudar en casa', 'help at home', 'excuse'),
  c('ir al dentista', 'go to the dentist', 'excuse'),
  c('¡Qué lástima!', 'What a shame!', 'reply', ['idiom']),

  // Clothes (Q3 present, Q4 future)
  c('Normalmente llevo', 'I normally wear', 'clothes', ['verb_phrase', 'present', 'adverb']),
  c('Cuando salgo con mis amigos, llevo', 'When I go out with my friends, I wear', 'clothes', ['verb_phrase', 'present', 'connective']),
  c('unos vaqueros', 'jeans', 'clothing'),
  c('una camiseta', 'a t-shirt', 'clothing'),
  c('una sudadera', 'a hoodie', 'clothing'),
  c('unas zapatillas', 'trainers', 'clothing'),
  c('una chaqueta', 'a jacket', 'clothing'),
  c('negros', 'black', 'colour', ['adjective']),
  c('blanca', 'white', 'colour', ['adjective']),
  c('azul', 'blue', 'colour', ['adjective']),
  c('cómodas', 'comfortable', 'clothes adjective', ['adjective']),
  c('de moda', 'fashionable', 'clothes adjective', ['adjective_phrase']),
  c('Voy a llevar', 'I am going to wear', 'clothes future', ['verb_phrase', 'near_future']),
  c('para la fiesta', 'to the party', 'event'),
  c('porque quiero', 'because I want', 'reason', ['justification', 'verb_phrase', 'present']),
  c('estar guay', 'to look cool', 'reason'),
  c('estar cómodo', 'to be comfortable', 'reason'),

  // Free time, recycled from Year 7 (Q5)
  c('En mi tiempo libre', 'In my free time', 'free time', [], true),
  c('Me gusta', 'I like', 'free time opinion', ['opinion', 'verb_phrase', 'present'], true),
  c('jugar a los videojuegos', 'playing video games', 'free time activity', [], true),
  c('escuchar música', 'listening to music', 'free time activity', [], true),
  c('salir con mis amigos', 'going out with my friends', 'free time activity', [], true),
  c('montar en bici', 'riding my bike', 'free time activity', [], true),
  c('juego a los videojuegos', 'I play video games', 'free time activity', ['verb_phrase', 'present'], true),
  c('escucho música', 'I listen to music', 'free time activity', ['verb_phrase', 'present'], true),
  c('salgo con mis amigos', 'I go out with my friends', 'free time activity', ['verb_phrase', 'present'], true),
  c('monto en bici', 'I ride my bike', 'free time activity', ['verb_phrase', 'present'], true),
  c('Siempre', 'Always', 'frequency', ['adverb'], true),
  c('A veces', 'Sometimes', 'frequency', ['adverb_phrase'], true),
  c('Los fines de semana', 'At the weekend', 'frequency', ['adverb_phrase'], true),
  c('Primero', 'First', 'sequencer', ['sequencer']),
  c('Después', 'Afterwards', 'sequencer', ['sequencer']),
  c('El año pasado fui', 'Last year I went', 'past', ['verb_phrase', 'preterite', 'adverb_phrase']),
  c('Cuando era pequeño, veía dibujos animados', 'When I was little, I used to watch cartoons', 'fancy', ['verb_phrase', 'other_tense', 'adverb_phrase']),
];

const m = (questionPosition: number, text: string): ModelAnswer => ({ questionPosition, text });

/**
 * Model answers for the writing stage, written from the chunks above with only glue and common words,
 * so the word validator and rubric can check them. DRAFT for the developer to read and approve. Every
 * question has a simple answer and some have richer ones; the simplest is where a student who asks for a
 * starter begins. Once the upload-time set-up call exists (task 7.8), it writes these. Tests check each
 * answer is valid, is worth something and that every question has a simple one.
 */
const modelAnswers: ModelAnswer[] = [
  // 1. What type of films do you like, and why?
  m(1, 'Me gustan las películas de acción porque son divertidas.'),
  m(1, 'Me encantan las películas de miedo porque son muy divertidas, aunque me dan miedo.'),
  m(1, 'Primero, me gustan las películas de acción porque son muy divertidas y emocionantes. Después, a mis padres les encantan las películas de amor, aunque no me gustan las películas de miedo. He visto muchas películas este año. Me gustaría ir al cine.'),

  // 2. Would you like to go to the cinema this Saturday?
  m(2, 'Lo siento, no puedo porque tengo que hacer los deberes.'),
  m(2, 'Me gustaría ir al cine el sábado porque es divertido.'),

  // 3. What clothes do you normally wear when you go out with your friends?
  m(3, 'Normalmente llevo unos vaqueros porque quiero estar cómodo.'),
  m(3, 'Normalmente llevo unos vaqueros negros y una camiseta blanca porque quiero estar cómodo. A veces llevo unas zapatillas de moda.'),

  // 4. What are you going to wear to the party?
  m(4, 'Voy a llevar una camiseta blanca para la fiesta porque quiero estar guay.'),
  m(4, 'Voy a llevar una camiseta blanca y unos vaqueros negros para la fiesta porque quiero estar guay. Después, me gustaría llevar una chaqueta de moda.'),

  // 5. What do you do in your free time?
  m(5, 'Me gusta montar en bici porque es divertido.'),
  m(5, 'Los fines de semana juego a los videojuegos y escucho música. Me gusta montar en bici porque es divertido, aunque a veces me gusta salir con mis amigos.'),
];

export const SEED_COURSE: Course = {
  title: 'Year 8: Going out',
  classCode: 'TELE8', // placeholder
  testDate: '2026-11-20', // placeholder
  chunks,
  questions: [
    {
      position: 1, spanish: '¿Qué tipo de películas te gustan y por qué?', english: 'What type of films do you like, and why?',
      recycled: false,
      topics: ['film opinion', 'film type', 'reason', 'reason adjective', 'connective', 'sequencer', 'fancy', 'invitation', 'place'],
      template: ['film opinion', 'film type', 'reason', 'reason adjective'],
      keyWord: { spanish: 'películas', english: 'films' },
    },
    {
      position: 2, spanish: '¿Te gustaría ir al cine este sábado?', english: 'Would you like to go to the cinema this Saturday?',
      recycled: false,
      topics: ['invitation', 'place', 'when', 'reply', 'excuse', 'reason', 'reason adjective'],
      template: ['invitation', 'place', 'when', 'reply', 'excuse'],
      keyWord: { spanish: 'cine', english: 'cinema' },
    },
    {
      position: 3, spanish: '¿Qué ropa llevas normalmente cuando sales con tus amigos?', english: 'What clothes do you normally wear when you go out with your friends?',
      recycled: false,
      topics: ['clothes', 'clothing', 'colour', 'reason', 'connective', 'frequency', 'clothes adjective'],
      template: ['clothes', 'clothing', 'colour', 'reason'],
      keyWord: { spanish: 'ropa', english: 'clothes' },
    },
    {
      position: 4, spanish: '¿Qué vas a llevar para la fiesta?', english: 'What are you going to wear to the party?',
      recycled: false,
      topics: ['clothes future', 'clothing', 'event', 'colour', 'reason', 'connective', 'sequencer', 'clothes adjective'],
      template: ['clothes future', 'clothing', 'event', 'reason'],
      keyWord: { spanish: 'fiesta', english: 'party' },
    },
    {
      position: 5, spanish: '¿Qué haces en tu tiempo libre?', english: 'What do you do in your free time?',
      recycled: true,
      topics: ['free time', 'free time opinion', 'free time activity', 'frequency', 'reason', 'reason adjective', 'connective'],
      template: ['free time opinion', 'free time activity', 'frequency', 'reason'],
      keyWord: { spanish: 'tiempo libre', english: 'free time' },
    },
  ],
  // Draft calibration for this course; edit lib/course/calibration/going-out.json, not this file.
  calibration: goingOut as Calibration,
  modelAnswers,
};

/**
 * The testing course (course-unlock-testing): the same content under its own class code, with every
 * phase open so a tester can reach the timed round in one short session. Share the code only with testers.
 * The code is deliberately not a word a student would try; it is named in docs/user-testing.md.
 */
export const TESTING_COURSE: Course = {
  ...SEED_COURSE,
  title: `${SEED_COURSE.title} (testing)`,
  classCode: 'PRBA7K3M',
  unlockAll: true,
};

/** The simplest seeded model answer for a question, for tests and testing courses. */
export const simplestSeedAnswer = (position: number): string => {
  const own = SEED_COURSE.modelAnswers.filter((a) => a.questionPosition === position);
  return own.sort((x, y) => assessAnswer(SEED_COURSE.calibration, x.text).value - assessAnswer(SEED_COURSE.calibration, y.text).value)[0].text;
};
