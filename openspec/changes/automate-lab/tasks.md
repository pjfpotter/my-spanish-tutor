## 1. Fake students and notes (pure)

- [x] 1.1 `lib/lab/fake-students.ts`: three students (short, mixed, long), answers from the seed model answers at different rungs, ids `lab:<student>:<position>`, chunks from the seed
- [x] 1.2 `lib/lab/notes.ts`: the stamp type, formatting notes and the attempt log as plain text, storage keys under `lab:automate:`, safe read and write
- [x] 1.3 Unit tests: the three students differ in chunk levels; ids never match a real question id; formatting with no notes, notes only, log only; storage that throws

## 2. A lab mode on the screen

- [x] 2.1 `Automate` gets `lab` (default false): real capture, local `post()`, no `/api/clip-failure`
- [x] 2.2 `onAttempt` and `onStage` callbacks report the snapshot (position, level, window, response ms, accuracy, assisted, blank, stage)
- [x] 2.3 Test: in lab mode a round makes no request to the attempt, response or profile routes; the real phase's requests are unchanged

## 3. The page

- [x] 3.1 `app/lab/automate/page.tsx`: student picker, `?student`, `?startAt`, `?expert`, `noindex`, no link from the site, the cost line
- [x] 3.2 Start again: clears the current student's ladder, bests and window; keeps notes and log
- [x] 3.3 Notes panel under the round: stamp from the latest snapshot, one-tap tags, free text, the attempt log, Copy notes, Clear notes
- [x] 3.4 Playwright: open the lab, play a round with the stubbed microphone, add a note, see the log, copy, start again, and confirm the real phase's device keys are untouched

## 4. Docs and check

- [x] 4.1 `docs/technical-documentation.md` and `docs/user-testing.md`: what the lab is, its address, what it keeps and where
- [x] 4.2 Run unit tests, typecheck and the new and existing automate specs
