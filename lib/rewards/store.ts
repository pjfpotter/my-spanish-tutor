import { balance } from '../coins/ledger';
import type { Db } from '../db/types';
import { CATALOGUE, FREEZE_ID, itemById, MAX_FREEZES, type ShopItem } from './catalogue';
import { dayOf, daysToFreeze, streakFrom } from './streak';

export interface ShopState {
  coins: number;
  /** Ids of everything owned, except freezes. */
  owned: string[];
  wallpaper: string | null;
  freezesAvailable: number;
  streak: number;
}

async function practisedDays(db: Db, profileId: string): Promise<Set<string>> {
  const { rows } = await db.query<{ d: string }>(
    `select distinct to_char(created_at at time zone 'utc', 'YYYY-MM-DD') as d from attempts where profile_id = $1`, [profileId]);
  return new Set(rows.map((r) => r.d));
}
async function frozenDays(db: Db, profileId: string): Promise<Set<string>> {
  const { rows } = await db.query<{ d: string }>(`select to_char(day, 'YYYY-MM-DD') as d from freeze_days where profile_id = $1`, [profileId]);
  return new Set(rows.map((r) => r.d));
}
async function freezesOwned(db: Db, profileId: string): Promise<number> {
  const { rows } = await db.query<{ n: string }>(`select count(*) as n from inventory where profile_id = $1 and item = $2`, [profileId, FREEZE_ID]);
  return Number(rows[0].n);
}

/** Freezes bought and not yet used. */
export async function freezesAvailable(db: Db, profileId: string): Promise<number> {
  const used = (await frozenDays(db, profileId)).size;
  return Math.max(0, (await freezesOwned(db, profileId)) - used);
}

/**
 * Settles the streak for today: if the student missed one or more days right after a practised day and has
 * enough freezes, the freezes are used on those days. Safe to call on every visit.
 */
export async function settleStreak(db: Db, profileId: string, today: string = dayOf(new Date())): Promise<void> {
  const [practised, frozen, available] = await Promise.all([practisedDays(db, profileId), frozenDays(db, profileId), freezesAvailable(db, profileId)]);
  for (const day of daysToFreeze(practised, frozen, today, available)) {
    await db.query('insert into freeze_days (profile_id, day) values ($1, $2) on conflict do nothing', [profileId, day]);
  }
}

export async function loadShop(db: Db, profileId: string, today: string = dayOf(new Date())): Promise<ShopState> {
  const [coins, inv, prof, practised, frozen, available] = await Promise.all([
    balance(db, profileId),
    db.query<{ item: string }>(`select item from inventory where profile_id = $1 and item <> $2`, [profileId, FREEZE_ID]),
    db.query<{ wallpaper: string | null }>('select wallpaper from profiles where id = $1', [profileId]),
    practisedDays(db, profileId),
    frozenDays(db, profileId),
    freezesAvailable(db, profileId),
  ]);
  return {
    coins, owned: inv.rows.map((r) => r.item), wallpaper: prof.rows[0]?.wallpaper ?? null,
    freezesAvailable: available, streak: streakFrom(practised, frozen, today),
  };
}

export type BuyResult = { ok: true; item: ShopItem; coins: number } | { ok: false; error: string };

/**
 * Buys one item at its fixed price. The balance check, the item and the spend are one statement, so a student
 * can never end up with the item and their coins, or neither half. No payment of any kind is involved.
 */
export async function buyItem(db: Db, profileId: string, itemId: string): Promise<BuyResult> {
  const item = itemById(itemId);
  if (!item) return { ok: false, error: 'That is not in the shop.' };
  const coins = await balance(db, profileId);
  if (item.kind === 'freeze') {
    if ((await freezesAvailable(db, profileId)) >= MAX_FREEZES) return { ok: false, error: `You can hold ${MAX_FREEZES} freezes at once.` };
  } else if ((await db.query('select 1 from inventory where profile_id = $1 and item = $2', [profileId, item.id])).rows.length) {
    return { ok: false, error: 'You already have that.' };
  }
  if (coins < item.price) return { ok: false, error: `You need ${item.price - coins} more coins for that.` };

  const { rows } = await db.query(
    `with have as (select coalesce(sum(amount), 0) as b from coin_ledger where profile_id = $1),
          got as (insert into inventory (profile_id, item) select $1, $2 where (select b from have) >= $3 returning id)
     insert into coin_ledger (profile_id, amount, reason) select $1, -$3::int, 'spend' from got returning id`,
    [profileId, item.id, item.price],
  ).catch(() => ({ rows: [] }));
  if (!rows.length) return { ok: false, error: 'That did not go through. Nothing was taken. Try again.' };
  return { ok: true, item, coins: coins - item.price };
}

/** Chooses a wallpaper the student owns, or null for the plain desktop. */
export async function equipWallpaper(db: Db, profileId: string, itemId: string | null): Promise<{ ok: boolean; error?: string }> {
  if (itemId !== null) {
    const item = itemById(itemId);
    if (!item || item.kind !== 'wallpaper') return { ok: false, error: 'That is not a wallpaper.' };
    if (!(await db.query('select 1 from inventory where profile_id = $1 and item = $2', [profileId, itemId])).rows.length) return { ok: false, error: 'Buy it first.' };
  }
  await db.query('update profiles set wallpaper = $2 where id = $1', [profileId, itemId]);
  return { ok: true };
}

export { CATALOGUE };
