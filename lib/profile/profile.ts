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

const ADJECTIVES = ['Sleepy', 'Fuzzy', 'Zesty', 'Cosmic', 'Wobbly', 'Sneaky', 'Cheeky', 'Funky', 'Spicy', 'Dozy', 'Snazzy', 'Turbo'];
const NOUNS = ['Llama', 'Taco', 'Otter', 'Burrito', 'Comet', 'Pigeon', 'Cactus', 'Gecko', 'Waffle', 'Panda', 'Toaster', 'Mango'];

/** A few nicknames to choose from. The student only picks; they never type one. */
export function nicknameOptions(count = 6, random: (max: number) => number = randomInt): string[] {
  const out = new Set<string>();
  while (out.size < count) out.add(`${ADJECTIVES[random(ADJECTIVES.length)]} ${NOUNS[random(NOUNS.length)]}`);
  return [...out];
}
export const isNicknameShape = (s: string) =>
  ADJECTIVES.some((a) => NOUNS.some((n) => s === `${a} ${n}`));

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

export type CreateResult = { ok: true; profile: Profile; recoveryCode: string } | { ok: false; error: string };

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
