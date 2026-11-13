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
