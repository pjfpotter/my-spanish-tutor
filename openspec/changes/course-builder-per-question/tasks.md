## 1. Data model and migration

- [ ] 1.1 Add migration 0021: table `course_builders` (id, course_id, position, name, sheet jsonb, interpretation jsonb, created_at; unique on course and position), a nullable `questions.builder_id` referencing it (on delete set null) and a nullable integer `questions.builder_question`. Leave `courses.sheet` and `courses.interpretation` in place.
- [ ] 1.2 Add the idempotent backfill step to `scripts/migrate.mjs` (design D5): one builder per course that has a sheet and no builder rows, and `builder_id` and `builder_question` set on each question that matches by `matchSheetQuestion`. Test it on the dev database with a course that has one matched and four unmatched questions, run it twice, and check the second run changes nothing.
- [ ] 1.3 The migration also adds `course_builders.calibration jsonb`, and the backfill copies the course's calibration into its one builder. Test it.
- [ ] 1.4 Test that after migration a saved sheet answer on a migrated course still opens (design D4).

## 2. Course file and checks

- [ ] 2.1 Change `lib/course/schema.ts`: replace `Course.sheet` with `Course.builders` (key, name, sheet, interpretation, calibration; validate each calibration) and add `Question.builder` and `Question.builderQuestion`. Validate at least one builder, unique keys, each builder's interpretation, and that each question's builder names a key in the list, and each `builderQuestion` is a valid index into that builder's questions. Tests for each refusal.
- [ ] 2.2 Update `lib/course/seed-db.ts` to write and update builders and each question's assignment (insert, update and remove builders by key so re-seeding is safe). Update the seed fixtures and `seed.test.ts`.
- [ ] 2.3 Update `lib/course/status.ts`: replace `has_sheet` with the builder count, list questions without a builder as a notice that does not block publishing, and extend `contentHash` to cover the builders and assignments, keeping already reviewed and published courses valid (design Risks). Tests.
- [ ] 2.4 `scripts/seed.mjs`: print each question's builder name, or "no sentence builder yet", and which builder question it is linked to or "whole builder"; on an ambiguous question stop and print the builder's questions with their numbers (design D3).

## 3. Write screen and server

- [ ] 3.1 `lib/progress/writing-store.ts`: load a question's builder (only the one being written), build its engine, and use it for typed-text reading and sign-off; refuse a sheet answer for a question with no builder (spec: a question with no builder has none).
- [ ] 3.2 Resolve the link (design D3): a pure `resolveBuilderQuestion(builder, question)` that applies the explicit link, then the text match, then the whole-builder rule, and otherwise returns an error naming the question and listing the builder's questions. Use it in `seed-db.ts` and the migration backfill; at run time read the stored link only. Update `question-match.test.ts` and add tests for each of the four steps.
- [ ] 3.3 `app/phases/write/page.tsx` and `SheetWrite.tsx`: pass the question's builder sheet to `WriteSheet`; keep the "no sentence builder yet" panel for a question with none.
- [ ] 3.4 Tests: two questions on one builder with two halves each offer only their own half; a chunk of another builder is refused by the server; the answer route returns an error for a question with no builder.

## 4. Remove the merge workaround

- [ ] 4.1 Delete `lib/sheets/merge.ts` and `merge.test.ts`. Remove the `own` table filter from `WriteSheet.tsx`. Keep `parseText`'s optional question argument and `blocks` support (design D6).
- [ ] 4.2 Rebuild `lib/course/testing-course-build.ts` and `scripts/build-testing-course.mjs` to produce five builders (each with its own calibration from `calibrationFromChunks`) and each question's `builder` key instead of a merged sheet, and update `testing-course.ts` and its tests. The local, gitignored data files are reused.
- [ ] 4.3 Update `scripts/build-audio.mjs`, `scripts/price-course.mjs` and `lib/db/dev-db.ts` for the new shape.

## 5. Verify

- [ ] 5.1 Unit suite, `tsc`, and the `testing-course`, `journey` and `sheet-upload` e2e specs pass, with and without the local testing data.
- [ ] 5.2 Browser walk with the local data: each of the five questions shows only its own builder's sheet and confirms and persists after a reload.
- [ ] 5.3 Run the migration against a copy of the production data (a Neon branch), then check `TELE8` and `PRBA7K3M` before applying it to production.

## 6. Docs and deploy

- [ ] 6.1 Update `docs/technical-documentation.md` (course shape, builders table, assignment rule) and `docs/user-testing.md`.
- [ ] 6.2 Mark the merge decisions of `testing-course-five-builders` as superseded, and add a ticked or open task to `ks3-spanish-speaking-tutor-v1/tasks.md` that records this change.
- [ ] 6.3 Deploy, then re-seed `PRBA7K3M` and `TELE8` and check the write screen of each question on the live site. Testers with old `PRBA7K3M` data delete it and rejoin.
