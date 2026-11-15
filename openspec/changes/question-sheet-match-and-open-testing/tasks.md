## 1. Match a course question to a sheet question

- [x] 1.1 Add `lib/sheets/question-match.ts` with `matchSheetQuestion(interpretation, spanish)` (uses the engine's `norm`, returns an index or null) and `unmatchedQuestions(course)` (position and text of each question with no match)
- [x] 1.2 Unit tests: same text, differing capitals and accents, different question, empty interpretation, duplicate texts (first wins)
- [x] 1.3 `loadWritingCourse` attaches `sheetQuestion: number | null` to each question; update the `WritingCourse` type and the test fixtures that build one

## 2. Apply the match on the server

- [x] 2.1 In `saveSheetAnswer`, refuse an unmatched question with "This question has no sentence builder yet." before reading the selection
- [x] 2.2 Pass the matched sheet question to `signOff` so blocks, variant and required parts apply on confirm
- [x] 2.3 Tests in `writing-store.test.ts`: unmatched refused and nothing stored; a two-question sheet with a past-tense block and a present-tense block refuses a chunk from the other block; required parts named as the one thing to fix
- [x] 2.4 Check `/api/answers` returns the new error as a normal message, not a crash

## 3. Apply the match on the write screen

- [x] 3.1 `SheetWrite` passes the matched sheet question to `WriteSheet` as `question`
- [x] 3.2 For an unmatched question, do not mount `WriteSheet`; show the notice with the question text and no chunks, in plain words for a student
- [x] 3.3 Dots and "all confirmed" logic count an unmatched question as not confirmed in a gated course
- [x] 3.4 Playwright: on the seeded course, question 1 shows the notice and question 5 shows the sheet (the two-block case is covered in `writing-store.test.ts`, not in a browser)

## 4. Report gaps at seed time

- [x] 4.1 `scripts/seed.mjs` prints position and text of every unmatched question for each course it seeds, and does not fail
- [x] 4.2 Test that the seeded course reports exactly questions 1 to 4

## 5. Open the gates inside phases for unlock-all courses

- [x] 5.1 Automate page passes `unlockAll` to `Automate`; the expert switch is enabled when it is true and still `disabled={!allAtTop}` when false
- [x] 5.2 Memorise page passes `unlockAll` to `MemoriseLadder`; add `openLesson` so any lesson of any answer can be opened in an unlock-all course; `nextFor`, `stepState` and `recommended` are unchanged
- [x] 5.3 `SheetWrite` shows "Skip this question" only when `unlockAll`, for any question not yet confirmed
- [x] 5.4 Confirm memorise and automate practise the model answer for a skipped or unmatched question (the existing `practiceAnswerText` fallback) and add a test for the unmatched case
- [x] 5.5 Tests: a gated course gets none of these (expert locked, lessons in order, no skip); an unlock-all course gets all three
- [x] 5.6 Extend `tests/testing-course.spec.ts`: join the testing course, skip to question 5, open expert mode and a final check straight away

## 6. Docs

- [x] 6.1 `docs/user-testing.md`: what the testing course now opens, that questions 1 to 4 of the seeded course have no sentence builder, and why
- [x] 6.2 `docs/technical-documentation.md`: the question match and where the in-phase gates are read
- [x] 6.3 Document how to stand up a separate testing deployment (Neon branch, preview `DATABASE_URL`, migrate, seed, share `PRBA7K3M`)

## 7. Contrast reasons

- [x] 7.1 Add `affect` to the chunk properties; refuse an `affect` reason after a flipping connector in `polOK`
- [x] 7.2 Mark the feeling reasons in the free-time sample; update the two tests that asserted the old behaviour and add the cost-versus-feeling cases
- [x] 7.3 Add the instruction to the sheet-reading prompt and bump the prompt version so stored drafts are read again

## 8. Finish

- [x] 8.1 Run unit tests, typecheck and lint, and the write, testing-course and automate Playwright specs
- [ ] 8.2 Walk the write journey by hand on the testing course: question 1 shows the notice, skipping works, question 5 builds and confirms, memorise and automate open and practise the model answers for the rest
