# Database migrations

A migration is a numbered SQL file that changes the *shape* of a database (its tables and columns), plus a record of which of those files have already been run. In this project the files are in `db/migrations/`, and `scripts/migrate.mjs` is the program that runs them.

## The problem migrations solve

The code and the database are two separate things that have to agree.

- The code lives in git and is replaced wholesale on every deploy.
- The database lives in Neon, holds real data, and persists between deploys.

Deploying new code does not touch the database. If the new code does `select key_word from questions` and the `questions` table has no `key_word` column, Postgres rejects the query (error `42703`, "undefined column"). That is exactly what happened in the 6 Nov 2026 outage (see the end of this page).

The fix cannot be to drop and recreate the database, because that would delete the students' data. The database has to be *altered* in place, the same way, in every environment: a laptop, production and each preview.

## What one migration file is

`0008_question_key_word.sql` contains:

```sql
alter table questions add column key_word text;
alter table questions add column key_word_english text;
```

These are ordinary SQL statements. They tell Postgres to add two empty text columns to the existing `questions` table. The rows already in the table stay, and each gets `null` in the new columns.

The filename's number is the ordering. Migrations are a history, and later ones can assume earlier ones ran. For example, `0010` creates a table that references `questions (id)`, so `questions` has to exist first.

## How the runner knows what to run

The database has a small bookkeeping table, `schema_migrations`, which the script creates if it is missing:

```sql
create table if not exists schema_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
)
```

Each time it runs, `migrate.mjs` does this:

1. Connects to whichever database the environment variables point at (`DATABASE_URL_UNPOOLED`, falling back to `DATABASE_URL`).
2. Lists the `.sql` files in `db/migrations/`, sorted by name.
3. Reads `schema_migrations` to see which names are already recorded.
4. For each file not yet recorded, in order:
   - `begin` starts a transaction.
   - It runs the file's SQL.
   - It inserts the filename into `schema_migrations`.
   - `commit` makes it permanent. If anything fails, `rollback` undoes the whole file and the script stops.

Because of step 3, running it again is harmless. Files already recorded are skipped, and "database is up to date" means nothing was left to do.

## Why the transaction matters

A transaction makes the file's SQL and the bookkeeping insert succeed or fail together. If `0009` creates its first table and then errors on the second, the rollback removes the first table too. You never end up half-migrated with the history out of step with reality.

## Migrations and seeding are different

A migration changes the *structure*. Seeding (`npm run seed`) changes the *contents*. `0008` created the `key_word` columns but left them empty; the seed is what fills them for the TELE8 course. A missing structure breaks the app. Missing content usually does not: the code treats a null `key_word` as "no key word".

## How migrations run now

`npm run build` runs `node scripts/migrate.mjs --if-configured && next build`. On Vercel, each deployment builds with its own `DATABASE_URL_UNPOOLED`, so each deployment migrates its own database before the new code goes live. Production, and each preview via its Neon branch, stay in step automatically.

- **Outside Vercel:** with `--if-configured`, a build with no database URL set skips migrations and carries on. This is why CI (which has no database) still builds. The build script does not load `.env`, so a local `npm run build` only migrates if you have exported a database URL in your shell.
- **On Vercel:** a missing database URL fails the build, so a misconfigured deployment cannot go live unmigrated.
- **Running by hand:** `npm run db:migrate` loads `.env` and migrates whatever database it points at. Check the host first; the `.env` URL may be production.
- **Preview branches:** the Neon–Vercel integration copies the `main` database when a preview branch is first created. That copy is a snapshot, so it keeps whatever schema `main` had at that moment. The build step brings it up to date on its next deploy.

## Writing a safe migration

- **Name and number:** use the next number and a short description, for example `0011_something.sql`.
- **Never edit an applied file.** Other databases have already run it and recorded its name, so they will not run it again. Add a new migration instead.
- **No "down" migrations.** There is no automatic undo. To reverse a change, write a new migration that reverses it (for example, renames a column back).
- **Prefer additive changes:** adding columns, tables and indexes is low risk. Renames, drops and type changes are the risky kinds.
- **Old code can still be running during a build.** The migration runs at build time, before the new code serves, but the previous deployment keeps serving while the build runs. A rename like `0006` briefly breaks the old code in that gap. For a risky change, add the new thing first and remove or rename the old one in a later release.
- **Keep each file runnable inside one transaction.** The runner wraps every file in `begin`/`commit`, so avoid statements Postgres refuses inside a transaction (for example `create index concurrently`).

## What each existing migration does

| File | Change |
| --- | --- |
| `0001_initial.sql` | The initial tables. |
| `0002_cost_log_outcome.sql` | Cost-log outcome column. |
| `0003_chunk_unique.sql` | Uniqueness on chunks. |
| `0004_help_use_and_clip_failures.sql` | Help-use and clip-failure tracking. |
| `0005_model_answers.sql` | Model answers. |
| `0006_calibration.sql` | Renames `courses.mark_scheme` to `calibration`. The only non-additive one. |
| `0007_rewards.sql` | Adds `profiles.wallpaper`, a unique index on `inventory`, and the `freeze_days` table. |
| `0008_question_key_word.sql` | Adds `questions.key_word` and `questions.key_word_english`. |
| `0009_diagnostics.sql` | Creates `chunk_events` and `mood_checkins`, with indexes. |
| `0010_baseline.sql` | Creates `baseline_results`. |

The descriptions for 0001–0005 are inferred from the file names; read the files for the exact SQL.

## Incident: 6 Nov 2026, "column key_word does not exist"

**Symptom:** the production home page failed with Postgres `42703`, `column "key_word" does not exist` (Next.js digest 2336882795). The `pg` SSL warning in the same logs was harmless.

**Cause:** nothing ran `db:migrate` on deploy. Production, and all three preview databases, were stuck at migration 0005 (one preview at 0006) while the deployed code needed 0010.

| Database | Recorded in `schema_migrations` | Missing |
| --- | --- | --- |
| Production (`main` Neon branch) | 0001–0005 | 0006–0010 |
| Preview `dreamcore-design-direction` | 0001–0006 | 0007–0010 |
| Preview `add-free-time-sentence-builder` | 0001–0005 | 0006–0010 |
| Preview `claude/ecstatic-ramanujan-tkj170` | 0001–0005 | 0006–0010 |

**Fix:**
1. `npm run db:migrate` and `npm run seed` against production.
2. The same SQL applied to each preview branch in one transaction, with matching rows inserted into `schema_migrations`.
3. PR #4 made the build run migrations (and a follow-up commit made it skip them when no database is configured, after the first version broke CI).

**Diagnosing a similar error later:** compare the names in `select name from schema_migrations order by name` on the failing database with the files in `db/migrations/`. Any file missing from the table has not been applied there.
