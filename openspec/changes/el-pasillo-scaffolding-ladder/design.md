# Design

## Context

See proposal.md. Observed in code:

- `lib/dreamcore/doors.ts` models six rungs (`Rung` 1 to 6). `buildRun` makes `RUN_LENGTH = 12` doors, `DOORS_PER_RUNG = 2`. Rung 3 shows first letters of one chunk, rung 4 empty blocks, rung 5 the English clue, rung 6 the Spanish question with no help. `plaqueOf` and `masked` in `DreamcoreGame.tsx` render per rung.
- The run ends when `doorIndex >= doors.length` (`escaped = true`), or when caught. Only `rung === 6` doors with an `itemId` post to `/api/respond`, and `buildRun` sends rung 6 doors to `unmet` questions.
- `closingRate(doorIndex)` rises linearly without a cap, which was fine for twelve doors.
- The memorise step already teaches with fading help; this ladder is the pressure version of the same idea.

## Goals / Non-Goals

**Goals:** a run whose help fades by stage, an open-ended last stage, an escape tied to unassisted no-help doors, same recording and privacy as today.

**Non-Goals:** new art, sound design or monster; the heavenscape visual; changing mouth animation constants (CLAUDE.md); changing scoring or matching; remembering stage progress across runs.

## Decisions

1. **Rename rungs to stages and keep five.** `Rung` becomes `Stage = 1..5`. The old 3 (first letters of a chunk), 4 (empty blocks) and 5 (English clue) are retired; the English clue stage also goes because English is subtitle-only. Alternative: keep six and insert stages. Rejected: the owner's ladder has five, and more doors before the real test skill dilutes the run.
2. **Fixed prefix plus open tail.** `buildRun` returns the eight fixed doors (two per stage 1 to 4); the stage 5 doors are drawn lazily by a new `nextNoHelpDoor(answers, unmet, rng, previous)` as the student clears them, so the run length is not fixed. Stage 5 picks from `unmet` questions first, never the same question twice running unless only one is left.
3. **Whole answer at stage 2, first chunk at stage 4.** Stage 2 uses all of `firstSentence(a)` (not a two-bit slice), so it is the whole first sentence, never a long paragraph. Stage 4 shows `firstSentence(a)[0]` and hides the rest, using the same word masks as the memorise ladder where possible.
4. **Letters mask with last letter.** New `firstLast(text)`: first letter, dots, last letter per word, e.g. "Me encantan" becomes "M. e.....n". One-letter words stay whole. Stage 3 matching is unchanged: the live matcher still lines up against the full bits.
5. **Playing the question.** Stage 3 to 5 call the existing tutor audio for the question (the same clip source the hear and memorise screens use) and expose a Replay button. If no clip or sound, show the Spanish question text. Open check at the start of apply: confirm which clip source `MemoriseLadder` uses and reuse it; if there is none for rung-6 style questions, play via the same path the hear step uses. No new voice or paid call.
6. **Escape counter.** State holds `clean`, the count of stage 5 doors cleared with `!assisted` and not skipped. `ESCAPE_AFTER = 3`. Skip and Show me still let the student through the door (never trap them), they just do not count. Pure helper `escapeEarned(clean)` and `countsAsClean(door, assisted, skipped)` for unit tests.
7. **Cap the closing rate.** `closingRate(i)` uses `min(i, CAP_INDEX)` with `CAP_INDEX = 11`, the index of the last door under the old twelve-door run, so tuning at the point owners already played is unchanged and later doors are no worse.
8. **Result screen.** `Outcome` gains `stage`. `step-copy.ts` holds a one-line suggestion per stage reached (for example, "Try hearing the question before you read the answer"). At most one suggestion, effort-first. Souvenir logic in `rewards.ts` is unchanged apart from reading the stage for the line.
9. **Starts at stage 1 every run.** No saved stage. Alternative: resume at the furthest stage. Deferred: it needs a device record and a decision on how a student gets help back; see the open question.

## Risks / Trade-offs

- [A student stuck on stage 5 loops forever and gets bored] → The chase can still catch them and they wake with a souvenir; Show me and skip always let them through, so a run can always end. The closing-rate cap keeps it fair.
- [Skipping and Show me let a student reach the end without doing anything] → They cannot escape without three clean no-help doors, and readiness already ignores assisted attempts.
- [Question audio is slow or fails on a school Chromebook] → Text fallback shown, door still playable.
- [Existing tests assume twelve doors and rung ids] → Updated in the same task group as the code.
- [Mouth and audio code is validated] → Not touched.

## Migration Plan

No data change. Existing attempts stay valid. Deploy with the usual release; rollback by revert. Saved souvenirs in `localStorage` are unaffected.

## Open Questions

- Should a returning student resume at their furthest stage rather than stage 1? Default for now is stage 1 each run; this can change without altering the specs here.
