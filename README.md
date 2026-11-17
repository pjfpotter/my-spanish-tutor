# My Spanish Tutor

**A phone-first revision game that makes 12 and 13 year olds talk.** Students in England sit a short Spanish speaking test, and most dislike it and feel self-conscious saying Spanish out loud, so they avoid practising the only skill it measures. My Spanish Tutor gives them a private, forgiving, game-like place to practise speaking, on their own phone or a school Chromebook.

- **Live app:** https://my-spanish-tutor-phi.vercel.app
- **Try the demo (no sign-up, nothing saved, uses your microphone):** https://my-spanish-tutor-phi.vercel.app/demo
- **What is next:** [`docs/roadmap.md`](docs/roadmap.md)
- **Coursework slides** (architecture, data flow, design, security, reflection): https://claude.ai/artifact/RgKkTDGR536xU9sf9DuYhF

## The problem, for people outside teaching

In a typical English secondary school, Spanish in Year 8 (ages 12 to 13) is taught from a **sentence builder**: a one-page table of phrases that students combine into sentences. About three times a year each student takes a **speaking test**: a teacher asks five questions out loud and the student answers from memory. Students write their answers in advance and have about a week to revise.

Revision is where it goes wrong. Popular homework games (Quizlet, Blooket, Kahoot) test reading and tapping, not listening or speaking, so they are false practice for a speaking test. And practising aloud is embarrassing. The result is students who walk in having never said their answers out loud.

## What the student does: four steps

| Step | What happens | Why it is there |
|---|---|---|
| **Understand** | Tele, a Spanish-only television, asks each test question with the words hidden. The student picks what it means. | In the test the question is spoken, so they must understand it by ear. |
| **Write** | They build one answer from their teacher's sentence builder, in words they can actually say. | An answer you can say beats a fancy one you cannot. |
| **Memorise** | They say the answer aloud, a bit at a time, while the help fades from full text to first letters to empty blocks to an English clue to just the question. Words light up as the app hears them. | This is the learning step: speaking it is what moves it into memory. |
| **El Pasillo** | A dreamcore corridor game. Each door shows the answer with less help. Say it to open the door. Something is behind you, and only words that match the answer keep it back. | The test gives no time to think. This makes the answer come out fast, under pressure, without notes. |

Scores come from rules, not a model. A word counts if the recogniser understood it. A recognition failure or a noisy room is **never** held against the student, and there are no hearts or lives and no public ranking. The tutor never speaks English: Spanish audio, English only as subtitles.

## Design choices worth knowing

- **Privacy by design.** No student accounts. No names, emails or recordings are stored. A student gets a made-up nickname and a recovery code. Interests are fixed tags, never free text. The data protection impact assessment is in [`docs/dpia.md`](docs/dpia.md).
- **No language model in the practice loop.** Models are used only when a teacher uploads a sentence builder (to read it, correct errors and draft answers). Student speech is scored by plain rules, so practice is fast, free to run and predictable. A test fails if a model call is added to the loop.
- **Cost router.** Every paid call goes through one router that logs and caps it. The cost per student is measured from that log with `npm run cost-report`.
- **Built for a cheap phone and an old Chromebook.** Light canvas drawing at 30 frames a second, reduced-motion and light and dark themes respected, keyboard focus always visible.
- **Original characters only.** Tele and the corridor are our own designs, not copyrighted characters.

## How it is built

Next.js (App Router) and TypeScript on Vercel, Neon Postgres for data, the browser's built-in speech recogniser for live listening with a server transcription fallback, and pre-built Spanish audio clips for Tele. Planning and requirements are in [OpenSpec](openspec/) change folders, so every feature has a written requirement with test scenarios. See [`docs/PRD.md`](docs/PRD.md) for what we are building and [`docs/ARD.md`](docs/ARD.md) for how.

The edge-tts voice used while prototyping must not ship. A licensed production voice is chosen before a wider launch ([`docs/voice-decision.md`](docs/voice-decision.md)).

## Evidence

Tested with a real student, whose feedback drove the current El Pasillo: the clock only stops for matching words, fear builds faster, and the look-over-the-shoulder moment now happens by itself. Findings and what is next are in [`docs/roadmap.md`](docs/roadmap.md) and [`docs/user-testing-notes.md`](docs/user-testing-notes.md).

---

# For developers

- What we are building: [`docs/PRD.md`](docs/PRD.md)
- How it is built: [`docs/ARD.md`](docs/ARD.md)
- Requirements and tasks: [`openspec/changes/`](openspec/changes/)

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
