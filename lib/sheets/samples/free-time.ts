import type { Interpretation } from '../interpretation.ts';
import type { Sheet } from '../types.ts';

/**
 * The free-time sentence builder (`docs/content/free-time/sentence-builder.md`) as a sheet and an
 * interpretation. It is the project's own content, so it can live in the repo and serve as the
 * reference example for the engine and the tests.
 */
type Row = [string, string];
const LISTS: Record<string, Row[]> = {
  starter: [['Me gusta', 'I like to'], ['Me encanta', 'I love to'], ['Me chifla', 'I really love to'], ['Prefiero', 'I prefer to'], ['Suelo', 'I usually'], ['No me gusta', "I don't like to"], ['Odio', 'I hate to'], ['Me gustaría', 'I would like to'], ['Voy a', 'I am going to']],
  activity: [['jugar al fútbol', 'to play football'], ['jugar al baloncesto', 'to play basketball'], ['jugar a los videojuegos', 'to play video games'], ['tocar la guitarra', 'to play the guitar'], ['escuchar música', 'to listen to music'], ['chatear con mis amigos', 'to chat with my friends'], ['leer libros', 'to read books'], ['ver la tele', 'to watch TV'], ['salir con mis amigos', 'to go out with my friends'], ['ir al cine', 'to go to the cinema'], ['ir de compras', 'to go shopping'], ['montar en bici', 'to ride a bike'], ['hacer deporte', 'to do sport'], ['bailar', 'to dance'], ['cocinar', 'to cook']],
  connector: [['porque', 'because'], ['dado que', 'given that'], ['ya que', 'since'], ['aunque', 'although'], ['sin embargo', 'however']],
  reason: [['es divertido', 'it is fun'], ['es relajante', 'it is relaxing'], ['es emocionante', 'it is exciting'], ['es aburrido', 'it is boring'], ['es caro', 'it is expensive'], ['es barato', 'it is cheap'], ['es bueno para la salud', 'it is good for your health'], ['me hace reír', 'it makes me laugh'], ['me relaja', 'it relaxes me']],
  lohago: [['Lo hago', 'I do it'], ['Lo hacemos', 'we do it']],
  when: [['todos los días', 'every day'], ['los fines de semana', 'at the weekend'], ['los sábados', 'on Saturdays'], ['por la tarde', 'in the afternoon'], ['una vez a la semana', 'once a week'], ['a veces', 'sometimes'], ['de vez en cuando', 'from time to time']],
  with: [['con', 'with']],
  who: [['mis amigos', 'my friends'], ['mi mejor amigo/a', 'my best friend'], ['mi familia', 'my family'], ['mi hermano/a', 'my brother/sister'], ['mis primos', 'my cousins']],
  closing: [['Tengo mucho tiempo libre. ¡Qué guay!', 'I have lots of free time. How cool!'], ['No tengo mucho tiempo libre por los deberes. ¡Qué rollo!', "I don't have much free time because of homework. What a drag!"]],
  glue: [['y', 'and'], ['pero', 'but'], ['también', 'also']],
};
const ORDER = Object.keys(LISTS);

export const FREE_TIME_SHEET: Sheet = {
  titles: [{ es: '¿Qué haces en tu tiempo libre?', en: 'What do you do in your free time?', after: 0 }],
  tables: [{ index: 0, grid: ORDER.map(() => 1000), rows: 1, cells: ORDER.map((k, c) => ({ id: `t0r0c${c}`, r: 0, c, rs: 1, cs: 1, fill: null, items: LISTS[k].map(([es, en]) => ({ es, en, hard: false })) })) }],
  floats: [], warnings: [], stats: { items: 0, glossed: 0, hard: 0 }, flags: { hasBold: true, hasItalic: false }, images: 0,
};

const KINDS: Record<string, string> = { starter: 'opinion', activity: 'detail', connector: 'link', reason: 'reason', lohago: 'other', when: 'time', with: 'other', who: 'other', closing: 'other', glue: 'link' };
const TITLES: Record<string, string> = { starter: 'Starter', activity: 'Activity', connector: 'Connector', reason: 'Reason', lohago: 'Verb', when: 'When', with: 'With', who: 'Who', closing: 'Finish with one', glue: 'Joining words' };

const idx = (list: string, es: string) => `${list}:${LISTS[list].findIndex((r) => r[0] === es)}`;
const props: Interpretation['props'] = {};
const set = (list: string, es: string, p: Interpretation['props'][string]) => { props[idx(list, es)] = p; };
set('starter', 'Me gusta', { pol: '+', roles: ['opinion'] });
set('starter', 'Me encanta', { pol: '+', roles: ['opinion'], tags: ['strong'] });
set('starter', 'Me chifla', { pol: '+', roles: ['opinion'], tags: ['strong'] });
set('starter', 'Prefiero', { pol: '+', roles: ['opinion'] });
set('starter', 'Suelo', { pol: '0', roles: ['opinion'] });
set('starter', 'No me gusta', { pol: '-', roles: ['negative'] });
set('starter', 'Odio', { pol: '-', roles: ['negative'] });
set('starter', 'Me gustaría', { pol: '+', roles: ['plan'] });
set('starter', 'Voy a', { pol: '0', roles: ['plan'] });
const tags: Record<string, string[]> = { 'jugar al fútbol': ['phys', 'sporty'], 'jugar al baloncesto': ['phys', 'sporty'], 'jugar a los videojuegos': ['spend'], 'tocar la guitarra': ['spend'], 'leer libros': ['quiet'], 'ver la tele': ['quiet'], 'salir con mis amigos': ['spend'], 'ir al cine': ['spend'], 'ir de compras': ['spend'], 'montar en bici': ['phys'], 'hacer deporte': ['phys', 'sporty'], cocinar: ['quiet'], bailar: ['phys'] };
for (const [es, t] of Object.entries(tags)) set('activity', es, { tags: t });
for (const es of ['porque', 'dado que', 'ya que']) set('connector', es, { roles: ['link'] });
set('connector', 'aunque', { roles: ['link'], flip: true });
set('connector', 'sin embargo', { roles: ['lead'], flip: true, lead: true });
const reasons: Record<string, '+' | '-'> = { 'es divertido': '+', 'es relajante': '+', 'es emocionante': '+', 'es aburrido': '-', 'es caro': '-', 'es barato': '+', 'es bueno para la salud': '+', 'me hace reír': '+', 'me relaja': '+' };
for (const [es, pol] of Object.entries(reasons)) set('reason', es, { pol });
set('reason', 'es caro', { pol: '-', needs: { slot: 'activity', tag: 'spend' } });
set('reason', 'es bueno para la salud', { pol: '+', needs: { slot: 'activity', tag: 'phys' } });
set('who', 'mi mejor amigo/a', { choice: [{ es: 'mi mejor amigo', en: 'my best friend (boy)' }, { es: 'mi mejor amiga', en: 'my best friend (girl)' }] });
set('who', 'mi hermano/a', { choice: [{ es: 'mi hermano', en: 'my brother' }, { es: 'mi hermana', en: 'my sister' }] });
set('glue', 'pero', { allowIf: { anyOf: [{ filled: 'starter2' }, { slot: 'reason', pol: '-' }] }, denyMsg: '“pero” needs something to contrast with.' });

const slot = (key: string, cols: string[], label: string, noun: string, prompt: string, extra: Partial<Interpretation['slots'][number]> = {}): Interpretation['slots'][number] => ({ key, cols, label, noun, prompt, ...extra });
const NEG_FIRST = 'A negative opinion works as a contrast. Pick “sin embargo” first.';

export const FREE_TIME: Interpretation = {
  version: 1,
  name: 'Free time',
  title: '¿Qué haces en tu tiempo libre?',
  subtitle: 'What do you do in your free time?',
  columns: ORDER.map((k, c) => ({ key: k, cell: `t0r0c${c}`, title: TITLES[k], kind: KINDS[k], ...(k === 'with' ? { static: true } : {}), ...(k === 'glue' ? { sticky: true } : {}) })),
  props,
  slots: [
    slot('starter', ['starter'], 'opinion', 'an opinion', 'Pick how you feel about it', { accepts: ['opinion'] }),
    slot('activity', ['activity'], 'what you do', 'an activity', 'Now pick what you do'),
    slot('connector', ['connector'], 'because…', 'a because word', 'Add a because word', { accepts: ['link'] }),
    slot('reason', ['reason'], 'reason', 'a reason', 'Pick a reason'),
    slot('contrast', ['connector'], 'sin embargo…', '“sin embargo”', 'Contrast with another opinion', { accepts: ['lead'] }),
    slot('starter2', ['starter'], 'contrast opinion', 'a contrast opinion', 'What do you not like?', { accepts: ['negative'], after: 'contrast', afterMsg: NEG_FIRST }),
    slot('activity2', ['activity'], 'what', 'an activity', 'What do you not like?', { after: 'starter2' }),
    slot('reason2', ['reason'], 'reason', 'a reason', 'Why?', { link: { activity: 'activity2' }, after: 'activity2' }),
    slot('planStarter', ['starter'], 'plan or wish', 'a plan or wish', 'Add a plan or a wish', { accepts: ['plan'] }),
    slot('planActivity', ['activity'], 'what', 'an activity', 'What would you like to do?', { after: 'planStarter' }),
    slot('glue', ['glue'], '+ joining word', 'a joining word', 'Pick a joining word'),
    slot('lohago', ['lohago'], 'lo hago…', 'a “lo hago”', 'Add more detail'),
    slot('when', ['when'], 'when', 'a time', 'How often, or when?', { after: 'lohago', afterMsg: 'Pick “lo hago” first.' }),
    slot('who', ['who'], 'who with', 'a person', 'Who with?', { after: 'lohago', afterMsg: 'Pick “lo hago” first.' }),
    slot('closing', ['closing'], 'closing line', 'a closing line', 'Finish with a closing line'),
  ],
  frames: [
    { core: ['starter', 'activity'], slots: ['starter', 'activity', 'connector', 'reason'], parts: [{ slot: 'starter' }, { slot: 'activity', stripTo: true }, { slot: 'connector' }, { slot: 'reason' }] },
    { extra: true, core: ['lohago'], slots: ['glue', 'lohago', 'when', 'who'], joinSlot: 'glue', parts: [{ slot: 'lohago' }, { slot: 'when' }, { slot: 'who', pre: { es: 'con ', en: 'with ' } }] },
    { extra: true, core: ['contrast', 'starter2', 'activity2'], slots: ['contrast', 'starter2', 'activity2', 'reason2'], parts: [{ slot: 'contrast' }, { slot: 'starter2' }, { slot: 'activity2', stripTo: true }, { fixed: { es: 'porque', en: 'because' }, if: 'reason2' }, { slot: 'reason2' }] },
    { extra: true, core: ['planStarter', 'planActivity'], slots: ['planStarter', 'planActivity'], parts: [{ slot: 'planStarter' }, { slot: 'planActivity', stripTo: true }] },
    { extra: true, slots: ['closing'], parts: [{ slot: 'closing' }] },
  ],
  questions: [{ es: '¿Qué haces en tu tiempo libre?', en: 'What do you do in your free time?' }],
  required: ['starter', 'activity'],
  together: [['connector', 'reason'], ['contrast', 'starter2', 'activity2'], ['planStarter', 'planActivity']],
  auto: ['starter', 'activity', 'connector', 'reason', 'lohago', 'when', 'who', 'closing'],
  ignore: ['con'],
  rules: { polarity: [{ s: 'starter', c: 'connector', r: 'reason' }, { s: 'starter2', c: null, r: 'reason2' }] },
  corrections: [],
};
