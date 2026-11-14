# Teacher flow

How a speaking test becomes a course with a class code, where each step runs, which calls it makes and what is cached. This is task 23.1 and follows the `teacher-course-setup` spec.

In version one there are no teacher accounts and no teacher-facing setup page. The developer sets a course up on the teacher's behalf, using scripts. The teacher's only touchpoints are the materials they hand over, the class code they give students and the read-only overview they open with the owner link.

## Status of each step

Each step below is marked **Built**, **Partly built** or **Not built**, checked against the code on the day of writing. The spec's six steps are the target; the gaps are listed in the last section.

| # | Step | Runs where | Calls made | State |
|---|---|---|---|---|
| 1 | Plan the test | Teacher, on paper; developer types it in | none | Built (by hand) |
| 2 | Save the draft | Developer's machine, `npm run seed` | database writes | Partly built |
| 3 | Set-up call | Library only, no script yet | one small-model call per sentence-builder upload, through the cost router | Partly built |
| 4 | Review | Developer reads the output | none | Not built |
| 5 | Publish (build the audio) | Developer's machine, `npm run build-audio` | one speech-synthesis call per new clip, through the cost router | Partly built |
| 6 | Share the class code, keep the owner link | Developer to teacher | none | Partly built |

## Step 1: plan the test

The teacher supplies a title, a test date, a sentence builder (the chunks, with English glosses) and four or five test questions. Questions are usually the current topic plus one recycled from an earlier topic. They also supply their own example answers for calibration and the mark scheme; those become the data in `lib/course/calibration/`.

Today the developer turns this into a `Course` object by editing `lib/course/seed.ts`. The shape is defined in `lib/course/schema.ts` and checked by `validateCourse`. Question text feeds the audio hashes, so finish editing question wording before step 5.

A course can have one or more sentence builders (a chunk's optional `builder` names which) and four or five core questions plus any extension questions, which are practised but never gate the path or count toward readiness (task 23.2, built).

## Step 2: save the draft

```
npm run seed
```

`scripts/seed.mjs` connects with `DATABASE_URL_UNPOOLED` (or `DATABASE_URL`) and calls `seedCourse` for each course listed in the script (`SEED_COURSE` and `TESTING_COURSE`). It validates the course first and refuses to write one that is not valid.

- **Calls:** database writes only. No model call, no speech call.
- **Safe to repeat:** the course is matched by class code, questions by position and chunks by Spanish text, and all are updated in place. Ids that answers and mastery point at never change.
- **Owner token:** created only the first time a course is inserted. It is printed once, and only its SHA-256 hash is stored. Running the seed again does not print it again.
- **What is stored:** `courses` (title, test date, calibration, `model_answers`, `unlock_all`), `questions`, `chunks`.

A new course starts as a **draft**: its status is worked out from its content (see "Moving a course along" below). Courses that existed before status was added count as published and shared. A teacher can load only so many new courses a month (see "Pricing and limits").

## Step 3: the set-up call

`setUpCourse` in `lib/coach/setup.ts` is the one model call in the writing path. For one sentence-builder upload it:

1. checks budget and rate limit through the cost router, as service `course-setup`, tier `small_model`;
2. sends the questions, the chunk bank, the teacher's examples and how many answers to write per question (three);
3. receives flags for chunk combinations that read oddly, and model answers per question;
4. keeps an answer only if every word is in the course's word bank and the rubric finds at least one justified opinion in it (`problemWith`);
5. asks once more for any question left with no kept answer, then marks it missing.

Code decides what is kept; the model never does. The cap is £2 per 30 days and at most 5 calls per hour (`lib/cost-router/limits.ts`). If the cap is reached or the call fails, students are offered the hand-written model answers and the event is logged.

**Not wired up.** Nothing in `scripts/` or `app/` calls `setUpCourse`. It is covered by unit tests only. The model answers in the live course come from the hand-written `modelAnswers` array in `lib/course/seed.ts`, which `seedCourse` stores in `courses.model_answers`. To run the set-up call for real, a script has to be written that loads a course, calls `setUpCourse` with a real `callModel`, and writes the result to `courses.model_answers`.

## Step 4: review

The spec says the output is shown for review before publishing when a reviewer is available. There is no review step in code. `setUpCourse` returns `modelAnswers`, `flags` and `missing`, so a script could print them for the developer or teacher to read, but none does.

## Step 5: publish (build the audio)

```
npm run build-audio                 # dry run, spends nothing
npm run build-audio -- --yes        # builds only missing or out-of-date clips
```

`scripts/build-audio.mjs` lists every clip the app needs, compares each against what is already stored, and synthesises only the difference. Full detail is in `docs/audio-pipeline.md`.

- **Calls:** one ElevenLabs text-to-speech call per new or changed clip, through the cost router as service `elevenlabs-tts` (cap £3 per 30 days).
- **What is cached:** each clip is stored under a slot that is a hash of text and speed. A clip is skipped when its stored source hash (text, voice, model, speed) matches. Running again with nothing changed makes no calls, which is the "re-publish unchanged" requirement for audio.
- **What it reads:** `SEED_COURSE.questions` from `lib/course/seed.ts` and the phrase bank. It does not read the database, and it does not read `TESTING_COURSE`.
- **What it writes:** `public/audio/clips/<slot>.mp3` and `.json`, and regenerates `lib/audio/built.ts`. These files are committed to git.

So "publish" today means: build the clips locally, commit them, and deploy. Students never trigger synthesis.

## Step 6: share

The student **class code** (`courses.class_code`) is what students type on the join screen. `POST /api/join` looks it up and returns only the title and test date. It never creates a profile. Codes are matched ignoring case, spaces and dashes, and must be 4 to 8 letters or digits.

The **owner link** is `/owner/<token>`. The token is the only credential: there are no teacher accounts, the class code opens nothing there, and the page is `noindex` with no referrer. It shows the read-only overview (aggregate progress and the cost report) and the switch for the cheeky pool (`POST /api/owner/cheeky`). `?demo=1` shows made-up sample data.

The developer gives the teacher both. The token is shown only once, when the course is first created.

## Local versus server

Open question from the task: which steps can run on the server?

| Step | Can run on the server? | Why |
|---|---|---|
| 2 Save the draft | Yes | Only needs the database. It already uses the same `seedCourse` function a page could call. |
| 3 Set-up call | Yes | Needs the cost router and a model key, both available server-side. It is a build-time call and students never trigger it. |
| 5 Build the audio | Not as it stands | It writes mp3 and json files into `public/audio/clips/` and rewrites `lib/audio/built.ts`. A Vercel function has no writable, persistent file system for those, and the app finds clips through the committed index. Running it on the server would first mean moving clips to blob storage and reading the index from the database. |
| 6 Owner link | Yes | Hash lookups only. |

**Recommendation for version one:** keep every step on the developer's machine, as the spec says. It needs no new infrastructure, keeps paid calls in one place the developer watches, and the committed clips are what ships. When the teacher-facing page (23.4) is built, steps 2, 3 and 4 can move to the server by calling the same functions, and audio needs the storage change above or stays a developer step with a "waiting for audio" status. That decision belongs to the owner, and 23.4 stays on hold until they decide.

## Calls summary

| Call | When | Through cost router | Cap | Cached by |
|---|---|---|---|---|
| Database write (seed) | Step 2 | no (not paid) | none | upsert by class code, position, Spanish text |
| Small-model set-up call | Step 3, once per builder upload (twice at most if a question needs a retry) | yes, `course-setup` | £2 per 30 days, 5 per hour | not cached today; a re-run calls again |
| Speech synthesis | Step 5, once per new or changed clip | yes, `elevenlabs-tts` | £3 per 30 days | content hash of text, voice, model, speed |

No call is made when a student uses the app other than those described in the student specs (transcription fallback and similar). The practice loop makes no language-model call.

## Moving a course along (task 23.3)

`npm run course -- status|review|publish|share <class code>`. A course is **draft**, **set up** (every core question has model answers), **reviewed** (someone signed it off), **published** (ready for students) or **shared** (the class code has been handed out). Status is worked out from the course itself: a sign-off stores a fingerprint of the text it was given for, so editing a question or answer lapses review and publish by themselves. Publishing blocks and names every missing item (model answers, audio, a review sign-off).

Publishing a course whose text has not changed does nothing and calls nothing. After an edit, only the paid step whose output is missing runs again, and only when the caller supplies that step: the script supplies none, so it reports what is missing and which command to run. The overview shows the status. Code: `lib/course/status.ts`.

## Pricing and limits (task 23.7)

- `npm run price-course -- <class code or course file>` prices a course before loading it. Clips are stored by text and speed, so phrases shared with a course already built cost nothing and only new clips are priced.
- The audio build records its spend against a course (`npm run build-audio -- --yes --course=CODE`, needs `DATABASE_URL`), so `npm run cost-report` and the overview show a course's own cost. The set-up call already recorded its course. A build for a named course removes no clips, because clips are shared between courses.
- A teacher can load **3 new courses per 30 days**. This number is a placeholder: the owner chooses it in `lib/course/limits.ts`. The refusal says why and when they can load another. There are no teacher accounts, so a teacher is a label the developer gives a course (`teacher` in the course file); a course with no label is not limited.

## Gaps against the spec

These are the differences between this document and the `teacher-course-setup` spec. They map to open tasks.

- **Set-up call not wired to a script**, and no review output beyond the sign-off. See steps 3 and 4. Status and the publish gate are built (23.3) and skip the set-up call when model answers already exist, but nothing yet supplies the real call to `publishCourse`.
- **Owner link cannot be regenerated.** The token is stored only as a hash and shown once. If it is lost there is no function to replace it. The development database sets a known token from `DEV_OWNER_TOKEN`, which is for local use only. Regenerating the link is part of 23.4.
- **Audio build knows only the courses listed in `lib/course/seed.ts`.** `--course=CODE` chooses among them; a course from a file needs adding to that list.
- **Seed values are placeholders.** `SEED_COURSE` has class code `TELE8` and test date `2026-11-20`, both marked as placeholders in `lib/course/seed.ts`.
