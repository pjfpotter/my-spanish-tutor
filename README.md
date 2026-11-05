# My Spanish Tutor

A phone-first web app that helps UK Year 8 students revise for a KS3 Spanish speaking test. Built with Next.js, TypeScript, Neon Postgres and Vercel.

- What we are building: [`docs/PRD.md`](docs/PRD.md)
- How it is built: [`docs/ARD.md`](docs/ARD.md)
- Requirements and tasks: [`openspec/changes/ks3-spanish-speaking-tutor-v1/`](openspec/changes/ks3-spanish-speaking-tutor-v1/)

## Setup

You need Node.js 24 (what the project is developed and tested on) and a Neon Postgres database.

```bash
git clone https://github.com/pjfpotter/my-spanish-tutor.git
cd my-spanish-tutor
npm ci
cp .env.example .env
```

Then fill in `.env` (see below) and create the tables:

```bash
npm run db:migrate
npm run seed      # loads the hand-authored course; safe to run again
npm run dev
```

The app is now at http://localhost:3000.

## Environment variables

Copy `.env.example` to `.env`. It is gitignored; never commit it.

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string. Used by the app. |
| `DATABASE_URL_UNPOOLED` | Neon **direct** connection string (host without `-pooler`). Used by migrations. |

Get both from the Neon console: open the project, click **Connect**, and toggle connection pooling on and off. Use a Neon branch of the main database for local work so you never touch real data.

For the audio build and speech fallback, put these in `.env.local` (also gitignored):

| Variable | What it is |
|---|---|
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_TELE` | Tele's voice. Needed only to build audio. |
| `ELEVENLABS_MODEL` | Optional. Defaults to `eleven_multilingual_v2`. |
| `OPENAI_API_KEY` | Server-side transcription fallback (`/api/transcribe`). |

On Vercel the same variables go in the project's Environment Variables settings.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest), about 30 seconds |
| `npm run test:e2e` | Browser tests (Playwright): every test on the phone profile, the Chromebook profile only where the device matters, about 4 minutes |
| `npm run test:full` | Unit tests, then every browser test on both profiles. Run before a release or a big change |
| `npm run db:migrate` | Apply new SQL files from `db/migrations/` |
| `npm run seed` | Write the seed course (`lib/course/seed.ts`) to the database, updating in place |
| `npm run build-audio` | **Dry run:** list the audio clips still to build and their estimated cost. Spends nothing. |
| `npm run build-audio -- --yes` | Build only the missing or stale clips (paid, through the cost router). See [`docs/audio-pipeline.md`](docs/audio-pipeline.md) |

## Tests

**Unit tests** run with `npm test` and need no database or browser. They live next to the code as `*.test.ts` under `lib/`.

**Browser tests** use Playwright and live in `tests/`:

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright builds the app and starts its **own** server on port 3100 (so it can run beside `npm run dev`) with `DB_DRIVER=pglite`: a throwaway in-process Postgres seeded with the course. Browser tests therefore never touch Neon. Set `E2E_DEV=1` to use the dev server while editing a page, or `E2E_FULL=1` to run every test on both profiles. Audio and transcription are stubbed, so they cost nothing.

CI (`.github/workflows/ci.yml`) runs the typecheck, unit tests and build on every push. A failing test turns the check red.

## Database migrations

Schema changes are plain SQL files in `db/migrations/`, named `0001_name.sql`, `0002_name.sql` and so on. `npm run db:migrate` applies each file once, in order, and records it in `schema_migrations`. Migrations are additive so a rollback never loses data. To try one safely, create a Neon branch, point `DATABASE_URL_UNPOOLED` at it and run the command there first.

## Deploying

Pushes to `main` deploy to Vercel automatically.
