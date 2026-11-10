import type { Db } from '../db/types';

/**
 * The append-only coin ledger (task 13.1, design D12). Coins come only from practice. There is no
 * deduction for a mistake, a hint or a repeat request, and exploring the desktop earns nothing.
 * The database refuses to edit a row (see migration 0001), so a balance is always the sum of entries.
 */
export const COIN_AMOUNTS = {
  /** For any practice attempt, however it went. */
  attempt: 2,
  /** Awarded at most this many times a day, so replaying one item cannot farm coins. */
  attemptsPerDay: 40,
  session: 10,
} as const;

export type CoinReason = 'attempt' | 'session' | 'improvement' | 'bonus' | 'spend';

export async function awardCoins(db: Db, profileId: string, amount: number, reason: CoinReason): Promise<void> {
  if (!Number.isInteger(amount) || amount === 0) throw new Error('coin amount must be a non-zero whole number');
  if (amount < 0 && reason !== 'spend') throw new Error('only spending can take coins away');
  await db.query('insert into coin_ledger (profile_id, amount, reason) values ($1, $2, $3)', [profileId, amount, reason]);
}

export async function balance(db: Db, profileId: string): Promise<number> {
  const { rows } = await db.query<{ total: string }>('select coalesce(sum(amount), 0) as total from coin_ledger where profile_id = $1', [profileId]);
  return Number(rows[0].total);
}

/** How many attempt awards the profile has had since midnight UTC. */
export async function attemptAwardsToday(db: Db, profileId: string): Promise<number> {
  const { rows } = await db.query<{ n: string }>(
    `select count(*) as n from coin_ledger where profile_id = $1 and reason = 'attempt' and created_at >= date_trunc('day', now())`,
    [profileId],
  );
  return Number(rows[0].n);
}
