import type { PhraseLine } from './phrase-bank';

/**
 * The cheeky pool (task 13.5, engagement-rewards: Cheeky content pool). DRAFT written by hand for the developer
 * to read and approve, like the main phrase bank. Mildly cheeky, never rude, and passable at school.
 *
 * Rules: Tele teases itself, the lesson or the situation, never the student's speaking, accent, mistakes or
 * appearance. Nothing about teachers or other people. Castilian Spanish at Year 8 level, short. Never English
 * in `es`. No student data. These lines only appear when the course owner has switched the pool on and the
 * student has bought it. They are voiced by the same audio build as the main bank; until then they show as
 * captions without sound.
 */
const C = (id: string, es: string, en: string, feelings: PhraseLine['feelings']): PhraseLine => ({ id, situation: 'poke', es, en, feelings });

export const CHEEKY_POOL: PhraseLine[] = [
  C('cheeky-guay', 'Soy una tele muy guay. Lo sé.', 'I am a very cool TV. I know it.', { joy: 0.7 }),
  C('cheeky-antena', 'Cuidado con mi antena. Es sensible.', 'Careful with my antenna. It is sensitive.', { surprise: 0.5, joy: 0.3 }),
  C('cheeky-ojo', 'Tengo un solo ojo y lo veo todo.', 'I have one eye and I see everything.', { joy: 0.4, surprise: 0.4 }),
  C('cheeky-bostezo', 'Un bostezo de tele es muy largo.', 'A TV yawn is very long.', { sadness: 0.3, joy: 0.3 }),
  C('cheeky-canal', '¿Cambio de canal? No, aquí mando yo.', 'Change the channel? No, I am in charge here.', { joy: 0.6, anger: 0.2 }),
  C('cheeky-cardigan', 'Mi cárdigan rosa es perfecto.', 'My pink cardigan is perfect.', { joy: 0.7 }),
  C('cheeky-pizza', 'Una tele no come pizza. Qué pena.', 'A TV does not eat pizza. What a shame.', { sadness: 0.4, joy: 0.2 }),
  C('cheeky-lunes', 'Los lunes son un programa muy malo.', 'Mondays are a very bad programme.', { disgust: 0.5, joy: 0.2 }),
];
