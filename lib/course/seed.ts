import type { Chunk, Course, FeatureTag } from './schema';

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

export const SEED_COURSE: Course = {
  title: 'Year 8: Going out',
  classCode: 'TELE8', // placeholder
  testDate: '2026-11-20', // placeholder
  chunks,
  questions: [
    {
      position: 1, spanish: '¿Qué tipo de películas te gustan y por qué?', english: 'What type of films do you like, and why?',
      recycled: false, topics: ['film opinion', 'film type', 'reason'],
    },
    {
      position: 2, spanish: '¿Te gustaría ir al cine este sábado?', english: 'Would you like to go to the cinema this Saturday?',
      recycled: false, topics: ['invitation', 'place', 'when', 'reply', 'excuse'],
    },
    {
      position: 3, spanish: '¿Qué ropa llevas normalmente cuando sales con tus amigos?', english: 'What clothes do you normally wear when you go out with your friends?',
      recycled: false, topics: ['clothes', 'clothing', 'colour'],
    },
    {
      position: 4, spanish: '¿Qué vas a llevar para la fiesta?', english: 'What are you going to wear to the party?',
      recycled: false, topics: ['clothes future', 'clothing', 'event'],
    },
    {
      position: 5, spanish: '¿Qué haces en tu tiempo libre?', english: 'What do you do in your free time?',
      recycled: true, topics: ['free time', 'free time opinion', 'free time activity', 'frequency'],
    },
  ],
  markScheme: {
    // Survival: understands the question and says something relevant that counts as a sentence.
    survival: { verbPhrases: 1 },
    // Opinion: a justified opinion. Not every question suits one; the exam wants about five across the test.
    opinion: { justifiedOpinions: 1 },
    // Detail: range and extra detail with no opinion needed. Three verb phrases with a sequencer, and
    // detail words worth at least 3 points (a phrase is worth 2, a single word 1).
    detail: { verbPhrases: 3, sequencers: 1, rangePoints: 3 },
    // Range: detail, plus three different basic tenses across the whole test.
    range: { basicTensesAcrossTest: 3 },
    // Showing off: range, plus a fancy feature: another tense, tricky syntax or an idiom.
    showing_off: { fancyFeatures: 1 },
    rangeWeights: { adjective: 1, adjective_phrase: 2, adverb: 1, adverb_phrase: 2 },
    justifiedOpinionsTarget: 5,
  },
};
