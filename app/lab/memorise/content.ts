import type { ChunkKind } from '../../../lib/practice/chunk-kind';
import type { LadderAnswer } from '../../../lib/memorise/ladder';

const C = (t: string, en: string, k: ChunkKind, s = 0) => ({ t, en, k, s });

/**
 * One made-up student's five signed-off answers to the seed course questions, split into the bits they are
 * learned in. Lab content only: the real phase will read the student's own confirmed answers.
 */
export const LAB_ANSWERS: LadderAnswer[] = [
  { n: 1, q: '¿Qué tipo de películas te gustan y por qué?', qen: 'What type of films do you like, and why?',
    en: 'I love horror films because they are really fun, although they scare me.',
    chunks: [C('Me encantan', 'I love', 'opinion'), C('las películas de miedo', 'horror films', 'detail'), C('porque son muy divertidas,', 'because they are really fun,', 'reason'), C('aunque me dan miedo.', 'although they scare me.', 'link')] },
  { n: 2, q: '¿Te gustaría ir al cine este sábado?', qen: 'Would you like to go to the cinema this Saturday?',
    en: "I'm sorry, I can't, because I have to do my homework.",
    chunks: [C('Lo siento, no puedo', "I'm sorry, I can't", 'other'), C('porque tengo que', 'because I have to', 'reason'), C('hacer los deberes.', 'do my homework.', 'detail')] },
  { n: 3, q: '¿Qué ropa llevas normalmente cuando sales con tus amigos?', qen: 'What clothes do you normally wear when you go out with your friends?',
    en: 'I normally wear black jeans and a white T-shirt because I want to be comfortable.',
    chunks: [C('Normalmente llevo', 'I normally wear', 'time'), C('unos vaqueros negros', 'black jeans', 'detail'), C('y una camiseta blanca', 'and a white T-shirt', 'link'), C('porque quiero estar cómodo.', 'because I want to be comfortable.', 'reason')] },
  { n: 4, q: '¿Qué vas a llevar para la fiesta?', qen: 'What are you going to wear to the party?',
    en: "I'm going to wear a white T-shirt to the party because I want to look cool.",
    chunks: [C('Voy a llevar', "I'm going to wear", 'time'), C('una camiseta blanca', 'a white T-shirt', 'detail'), C('para la fiesta', 'to the party', 'other'), C('porque quiero estar guay.', 'because I want to look cool.', 'reason')] },
  { n: 5, q: '¿Qué haces en tu tiempo libre?', qen: 'What do you do in your free time?',
    en: 'At the weekend I play video games and listen to music. I like riding my bike because it is fun, although sometimes I like going out with my friends.',
    chunks: [C('Los fines de semana', 'At the weekend', 'time', 0), C('juego a los videojuegos', 'I play video games', 'detail', 0), C('y escucho música.', 'and I listen to music.', 'link', 0),
      C('Me gusta montar en bici', 'I like riding my bike', 'opinion', 1), C('porque es divertido,', 'because it is fun,', 'reason', 1), C('aunque a veces', 'although sometimes', 'link', 1), C('me gusta salir con mis amigos.', 'I like going out with my friends.', 'detail', 1)] },
];

/** Tele speaks only Spanish. The English is the subtitle. Comforting, no jokes. */
export const TELE = {
  good: [['Muy bien.', 'Very good.'], ['Eso es.', "That's it."], ['Así.', 'Like that.'], ['Lo tienes.', 'You have it.']],
  top: [['Muy bien. Sigue así.', 'Very good. Keep going.']],
  miss: [['No pasa nada. Otra vez.', "It's fine. Again."]],
  up: [['Tres seguidas. Quito palabras.', "Three in a row. I'm taking words away."]],
  down: [['Te doy más ayuda.', "I'll give you more help."]],
  echo: ['Repite.', 'Say it after me.'],
  now: ['Ahora tú.', 'Now you.'],
  meaning: ['¿Qué significa?', 'What does it mean?'],
  next: ['¿Qué sigue?', 'What comes next?'],
  order: ['Ponlo en orden.', 'Put it in order.'],
  hello: ['Tus respuestas están listas. Vamos a guardarlas.', "Your answers are ready. Let's store them."],
  back: ['Otra vez tú. Me alegro.', "You again. I'm glad."],
  morning: ['Buenos días. ¿Te acuerdas?', 'Good morning. Do you remember?'],
  rest: ['Ya está por hoy. Vuelve mañana.', "That's it for today. Come back tomorrow."],
  all: ['Todo está en ti.', "It's all in you."],
  end: {
    meet: ['Ya sabes qué dice.', 'Now you know what it says.'],
    build: ['Ya casi es tuyo.', "It's nearly yours."],
    wipe: ['Ya no queda nada en la pantalla.', "There's nothing left on the screen."],
    lock: ['Sigue ahí. Es tuyo.', "It's still there. It's yours."],
    mix: ['Te pregunto y respondes.', 'I ask and you answer.'],
    probe: ['Ya sé dónde estás.', 'Now I know where you are.'],
    soft: ['No pasa nada. Mañana vuelve.', "It's fine. Tomorrow it comes back."],
  },
} as const;
