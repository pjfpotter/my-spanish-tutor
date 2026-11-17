## Why

The testing course (`PRBA7K3M`) is a copy of the seeded "Going out" course, which has one sentence builder (the free-time sheet) and five questions. Only question 5 matches it, so on the write screen questions 1 to 4 say "There is no sentence builder for this question yet" and a tester can only skip them (change `question-sheet-match-and-open-testing`). Write mode, the core of the product, cannot be tested end to end in the one course built for testing.

The teacher's real Year 8 sentence builders are now in `docs/teaching-resources/sentence_builders/`. This change gives the testing course five questions that each have their own sentence builder, taken from those sheets, so a tester can write, confirm, memorise and automate five real answers.

## What Changes

- `PRBA7K3M` becomes its own course instead of a copy of `TELE8`: five questions, each matched to one of five sentence builders, with its own chunks, model answers and test date. `TELE8` is untouched.
- The five builders, one per question, chosen to cover different shapes of answer:
  1. Films, opinion: `4_1 las peliculas SB` ("¿Qué películas te gustan?").
  2. Free time, present habits: `2_1_2 En mi tiempo libre` ("¿Qué haces en tu tiempo libre?").
  3. Clothes, present and near future: `4_3_4 Que vas a llevar SB` ("¿Qué vas a llevar?", the sheet has no printed title, so the question text is written for it).
  4. Last year's holiday, past tense and a reaction: `2_3_4 Dónde fuiste el año pasado SB` ("¿Dónde fuiste el año pasado?", both of its tables).
  5. Bedroom, description with "está" and positions: `5_3 Como es tu dormitorio SB` ("¿Cómo es tu dormitorio?").
- Each sheet is read by the existing reader (`readDocx`), its printing slips are fixed as `corrections` (for example "esatdio", "polidepotivo", "el pared", and "fui a España" glossed "I go to Spain"), and an interpretation is drafted and checked for it. The five are merged into one sheet and one interpretation, one block per builder, because a course holds one of each. Each course question matches its interpretation question by Spanish text, as `question-sheet-match` already does.
- The testing course's chunks (for memorise and automate) are derived from the five interpretations, and each question has two or three model answers written from them and checked by the validator.
- The derived sheets and interpretations are teachers' material, so they live in a gitignored folder and are never committed. `npm run seed` loads them when present. Without them (a clean checkout, CI) `PRBA7K3M` falls back to today's definition, so every committed test still passes.
- Question audio for the five new questions is built through the cost router before the course is used with sound.
- `docs/user-testing.md` and `docs/technical-documentation.md` describe the new testing course and how to rebuild its local data.

## Capabilities

### New Capabilities
- `testing-course-content`: what the testing course contains (five questions, each with its own matched sentence builder, chunks and model answers), where the derived teacher data is kept, and what happens when it is absent.

### Modified Capabilities
<!-- None. Matching, unlock-all and the write flow already behave as specified; this change supplies content. -->

## Impact

- **Code:** `lib/course/seed.ts` (`TESTING_COURSE` built from local data when present), a new `lib/course/testing-course.ts` loader, a small pure helper that merges several sheets and interpretations into one, `scripts/seed.mjs` and `scripts/build-audio.mjs` (already import `TESTING_COURSE`; they read it from the loader), `lib/db/dev-db.ts` (seeds the loader's result).
- **Data (local, gitignored):** `docs/teaching-resources/testing-course/` holds the merged sheet and interpretation JSON and the question, chunk and model-answer data. `docs/teaching-resources/` is already in `.gitignore`.
- **Database:** none. Re-running `npm run seed` updates the `PRBA7K3M` row in place.
- **Live site:** takes effect only when `npm run seed` is run against the production database. That is a separate, confirmed step, not part of applying this change in code.
- **Out of scope:** changes to the engine, the matching rule or the unlock-all behaviour; a going-out sentence builder for `TELE8`; the teacher upload pipeline; committing any content derived from the teachers' sheets.
