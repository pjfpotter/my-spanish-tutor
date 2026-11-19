# Tasks

## 1. Stage model and door building (pure logic)

- [ ] 1.1 In `lib/dreamcore/doors.ts` replace `Rung` with a five-value `Stage`, `RUNG_NAME` with stage names, and add `firstLast(text)`. Verify with unit tests: "Me encantan" masks to first and last letters, one-letter words stay whole, and punctuation and accents behave like `firstLetters`.
- [ ] 1.2 Make `buildRun` return the eight fixed doors (two each for stages 1 to 4), with stage 2 as the whole first sentence and stage 4 as the first chunk only, and add `nextNoHelpDoor` for stage 5 drawing from `unmet` first without repeating a question. Verify in `lib/dreamcore/dreamcore.test.ts`: stage order `[1,1,2,2,3,3,4,4]`, stage 2 bits equal the first sentence, stage 5 doors favour `unmet` and avoid repeats.
- [ ] 1.3 Update `plaqueOf` for the new stages (stage 3 letters, stage 4 first chunk, stage 5 question and subtitle only). Verify with unit tests that stage 5 plaque never contains an answer word and the subtitle is English only as a gloss of the question.
- [ ] 1.4 Add `ESCAPE_AFTER = 3`, `countsAsClean` and `escapeEarned`. Verify with unit tests: help and skip do not count, three clean doors earn it, two clean plus one assisted does not.
- [ ] 1.5 Cap `closingRate` at index 11 in `lib/dreamcore/chase.ts` and update its doc comment. Verify with a unit test that rates at index 11 and 20 are equal and earlier rates are unchanged.

## 2. Game wiring

- [ ] 2.1 In `DreamcoreGame.tsx` drive the plaque, `masked` and the stage name from `Stage`, and append stage 5 doors as they are cleared instead of a fixed `RUN_LENGTH`. Verify with a Playwright run on the fake speech source that clears eight doors and sees a ninth stage 5 door.
- [ ] 2.2 End the run with `escaped` only when `escapeEarned`, counting only clean stage 5 doors, and let Show me and skip still open the door. Verify by e2e: three clean no-help doors escapes; a third door cleared with Show me does not and another door follows.
- [ ] 2.3 Play the Spanish question from stage 3 with a Replay button and a text fallback when sound is off or fails, reusing the existing tutor audio path found at the start of the task and making no paid call. Verify by e2e that Replay is present at stages 3 to 5 and that with sound off the question text shows.
- [ ] 2.4 Record only clean stage 5 doors via `/api/respond` and nothing from stages 1 to 4. Update `tests/pasillo-step.spec.ts` to match. Verify the spec asserts exactly the expected number of numbers-only unassisted posts and none for earlier stages.

## 3. Result copy and docs

- [ ] 3.1 Add `stage` to `Outcome` in `lib/dreamcore/rewards.ts` and one suggestion per stage in `lib/ui/step-copy.ts` (one thing to try, encouraging, no English spoken). Verify with the existing copy length test extended to the new fields and a rewards unit test for the stage line.
- [ ] 3.2 Update the demo e2e and the `/lab/dreamcore` check for the new run length, and the demo script if it names the rungs. Verify `tests/demo.spec.ts` and the lab load pass.
- [ ] 3.3 Mark roadmap item 1 as shipped in `docs/roadmap.md`, tick this change in `ks3-spanish-speaking-tutor-v1/tasks.md` in the same commit, and add a short run-through note under `docs/user-testing-notes.md`. Verify by reading the diff.

## 4. Owner check

- [ ] 4.1 **Owner play-through on a phone.** One run as a student who says everything (should escape) and one who only makes noise (should be caught), recording the stage reached and the feel of the closing rate; adjust constants in `chase.ts` only. Verify with the notes in `docs/user-testing-notes.md`.
- [ ] 4.2 Run `npm run typecheck`, `npm test` and `npm run test:e2e`. Verify all green.
