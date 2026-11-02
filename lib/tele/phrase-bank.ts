import type { Feelings } from './feelings';

/**
 * Tele's stock phrase bank (task 12.1). DRAFT written by hand for the developer to read and
 * approve before any line is voiced (12.2).
 *
 * Voice: dreamcore. A hazy, familiar, kind place that is also slightly uncanny: a room that
 * remembers you, a light left on, a signal, clouds, being seen. Comforting first, strange second.
 * Rules: no jokes, no irony, nothing frightening, no jump scares. Simple present-tense Castilian
 * Spanish at Year 8 level, short sentences. Never English in `es`; the English is the subtitle only.
 * At most one thing to fix, and never blame. Lines carry no student data and no names.
 */

export const SITUATIONS = [
  'welcome_first',
  'welcome_back',
  'correct',
  'wrong',
  'streak',
  'days_far',
  'days_near',
  'test_day',
  'after_test',
  'nervous',
  'dislike',
  'quick_win',
  'heard_badly',
  'hint',
  'repeat_request',
  'session_end',
  'mastered',
  'improvement',
  'poke',
] as const;
export type Situation = (typeof SITUATIONS)[number];

export interface PhraseLine {
  id: string;
  situation: Situation;
  /** Spanish, what Tele says. */
  es: string;
  /** English subtitle, text only. Tele never speaks English. */
  en: string;
  /** Baked feeling for the whole line (design D7). */
  feelings: Feelings;
}

const L = (id: string, situation: Situation, es: string, en: string, feelings: Feelings): PhraseLine => ({
  id, situation, es, en, feelings,
});

export const PHRASE_BANK: PhraseLine[] = [
  // First time in. "hola" keeps the exact text of the clip already built, so it is not paid for again.
  L('hola', 'welcome_first', '¡Hola! Soy Tele. Vivo en la tele.', "Hi! I'm Tele. I live in the TV.", { joy: 0.7 }),
  L('llegado', 'welcome_first', 'Has llegado. Aquí estás a salvo.', "You've arrived. You're safe here.", { joy: 0.4 }),
  L('tranquila', 'welcome_first', 'Esta habitación es tranquila. Puedes quedarte.', 'This room is quiet. You can stay.', { joy: 0.3 }),

  L('otra-vez-tu', 'welcome_back', 'Otra vez tú. Me alegro.', "You again. I'm glad.", { joy: 0.6 }),
  L('sigo-aqui', 'welcome_back', 'Sigo aquí. Te esperaba.', "I'm still here. I was waiting for you.", { joy: 0.5 }),
  L('luz-encendida', 'welcome_back', 'La luz está encendida. Entra.', 'The light is on. Come in.', { joy: 0.3 }),
  L('conoces-lugar', 'welcome_back', 'Ya conoces este lugar.', 'You already know this place.', { joy: 0.3 }),

  L('si-eso-es', 'correct', 'Sí. Eso es.', "Yes. That's it.", { joy: 0.6 }),
  L('suena-bien', 'correct', 'Eso suena bien.', 'That sounds right.', { joy: 0.6 }),
  L('sigue-asi', 'correct', 'Muy bien. Sigue así.', 'Very good. Keep going.', { joy: 0.7 }),
  L('antena-brilla', 'correct', 'Mi antena brilla. Es por ti.', "My antenna is glowing. It's because of you.", { joy: 0.8 }),

  L('no-pasa-nada', 'wrong', 'No pasa nada. Otra vez.', "It's alright. Again.", { joy: 0.2, sadness: 0.2 }),
  L('casi', 'wrong', 'Casi. Escucha otra vez.', 'Almost. Listen again.', { joy: 0.3 }),
  L('con-calma', 'wrong', 'Con calma. La pregunta no se va.', "Take it slowly. The question isn't going anywhere.", { joy: 0.2, sadness: 0.1 }),
  L('aprendiendo', 'wrong', 'Estás aprendiendo. Eso está bien.', "You're learning. That's alright.", { joy: 0.3, sadness: 0.2 }),

  L('cuento-dias', 'streak', 'Has vuelto otra vez. Cuento los días.', "You've come back again. I'm counting the days.", { joy: 0.6, surprise: 0.2 }),
  L('tu-sigues', 'streak', 'Un día más. Tú sigues. Yo también.', 'One more day. You keep going. So do I.', { joy: 0.6 }),
  L('imagen-clara', 'streak', 'Cada día, la imagen está más clara.', 'Every day, the picture is clearer.', { joy: 0.6 }),

  L('hay-tiempo', 'days_far', 'Todavía hay tiempo. Vamos poco a poco.', 'There is still time. We go little by little.', { joy: 0.4 }),
  L('sin-prisa', 'days_far', 'El examen está lejos. Aquí no hay prisa.', 'The test is far away. There is no hurry here.', { joy: 0.3 }),

  L('queda-poco', 'days_near', 'Ya queda poco. Estoy contigo.', "Not much is left now. I'm with you.", { joy: 0.3, fear: 0.1 }),
  L('se-acerca', 'days_near', 'Se acerca el día. Respira. Practicamos juntos.', 'The day is getting closer. Breathe. We practise together.', { joy: 0.3, fear: 0.15 }),

  L('hoy-es-el-dia', 'test_day', 'Hoy es el día. Ya conoces las preguntas.', 'Today is the day. You already know the questions.', { joy: 0.4, surprise: 0.2 }),

  L('ya-paso', 'after_test', 'Ya pasó. Lo hiciste. Descansa.', "It's over. You did it. Rest.", { joy: 0.5, sadness: 0.2 }),

  L('luces-parpadean', 'nervous', 'Lo sé. A veces las luces parpadean. Pasa.', 'I know. Sometimes the lights flicker. It passes.', { joy: 0.2, fear: 0.2 }),
  L('respira', 'nervous', 'Respira conmigo. Despacio.', 'Breathe with me. Slowly.', { joy: 0.3 }),
  L('nadie-prisa', 'nervous', 'No tienes que hablar rápido. Aquí nadie tiene prisa.', "You don't have to speak fast. Nobody is in a hurry here.", { joy: 0.3, fear: 0.1 }),

  L('lo-entiendo', 'dislike', 'Lo entiendo. No tiene que gustarte. Solo un poco.', "I understand. You don't have to like it. Just a little.", { joy: 0.2, sadness: 0.3 }),
  L('algo-pequeno', 'dislike', 'Está bien. Empezamos con algo pequeño.', "That's alright. We start with something small.", { joy: 0.4 }),

  L('esta-ya-sabes', 'quick_win', 'Mira, esta ya la sabes.', 'Look, you already know this one.', { joy: 0.5 }),
  L('primero-facil', 'quick_win', 'Primero una fácil. Después, las demás.', 'An easy one first. Then the others.', { joy: 0.4 }),

  L('no-te-he-oido', 'heard_badly', 'No te he oído bien. No es culpa tuya.', "I didn't hear you well. It's not your fault.", { sadness: 0.2, joy: 0.2 }),
  L('mucho-ruido', 'heard_badly', 'Hay mucho ruido. Prueba otra vez.', "There's a lot of noise. Try again.", { surprise: 0.2, joy: 0.2 }),
  L('senal-debil', 'heard_badly', 'La señal es débil. Prueba otra vez.', 'The signal is weak. Try again.', { sadness: 0.2 }),

  L('pedir-ayuda', 'hint', 'Pedir ayuda está bien. Aquí estoy.', "Asking for help is fine. I'm here.", { joy: 0.5 }),
  L('aqui-tienes', 'hint', 'Aquí tienes. Despacio.', 'Here you are. Slowly.', { joy: 0.4 }),

  L('claro-otra-vez', 'repeat_request', 'Claro. Te lo digo otra vez.', "Of course. I'll say it again.", { joy: 0.5 }),
  L('con-gusto', 'repeat_request', 'Con gusto. Escucha.', 'Gladly. Listen.', { joy: 0.5 }),

  L('por-hoy-basta', 'session_end', 'Por hoy basta. Has hecho mucho.', "That's enough for today. You've done a lot.", { joy: 0.4, sadness: 0.1 }),
  L('apago-luz', 'session_end', 'Apago la luz. Vuelve cuando quieras.', "I'm turning off the light. Come back whenever you like.", { joy: 0.3, sadness: 0.2 }),
  L('habitacion-espera', 'session_end', 'La habitación espera. Hasta pronto.', 'The room will wait. See you soon.', { joy: 0.3, sadness: 0.2 }),

  L('ya-es-tuya', 'mastered', 'Esta pregunta ya es tuya.', 'This question is yours now.', { joy: 0.8 }),
  L('sin-interferencias', 'mastered', 'La imagen está clara. Ya no hay interferencias.', 'The picture is clear. There is no more static.', { joy: 0.8, surprise: 0.2 }),

  L('mas-rapido', 'improvement', 'Ahora respondes más rápido. Lo noto.', 'You answer faster now. I notice.', { joy: 0.7 }),
  L('mejor-que-ayer', 'improvement', 'Hoy has ido mejor que ayer.', 'Today went better than yesterday.', { joy: 0.7 }),

  L('estoy-aqui', 'poke', 'Estoy aquí.', "I'm here.", { joy: 0.3 }),
  L('te-veo', 'poke', 'Te veo. Estás bien.', "I see you. You're alright.", { joy: 0.4, surprise: 0.1 }),
  L('tuya-tambien', 'poke', 'Esta habitación también es tuya.', 'This room is yours too.', { joy: 0.4 }),
  L('mundo-amable', 'poke', 'Hay un mundo detrás de la pantalla. Es amable.', 'There is a world behind the screen. It is kind.', { joy: 0.3, surprise: 0.2 }),
  L('sin-prisa-poke', 'poke', 'No tengas prisa.', "Don't be in a hurry.", { joy: 0.3 }),
  L('detras-nubes', 'poke', 'Detrás de las nubes hay sol.', 'Behind the clouds there is sun.', { joy: 0.3, sadness: 0.1 }),
  L('hoy-nubes', 'poke', 'Hoy hay nubes. Me quedo contigo.', "Today there are clouds. I'm staying with you.", { sadness: 0.3, joy: 0.3 }),
];

export const linesFor = (situation: Situation): PhraseLine[] => PHRASE_BANK.filter((l) => l.situation === situation);
