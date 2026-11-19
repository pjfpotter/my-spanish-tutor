import { createHash, randomBytes, randomInt } from 'node:crypto';
import type { Db } from '../db/types';

/**
 * Anonymous profiles (task 3.4, design D2). A profile is a random id, a nickname picked from a
 * generated list, interests picked from a fixed list, and a recovery code. There is no field
 * for a name, email or any free text, and the database has none either.
 */

/** The fixed interest tags. Never free text, never sent to a model. */
export const INTEREST_TAGS = [
  'football', 'music', 'gaming', 'animals', 'cooking', 'drawing', 'dance', 'films', 'fashion', 'sport',
  'tech', 'reading', 'travel', 'youtube',
] as const;
export type InterestTag = (typeof INTEREST_TAGS)[number];

/**
 * The closed vocabulary nicknames are made from: friendly adjectives and harmless nouns, written by hand and checked by a test
 * against a list of rude words. The first twelve of each are the original list, so every old nickname is still valid. A student
 * never types a nickname, and anything not made of these words is refused.
 */
export const ADJECTIVES = [
  'Sleepy', 'Fuzzy', 'Zesty', 'Cosmic', 'Wobbly', 'Sneaky', 'Cheeky', 'Funky', 'Spicy', 'Dozy', 'Snazzy', 'Turbo',
  'Bouncy', 'Breezy', 'Chilly', 'Clever', 'Cozy', 'Dapper', 'Dreamy', 'Fizzy', 'Giddy', 'Glowing', 'Groovy', 'Jazzy', 'Jolly', 'Lucky',
  'Mellow', 'Mighty', 'Nifty', 'Peppy', 'Quirky', 'Rowdy', 'Silky', 'Sparky', 'Zoomy', 'Sunny', 'Fancy', 'Toasty', 'Wiggly', 'Zippy',
] as const;
export const NOUNS = [
  'Llama', 'Taco', 'Otter', 'Burrito', 'Comet', 'Pigeon', 'Cactus', 'Gecko', 'Waffle', 'Panda', 'Toaster', 'Mango',
  'Badger', 'Biscuit', 'Bagel', 'Beetle', 'Cricket', 'Crumpet', 'Donkey', 'Falcon', 'Ferret', 'Gherkin', 'Hamster', 'Hedgehog', 'Kettle', 'Koala',
  'Lemon', 'Marmot', 'Muffin', 'Noodle', 'Nugget', 'Octopus', 'Parrot', 'Pretzel', 'Pickle', 'Puffin', 'Quokka', 'Radish', 'Walrus', 'Wombat',
] as const;

/** About one nickname in this many has two adjectives ("Sleepy Cosmic Llama"). */
const THREE_PART_ONE_IN = 4;

/**
 * Makes one nickname from the vocabulary: an adjective and a noun, or (one time in four) two different adjectives and a noun.
 * 1,600 two-part names and 62,400 three-part ones. `random(max)` returns a whole number from 0 to max minus 1.
 */
export function generateNickname(random: (max: number) => number = randomInt): string {
  const first = random(ADJECTIVES.length);
  const noun = NOUNS[random(NOUNS.length)];
  if (random(THREE_PART_ONE_IN) !== 0) return `${ADJECTIVES[first]} ${noun}`;
  let second = random(ADJECTIVES.length - 1);
  if (second >= first) second++; // a different adjective from the first, without a retry loop
  return `${ADJECTIVES[first]} ${ADJECTIVES[second]} ${noun}`;
}

/**
 * Nicknames to choose from. None is one in `taken` (the nicknames already in the student's class), and no two are alike.
 * The student only picks; they never type one.
 */
export function nicknameOptions(count = 6, random: (max: number) => number = randomInt, taken: Iterable<string> = []): string[] {
  const used = new Set(taken);
  const out = new Set<string>();
  for (let tries = 0; out.size < count; tries++) {
    if (tries > 20_000) throw new Error('could not find enough free nicknames');
    const n = generateNickname(random);
    if (!used.has(n)) out.add(n);
  }
  return [...out];
}

const ADJECTIVE_SET: ReadonlySet<string> = new Set(ADJECTIVES);
const NOUN_SET: ReadonlySet<string> = new Set(NOUNS);
/** Is this a nickname the generator could make: one or two different listed adjectives, then a listed noun? */
export function isNicknameShape(s: string): boolean {
  const words = s.split(' ');
  if (words.length < 2 || words.length > 3) return false;
  const adjectives = words.slice(0, -1);
  return NOUN_SET.has(words[words.length - 1]) && adjectives.every((a) => ADJECTIVE_SET.has(a)) && new Set(adjectives).size === adjectives.length;
}

/** How many nicknames a joining student is offered. */
export const OPTION_COUNT = 6;

/** The nicknames to offer a student joining this class: none that a classmate already has. */
export async function joinOptions(db: Db, courseId: string, random?: (max: number) => number): Promise<string[]> {
  return nicknameOptions(OPTION_COUNT, random, await takenNicknames(db, courseId));
}

/** Nicknames already used by students in a class. */
export async function takenNicknames(db: Db, courseId: string): Promise<Set<string>> {
  const { rows } = await db.query<{ nickname: string }>('select nickname from profiles where course_id = $1', [courseId]);
  return new Set(rows.map((r) => r.nickname));
}

// No 0, O, 1, I, L: easy to read out and type on a phone.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** A recovery code like K7M2Q-9XRTB, shown once at profile creation. */
export function newRecoveryCode(): string {
  const pick = () => Array.from(randomBytes(5), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `${pick()}-${pick()}`;
}

/** Only the hash is stored, so a database leak does not leak restore codes. */
export const hashRecoveryCode = (code: string) =>
  createHash('sha256').update(code.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');

export interface Profile {
  id: string;
  courseId: string;
  nickname: string;
  interests: InterestTag[];
}

export type CreateResult =
  | { ok: true; profile: Profile; recoveryCode: string }
  | { ok: false; error: string; /** Set when the nickname was refused because a classmate has it: fresh options to pick from. */ taken?: true; nicknames?: string[] };

export const NICKNAME_TAKEN = 'That nickname was just taken. Pick another.';

export async function createProfile(
  db: Db,
  input: { courseId: string; nickname: string; interests: string[] },
): Promise<CreateResult> {
  if (!isNicknameShape(input.nickname)) return { ok: false, error: 'Pick a nickname from the list.' };
  const interests = [...new Set(input.interests)];
  if (interests.some((i) => !(INTEREST_TAGS as readonly string[]).includes(i))) {
    return { ok: false, error: 'Pick interests from the list.' };
  }
  if (interests.length > 5) return { ok: false, error: 'Pick up to five interests.' };

  const code = newRecoveryCode();
  const { rows } = await db.query<{ id: string }>(
    `insert into profiles (course_id, nickname, interest_tags, recovery_code_hash) values ($1, $2, $3, $4) returning id`,
    [input.courseId, input.nickname, interests, hashRecoveryCode(code)],
  );
  return {
    ok: true,
    recoveryCode: code,
    profile: { id: rows[0].id, courseId: input.courseId, nickname: input.nickname, interests: interests as InterestTag[] },
  };
}

/**
 * Creates a profile as a student joining through the app: like `createProfile`, but refuses a nickname already used in the class
 * and hands back fresh options. The check is here and not in `createProfile` so the data layer stays permissive. Two students
 * submitting the same name in the same instant could both get through; that is rare and the overview copes with it.
 */
export async function joinClass(db: Db, input: { courseId: string; nickname: string; interests?: string[] }, random?: (max: number) => number): Promise<CreateResult> {
  if (isNicknameShape(input.nickname) && (await takenNicknames(db, input.courseId)).has(input.nickname)) {
    return { ok: false, error: NICKNAME_TAKEN, taken: true, nicknames: await joinOptions(db, input.courseId, random) };
  }
  return createProfile(db, { courseId: input.courseId, nickname: input.nickname, interests: input.interests ?? [] });
}

const toProfile = (r: { id: string; course_id: string; nickname: string; interest_tags: string[] }): Profile => ({
  id: r.id,
  courseId: r.course_id,
  nickname: r.nickname,
  interests: r.interest_tags as InterestTag[],
});

export async function getProfile(db: Db, id: string): Promise<Profile | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { rows } = await db.query<{ id: string; course_id: string; nickname: string; interest_tags: string[] }>(
    'select id, course_id, nickname, interest_tags from profiles where id = $1',
    [id],
  );
  return rows[0] ? toProfile(rows[0]) : null;
}

/** Restores a profile from its recovery code, or null if the code matches nothing. */
export async function restoreProfile(db: Db, code: string): Promise<Profile | null> {
  const { rows } = await db.query<{ id: string; course_id: string; nickname: string; interest_tags: string[] }>(
    'select id, course_id, nickname, interest_tags from profiles where recovery_code_hash = $1',
    [hashRecoveryCode(code)],
  );
  return rows[0] ? toProfile(rows[0]) : null;
}
