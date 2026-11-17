## 1. Merge helper and loader (committed code, no teacher content)

- [x] 1.1 Add `lib/sheets/merge.ts` with `mergeSheets(parts)`: renumber tables, prefix column and slot keys per builder, rewrite `props` and `corrections` references, set `block` on slots and frames, return one sheet and one interpretation whose `questions` carry their `blocks`
- [x] 1.2 Test `mergeSheets` on small invented fixtures (not teachers' text): cell ids stay unique, a question's reachable chunks are exactly its block, `validateInterpretation` passes on the result
- [x] 1.3 Add `lib/course/testing-course.ts` exporting `loadTestingCourse()`: build from `docs/teaching-resources/testing-course/course.json` when present and valid, else the existing `{ ...SEED_COURSE, classCode, unlockAll }`. Keep `TESTING_COURSE` exported as the fallback
- [x] 1.4 Point `scripts/seed.mjs`, `scripts/build-audio.mjs`, `scripts/price-course.mjs` and `lib/db/dev-db.ts` at the loader; make the seed print which source it used
- [x] 1.5 Test the fallback: with the local folder absent the loader returns the default course and the committed suite is unchanged

## 2. The five interpretations (local only, gitignored)

- [x] 2.1 Run the reader over the five sheets and record, per sheet, chunk counts and warnings (the "has nothing to attach to" notes on films, the unglossed bedroom chunks, the clothes floating box)
- [x] 2.2 Draft the films interpretation (`4_1 las peliculas SB`): opinion, film, connector, reason; check the "aunque" polarity rule against the reasons
- [x] 2.3 Draft the free-time interpretation (`2_1_2 En mi tiempo libre`) with corrections for "esatdio", "polidepotivo", "apasionanate", the duplicated "leo un libro novela" and the "porque es" frame
- [x] 2.4 Draft the clothes interpretation (`4_3_4 Que vas a llevar SB`): present and near-future frames, colour agreement with the item, the three floating accessories; choose and record the question text
- [x] 2.5 Draft the holiday interpretation (`2_3_4 Dónde fuiste el año pasado SB`): both tables as blocks of one question, with corrections for "I go to" glosses of "fui" and a gloss for "porque"
- [x] 2.6 Draft the bedroom interpretation (`5_3 Como es tu dormitorio SB`): "hay", "tiene", "está" and position frames, corrections for "un pared" and "el pared" and the six chunks with no English
- [x] 2.7 Run `validateInterpretation` and `verifyBuilder` (150 walks) on each, then on the merged result, and fix findings

## 3. Course content (local only)

- [x] 3.1 Write the five questions (Spanish, English subtitle, topics, template, key word) so each Spanish text matches its interpretation question under `norm`
- [x] 3.2 Derive the course chunks from the interpretations (category, feature tags, English gloss) and check no chunk lacks an English gloss
- [x] 3.3 Write two or three model answers per question from that builder's chunks only; the simplest must be valid and score above zero
- [x] 3.4 Write `scripts/build-testing-course.mjs` to regenerate the local files from the five `.docx` files, and write them to `docs/teaching-resources/testing-course/`
- [x] 3.5 Confirm `git status` shows nothing from the local folder and `validateCourse` on the loaded course returns ok

## 4. Checks

<!-- Added during apply: parseText takes the question (design D8) and WriteSheet draws only the question's own tables (D9); both are covered by the tests and the browser walk below. -->

- [x] 4.1 Add a local-only test (skipped when the folder is absent) that loads the course and asserts: it validates, `unmatchedQuestions` is empty, each question's simplest answer confirms through `signOff`, and a chunk from another builder is refused for each question
- [x] 4.2 Run the unit suite and the testing-course end-to-end specs (`tests/testing-course.spec.ts`) with the local data absent and present
- [x] 4.3 Walk the write screen for all five questions in the in-process dev database using a phone-sized browser, and note anything awkward for a 12 to 13 year old (long chunk lists, missing English)

## 5. Audio

- [x] 5.1 Run `npm run build-audio -- --course=PRBA7K3M` (dry run) and record the clip count and cost
- [x] 5.2 With the owner's confirmation of that cost, build the missing clips with `--yes`

## 6. Docs

- [x] 6.1 Update `docs/user-testing.md` (the `PRBA7K3M` row: five questions, each writable, no skipping) and `docs/technical-documentation.md` (the local data folder, the loader, the rebuild script, the fallback)
- [x] 6.2 Tick the matching entries in `openspec/changes/ks3-spanish-speaking-tutor-v1/tasks.md` or add a ticked task that records this one

## 7. Live site (separate, confirmed step)

- [ ] 7.1 **Seeded 16 Nov: PRBA7K3M reported updated, no unmatched questions. Still to do once the code is deployed:** join it on the live site and open each question's write screen. With the owner's confirmation and the production `DATABASE_URL`, run `npm run seed` and check that `PRBA7K3M` is reported updated, then join it on the live site and open each question's write screen
