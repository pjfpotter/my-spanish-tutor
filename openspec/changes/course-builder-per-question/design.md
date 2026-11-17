# Design

## Context

See `proposal.md` for why. Today a course row holds `sheet` and `interpretation` (migration 0020), `Course.sheet` is one `{ sheet, interpretation }`, `loadWritingCourse` builds one engine for the whole course, and a question reaches a restriction only by matching a sheet question by Spanish text (`matchSheetQuestion`). The engine can already restrict a question to part of one sheet (`block` on slots and frames, `blocks`, `req` and `required` on an interpretation question). A student's saved selection is `{ slotKey: { col, i, vi? } }` with plain keys, and `fromSelection` rebuilds it against a builder and returns null when anything is missing, so a stale selection is never trusted. The calibration and the word bank are course-level: chunks carry an optional `builder` label.

The v1 spec already requires several builders per course and a question naming its builder, so this change brings the build in line with the spec and adds one decision from the owner: a question has at most one builder, and a builder may serve several questions.

## Goals / Non-Goals

**Goals:**
- A course holds N builders; a question names 0 or 1; a builder can be named by many questions.
- Each builder is stored exactly as uploaded and ingested on its own, so a teacher can add or replace one without touching the others.
- Existing courses keep working with no student-visible change.
- Shape the data so a later teacher library of builders can reference a builder from many courses without reshaping it.

**Non-Goals:**
- A teacher-facing upload page, a library, hand reassignment of questions, two builders for one question, or any change to the engine's polarity, pair or sign-off rules.

## Decisions

### D1. A `course_builders` table, and `questions.builder_id`
A new table `course_builders` (`id`, `course_id`, `position`, `name`, `sheet jsonb`, `interpretation jsonb`, `created_at`) holds one row per builder. `questions` gets a nullable `builder_id` referencing it and a nullable `builder_question` (the index of one of that builder's interpretation questions). A builder's `name` is a short label (for example "Free time") shown to the teacher in the seed report and owner view.
- **Alternative: a jsonb array on `courses`.** Simpler to read, but a question would reference a position inside a blob, nothing could be checked by the database, and a library would need a new shape. Rejected.
- **Alternative: a global `builders` table plus a join table to courses (the library).** The right shape for the later version, but it adds ownership and sharing questions that are out of scope. A row that holds one course's copy can be promoted to a library later by moving the row's content, so D1 does not block it.

### D2. Course file shape
`Course.sheet` is replaced by `Course.builders: { key: string; name: string; sheet; interpretation; calibration }[]` and each `Question` gains `builder?: string` (a `key`) and `builderQuestion?: number`. `validateCourse` requires at least one builder, a unique key per builder, validates every builder with `validateInterpretation`, and requires each `question.builder` to be a key in the list. The chunk's `builder` label becomes the builder `name` when a course has more than one builder; chunk labels that are set by hand are kept.
- **Calibration is per builder** (owner decision, replacing my first assumption). Calibration is phrase-based, so a builder's starters, justifiers, features and tenses only make sense for its own sheet; a shared one scored every answer on new content as 0. `course_builders` gets a `calibration jsonb` column, validated with `validateCalibration`. The course keeps its own `calibration` for the whole-test targets and as the fallback for a question with no builder. `calibrationFromChunks` (testing-course-build) becomes per builder and is what the testing course uses.
- **Where it is read:** `writing-store` (an answer's value and the coach), `lib/memorise/store.ts` and `practice-text.ts` (practice text), and the whole-test checklist, each choosing the calibration of the question's builder (a helper `calibrationFor(question)` returns the builder's calibration or the course's).
- **Alternative: merge all builders' calibrations into one.** Simple, but a justifier or feature in one builder could earn value in an answer on another, and the merge hides which builder a phrase came from. Rejected.

### D3. Which part of the builder a question uses: a stored link
The link between a course question and a section of a builder is data on the question, `builder_question`, not wording compared on every request (owner decision, replacing my first idea of a text match with fallbacks). Resolved once, at seed:
1. An explicit `builderQuestion` in the course file wins and must be a valid index into the builder's questions.
2. Otherwise, if the question's Spanish text equals a builder question's text under `norm`, that index is stored.
3. Otherwise, a builder with at most one question needs no link: the question uses the whole builder with its top-level `required`.
4. Otherwise (several builder questions, no match) seeding stops, names the question and prints the builder's questions with their numbers, so the owner adds `builderQuestion`. Nothing is guessed.
At run time `builderFor(question)` returns the engine for `builder_id` and the linked builder question's `blocks`, `req` and `required` apply; it never compares text. `matchSheetQuestion` stays as the seed's step 2 and the migration's step.
- **Alternative: infer the section from the chunks** (a question's tense or topics against a section's verbs and tags). Works for a present and past split, fails elsewhere, and a silent wrong guess shows a student the wrong half. Rejected as the mechanism.
- **Alternative: a model suggests the link when a sheet is uploaded**, stored and shown for sign-off. Allowed (upload time, cost router) and suited to a teacher-run upload page, but it adds cost and a review step. Recorded as a later increment.
- **Alternative: compare text at run time with a whole-builder fallback.** My first drafts. The fallback offered both halves of a two-half builder, which is the original bug in miniature.
- The seed report shows each question's builder and which builder question it is linked to (or "whole builder").

### D4. Saved answers need no migration
A selection uses plain slot and column keys, and an answer belongs to one question, which has one builder. So the engine for a question is built per builder with its own keys, no prefix is needed, and old selections for a migrated course remain valid. The one exception is the testing course `PRBA7K3M`, whose existing answers were saved against the merged, prefixed keys (`free_starter`, and so on). Those will fail `fromSelection` and read as no saved sheet answer, which is safe by design. The tester profiles for `PRBA7K3M` delete their data and rejoin, as already noted in `docs/user-testing.md`.

### D5. The migration
The migration runner (`scripts/migrate.mjs`) applies plain SQL files once each, and runs on every Vercel build. So the schema step is SQL (migration 0021: the `course_builders` table and `questions.builder_id`), and the backfill is an idempotent step in the same runner, run after the SQL files in the same connection: for every course that has a non-null `sheet` and `interpretation` and no builder rows, insert one builder (position 0, name from the interpretation's title) and set `questions.builder_id` and `questions.builder_question` on each question of that course whose Spanish text matches a question in the interpretation, using the same `norm` and `matchSheetQuestion` the app uses (so SQL never has to reproduce the normalisation). Running it again does nothing. `courses.sheet` and `courses.interpretation` stay in place and unread for one release, then a later change drops them, so rolling the code back still finds its data.
- **Alternative: assign every question of a migrated course to the one builder.** Wrong for `TELE8` and the seeded Going out course, which would offer a free-time sheet for film questions again, the bug `question-sheet-match` fixed.
- **Alternative: normalise in SQL.** Needs `unaccent` and a hand copy of `norm` that could drift. Rejected.
- **Ordering with deploy:** the migration is additive and runs during the build, before the new code serves traffic. Old code keeps reading `courses.sheet`, which is untouched. New code reads only `course_builders`.

### D6. The merge workaround goes away
`lib/sheets/merge.ts` and its test are deleted. The `own` filter in `WriteSheet.tsx` that shows only tables whose columns belong to the question's blocks is removed, because each builder's sheet is now only its own. `parseText`'s optional question argument and the engine's `blocks` support stay: they are used by a single sheet with two halves (D3) and are covered by tests. `scripts/build-testing-course.mjs` stops merging and writes `course.json` with five builders and each question's `builder` key; the interpretations and `content.json` are reused as they are, minus the prefix.
- The local `interpretations/*.json` were written for the merge; the prefix is added by the merge and not in the files, so they are reused unchanged.

### D7. Ingest and cost
Each builder is a separate upload, so one model call per builder, cached by document content (existing `sheet_interpretations` cache). Nothing here changes the cost router or adds a model call to the practice loop.

### D8. Status, publish and the owner view
`status.ts` replaces `has_sheet` with the count of builders and a list of questions without a builder. Publishing needs at least one builder; the list of questions without one is shown as a notice, not a block (a teacher may be waiting for a sheet). The seed report prints each question's builder name, or "no sentence builder yet".

## Risks / Trade-offs

- **Content hash.** `contentHash` (review and publish) does not cover the sheet today. It should also cover every builder and each question's assignment, or a changed or reassigned builder would not ask for a new review sign-off. This changes the hash of every existing course once, so a published course would read as changed. The first run after migration stores the new hash for courses that were already reviewed or published, so no course is sent back for review by this change. Covered by a test.
- **Backfill mismatch.** A question that matched only by chance of wording would be assigned. This is the same match that already controls what students see today, so behaviour does not change.
- **Two copies of a shared builder.** In v1, reusing a builder across courses means uploading it again (no library). Accepted.
- **Per-builder calibration** means each builder must be calibrated when it is uploaded; a builder without one is refused at seed. The calibration regression fixtures (`examples`) are per builder too.
- **Large course rows.** Five builders are about the size of five sheets; each is loaded only for the question being written, not for the whole course on every request, to keep requests light.
