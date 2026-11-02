/** The part of a Postgres client the repositories use. Both `pg` pools and PGlite fit it. */
export interface Db {
  query<R = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: R[] }>;
}
