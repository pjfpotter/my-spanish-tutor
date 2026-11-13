/** Tele's lines on the memorise screens. Tele speaks only Spanish; the English is the subtitle. Comforting, no jokes. */
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

const isLine = (x: unknown): x is readonly [string, string] => Array.isArray(x) && x.length === 2 && typeof x[0] === 'string' && typeof x[1] === 'string';

/** Every line above as Spanish and English, for the audio build. */
export function teleLines(tree: unknown = TELE): { es: string; en: string }[] {
  if (isLine(tree)) return [{ es: tree[0], en: tree[1] }];
  if (Array.isArray(tree)) return tree.flatMap((t) => teleLines(t));
  if (tree && typeof tree === 'object') return Object.values(tree).flatMap((t) => teleLines(t));
  return [];
}
