# Design

## Context

See `proposal.md`. What exists:

- **The screen is one component.** `Automate` (`app/phases/automate/Automate.tsx`) takes `items`, `chunks`, `initial` and two switches: `demo` (the tour: no microphone, a Pretend button, nothing sent) and `unlockAll`. It scores on the device with pure rules and sends only numbers to `/api/respond` through one function, `post()`.
- **The server is not needed to score.** `post()` has a branch for `demo` that works out coins and rank locally. Transcription is a separate call (`/api/transcribe`) that works without a profile.
- **Device state already exists.** The chunk ladder and personal bests live in `lib/practice/device-store.ts`, keyed by item id, so lab items with their own ids get their own keys.
- **Other labs** (`app/lab/*`) are plain pages with no link from the main site. The memorise lab keeps progress in the browser the same way.
- **Seeded answers.** `SEED_COURSE.modelAnswers` has answers at several rungs for each question; `chunks` gives the colours.

## Goals / Non-Goals

**Goals:** run the real round repeatedly from a known start, as three kinds of student, with notes and a log that carry the numbers; touch the real phase as little as possible.

**Non-Goals:** a server-side lab profile; storing notes anywhere but the device; changing any rule or threshold.

## Decisions

### D1. A `lab` mode on the existing screen, not a copy
`Automate` gains `lab?: boolean` (default false). With `lab`: the microphone and transcription are real (not `demo`), `post()` takes the local branch (no `/api/respond`, no `/api/clip-failure`), and the screen calls an `onAttempt(stamp)` callback with the figures of each attempt. The real phase passes nothing and is unchanged. *Alternative:* fork the screen into the lab. Rejected: it would drift from the screen being tested, which defeats the purpose.

### D2. Fake students are data built from the seed
`lib/lab/fake-students.ts` exports three students (short, mixed, long). For each question it picks the model answer at a chosen rung, so chunk counts differ and the ladder has different depths. Item ids are `lab:<student>:<position>` so the device keys cannot collide with real question ids. The module is pure and tested.

### D3. Local state, reset by key prefix
Everything a lab run keeps (ladder, bests, notes, log) is under `lab:automate:` keys or lab item ids. Start again deletes the ladder and bests for the current student's ids and resets the in-memory window; notes and log are cleared by their own button. The real phase's keys are never read or written.

### D4. Notes are stamped from a snapshot, not from the DOM
`Automate` reports a snapshot (question position, level, window, last response ms, accuracy, assisted, blank, stage) through `onAttempt` after each attempt and through `onStage` when the stage changes. The notes panel holds the latest snapshot and stamps a note with it when added. `lib/lab/notes.ts` is pure: stamp, format as plain text, storage helpers with try/catch for blocked storage.

### D5. The copy is plain text
One block: device line (browser, recogniser support), student, the notes in order with their stamps, then the attempt log as a short table. Plain text so it pastes anywhere and reads without a tool.

### D6. Address values only choose setup
`?student=short|mixed|long`, `?startAt=0..3`, `?expert=1` set the initial choices. Anything else is ignored. They change nothing the page could not do by clicking. Expert mode is open in the lab from the start (as in an unlock-all course), so `?expert=1` and the switch both work without first reaching the top level.

### D7. Reachability and cost
No link from anywhere, `robots: noindex` in the page metadata, like the other labs. It is a public address, so the page states that transcription is real and paid, and the existing cost router limits apply (no profile, so only the global limits). *Alternative:* require a secret in the address. Rejected for now: the other labs have none; revisit if the cost report shows strays.

## Risks / Trade-offs

- **`lab` branches inside the screen add paths to a screen being tested** → they are few and guarded by one prop, and a test asserts that `lab` makes no request to the attempt, response or profile routes.
- **Local progress can make a repeat run feel different from a first run** → Start again and the address values exist for that reason.
- **Real transcription costs money per attempt** → stated on the page; the router caps it.

## Migration Plan

No database or API change. Ship the page; remove it later by deleting the folder.

## Open Questions

- Should the lab also offer the tour's Pretend button (no microphone) for use on a laptop without a headset? Default: no, so the real path is what gets tested. Say if you want it.
