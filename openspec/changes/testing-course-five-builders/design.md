## Context

- A course holds **one** sheet and **one** interpretation (`courses.sheet`, `courses.interpretation`). The interpretation has a `questions` list, and `slots` and `frames` can carry a `block` number, which a question restricts through its `blocks`. This is how a two-part sheet (a past half and a present half) already answers two questions.
- Each course question is matched to an interpretation question by its Spanish text under `norm` (`lib/sheets/question-match.ts`). No match means no sentence builder.
- `TESTING_COURSE` today is `{ ...SEED_COURSE, classCode: 'PRBA7K3M', unlockAll: true }`, so it has the "Going out" questions and one free-time sheet.
- The reader (`readDocx`) parses 47 of the 48 files in `docs/teaching-resources/sentence_builders/`. Checked for the five chosen: films 1 table, 32 chunks all glossed; free time 1 table, 37 chunks; clothes 1 table with a floating box of 3 accessories; holiday 2 tables, 40 chunks; bedroom 1 table, 56 chunks, 6 with no English.
- The repo is public and `docs/teaching-resources/` is gitignored. `real-interpretations.test.ts` already states that teachers' sheets and the interpretations derived from them are not committed.
- Interpretation drafting normally runs at upload through the cost router (`ingest.ts`: draft, check, repair, pairs).

## Goals / Non-Goals

**Goals:**
- Five questions, five builders, every question writable, in `PRBA7K3M` only.
- No teacher-derived content in the public repo; a clean checkout still builds and passes its tests.
- Reuse the engine, matcher and gates unchanged.

**Non-Goals:**
- Changing the engine, matching rule, unlock-all behaviour or the upload pipeline.
- A going-out sheet for `TELE8`, or any change to `TELE8`.
- Supporting several sheets per course in the schema.

## Decisions

### D1. Merge five builders into one sheet and one interpretation
A pure helper, `mergeSheets(parts)`, takes the five `{ sheet, interpretation }` pairs and returns one. Tables are renumbered 0 to 5 (the holiday sheet has two), so cell ids (`t3r0c1`) stay unique. Column and slot keys get a short prefix per builder (`film_`, `free_`, `wear_`, `trip_`, `bed_`), and `props` and `corrections` references are rewritten to match. Each builder's slots and frames get `block` set to its builder number, and each question lists its `blocks`. Interpretation `questions` becomes the five, with `es` equal to the course question's Spanish.

*Why:* the schema, `validateCourse`, the seed, the matcher and the write screen already handle exactly this shape, so nothing outside content changes. *Alternative:* several sheets per course (a schema, DB and write-screen change, and it overlaps `upload-sentence-builder-pipeline`). Rejected as a large change for a testing aid. *Risk:* a merge bug could cross-wire two builders, so the merge has a test that every chunk of a block is reachable only from its own question.

### D2. The five builders and their questions
| # | Question (Spanish, matches the sheet) | Builder file | Shape |
|---|---|---|---|
| 1 | ¿Qué películas te gustan? | `4_1 las peliculas SB` | opinion, film, connector, reason |
| 2 | ¿Qué haces en tu tiempo libre? | `2_1_2 En mi tiempo libre` | time, activity, place, reason |
| 3 | ¿Qué vas a llevar? | `4_3_4 Que vas a llevar SB` | present and near future, colours agree with the item |
| 4 | ¿Dónde fuiste el año pasado? | `2_3_4 Dónde fuiste el año pasado SB` | past tense, two tables (where, how it was) |
| 5 | ¿Cómo es tu dormitorio? | `5_3 Como es tu dormitorio SB` | description, "está" and positions |

Chosen for variety of grammar (opinion, habit, near future, preterite, location) over topic, so the write screen is exercised on gender and number agreement (3, 5), a two-part sheet (4) and fixed words (5). The clothes sheet has no printed title and the bedroom sheet's title is not marked as a question, so those two question texts are written here. The holiday sheet's second table ("¿Cómo te fue?") is a block of question 4, not a sixth question. Alternatives for question 5, if bedroom proves awkward: `2_5_6 Qué hiciste el año pasado SB` (a simple 3-column past tense sheet).

### D3. Drafting the interpretations
I draft the five interpretations by hand from the reader's output, as `lib/sheets/samples/free-time.ts` was, rather than calling the model pipeline. *Why:* it spends nothing, is reproducible, and the verification gate (`validateInterpretation`, then `verifyBuilder` with random walks) is the same check an uploaded draft must pass. Printing slips go in `corrections` (types `spelling`, `agreement`, `wrong-english`, `missing-english`), never by editing a chunk, so `readDocx`'s output is still the source of truth. *Alternative:* run `ingest` live with the cost router. Rejected for now: it is a paid call per sheet for content we are about to review line by line anyway; it can be used later to cross-check.

### D4. Local-only storage and fallback
Derived files live in `docs/teaching-resources/testing-course/` (already ignored by `.gitignore:32`): `sheet.json`, `interpretation.json` and `course.json` (questions, chunks, model answers). The merge helper and the loader are committed code; the five interpretations, the merged sheet and the question, chunk and model-answer data are the local files. A script, `scripts/build-testing-course.mjs`, reads the five `.docx` files with `readDocx`, applies the locally stored interpretations, merges them and writes `sheet.json` and `interpretation.json`. `lib/course/testing-course.ts` exports `loadTestingCourse()`: it returns the course built from the local files when `course.json` exists and passes `validateCourse`, otherwise the previous `{ ...SEED_COURSE, classCode, unlockAll }`. `seed.mjs`, `build-audio.mjs` and `price-course.mjs` call the loader instead of importing the constant. `dev-db.ts` (the in-process database the committed end-to-end tests use) keeps seeding the default `TESTING_COURSE`, because those tests name its questions; setting `TESTING_COURSE_LOCAL=1` swaps in the local course for trying it by hand. `TESTING_COURSE` stays exported as the fallback so committed tests that name it keep working. The seed prints "testing course: using local data" or "testing course: local data not found, using the default".

*Risk:* committed tests never exercise the five-builder course in CI. *Mitigation:* a local-only test (skipped when the folder is absent, like `real-interpretations.test.ts`) runs the full checks, and the merge helper has committed tests on small invented fixtures.

### D5. Chunks, model answers and calibration
Course chunks are derived from the merged builder: one per Spanish text the write screen offers (plus printed fixed words such as "está", which a student says but never picks), `category` from the builder's name and the column title, `builder` set to the builder's name, `featureTags` from where the chunk sits and what it says (`tagsFor`). Chunks the interpretation hides (`only`) are not offered, so they are not chunks. Each question gets three model answers written as the builder composes them and built only from that builder's chunks. A test reads each one back through `parseText`, confirms it with `signOff`, checks it against the word validator and scores it.

*Changed during apply:* the plan was to reuse `going-out.json`. Its starters and justifiers are phrases from other courses, so every answer here scored nothing and the simplest model answers failed "worth more than zero". `calibrationFromChunks` now derives a calibration from the course's own chunks (starters from opinion and verb chunks, the three justifiers, features for contrast, time phrases, other tenses, describing phrases and idioms), taking glue words and whole-test targets from the shared one. It is only as good as the tags, so it is a testing aid and not a teacher's mark scheme. A question whose simplest answer must be worth something needs a justified opinion, so the bedroom's simplest answer is a description plus "Me gusta mi dormitorio porque es bonito."

### D6. Audio
New question text means new audio hashes. The audio build is a dry run by default; building the five question clips for `PRBA7K3M` is a paid call through the cost router and needs `--yes`, so it is its own task with its own confirmation. Until it is run, the course works with the prototype voice or silent questions as other unbuilt clips do.

### D7. Live site
Writing to the production database is not part of applying this change in code. After review, `npm run seed` against the production connection string updates `PRBA7K3M` in place (the script reports created or updated, and prints an owner token only on first creation). It requires the local data on the machine that runs it.

### D8. `parseText` takes the question (added during apply)
`parseText` was the one engine function that ignored a question's blocks. Merged, it read the free-time "porque es" in place of the films' "porque" and the verification gate failed on 382 round-trips, though each builder passed alone. It now takes an optional question and reads only that question's parts, with a test. Only the verifier calls it, so no screen behaves differently.

### D9. The write screen draws only the question's own tables (added during apply)
`WriteSheet` drew every table of the sheet for every question, so question 1 printed the clothes and bedroom builders under "Testing course". With a question that has `blocks` it now draws only the tables whose columns belong to those blocks, under the question's own title. A sheet whose questions have no blocks is drawn whole, as before. Checked in the browser for all five questions and covered by the existing end-to-end specs.

## Risks / Trade-offs

- **Merge cross-wiring.** Mitigated by prefixes, per-block tests, `verifyBuilder` on the merged builder, and a test that each question's reachable chunks are exactly its block.
- **Sheet quality.** Two chunks on the free-time sheet are garbled in print ("leo un libro novela", "leo un una novela") and "al colegio" is glossed "in school". A correction can only change letters, so they are not offered, but the printed sheet still shows them. The sheets contain further errors ("fui = I go", "un pared", "marrónes"). Each is fixed through `corrections` or noted in a task if the correction type cannot express it.
- **Chunks with no English** (bedroom: six). `validateCourse` requires a gloss for every course chunk, so each needs a `missing-english` correction.
- **Local data is not backed up by git.** The generator is committed so the data can be rebuilt from the sheets.
- **Class-code reuse.** `PRBA7K3M` already exists on any seeded database; re-seeding updates its questions, which orphans nothing because answers key on question position and chunks on Spanish text. Existing tester profiles keep their old answers against the new questions. Testers are told to delete their data first (already in `docs/user-testing.md`).

## Open Questions

- Is the bedroom sheet the right fifth, or would the simpler `2_5_6 Qué hiciste el año pasado SB` suit testers better? Defaulting to bedroom.
- Should `TELE8` later adopt any of these builders? Not decided here.
