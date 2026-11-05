import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { insertTestCourse, newTestDb } from '../db/test-db';
import {
  createProfile, getProfile, hashRecoveryCode, INTEREST_TAGS, newRecoveryCode, nicknameOptions, restoreProfile,
} from './profile';

let db: Awaited<ReturnType<typeof newTestDb>>;
let courseId: string;
beforeAll(async () => {
  db = await newTestDb();
  courseId = (await insertTestCourse(db)).courseId;
});
afterAll(() => db.close());

describe('anonymous profile', () => {
  it('creates a profile from a listed nickname and fixed interests, and returns a recovery code once', async () => {
    const nickname = nicknameOptions(1)[0];
    const r = await createProfile(db, { courseId, nickname, interests: ['football', 'music'] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.recoveryCode).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    expect((await getProfile(db, r.profile.id))?.nickname).toBe(nickname);
  });

  it('restores on a second browser with the code (any case, with or without the dash)', async () => {
    const r = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: ['dance'] });
    if (!r.ok) throw new Error('create failed');
    const sloppy = r.recoveryCode.toLowerCase().replace('-', ' ');
    const restored = await restoreProfile(db, sloppy);
    expect(restored?.id).toBe(r.profile.id);
    expect(restored?.interests).toEqual(['dance']);
  });

  it('does not restore from a wrong code', async () => {
    expect(await restoreProfile(db, 'AAAAA-AAAAA')).toBeNull();
  });

  it('stores only a hash of the code', async () => {
    const r = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
    if (!r.ok) throw new Error('create failed');
    const { rows } = await db.query<{ recovery_code_hash: string }>('select recovery_code_hash from profiles where id = $1', [r.profile.id]);
    expect(rows[0].recovery_code_hash).toBe(hashRecoveryCode(r.recoveryCode));
    expect(rows[0].recovery_code_hash).not.toContain(r.recoveryCode);
  });

  it('refuses free-text nicknames and interests outside the fixed list', async () => {
    expect((await createProfile(db, { courseId, nickname: 'Jane Smith', interests: [] })).ok).toBe(false);
    expect((await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: ['my dog is called Rex'] })).ok).toBe(false);
  });

  it('has no column that could hold a name, email or other free text', async () => {
    const { rows } = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_name = 'profiles' order by 1`,
    );
    // `wallpaper` holds only an id from the shop catalogue: equipWallpaper rejects anything else (lib/rewards tests).
    expect(rows.map((r) => r.column_name)).toEqual(['course_id', 'created_at', 'id', 'interest_tags', 'nickname', 'recovery_code_hash', 'wallpaper']);
  });

  it('gives different recovery codes and a list of distinct nicknames', () => {
    expect(newRecoveryCode()).not.toBe(newRecoveryCode());
    expect(new Set(nicknameOptions(6)).size).toBe(6);
    expect(INTEREST_TAGS.length).toBeGreaterThan(5);
  });

  it('rejects a malformed profile id without querying', async () => {
    expect(await getProfile(db, "x'; drop table profiles;--")).toBeNull();
  });
});
