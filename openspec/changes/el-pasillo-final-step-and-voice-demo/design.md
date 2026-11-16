## Context

See proposal.md for motivation. Current state, from the code:

- El Pasillo (`app/components/dreamcore/DreamcoreGame.tsx`, `lib/dreamcore/*`) runs at `/lab/dreamcore`, uses the student's answers when there is a profile, and keeps souvenirs in `localStorage`. The chase (`lib/dreamcore/chase.ts`) slows to 25% whenever `onVoice` fired in the last 1.5 s, which is any loud sound. This is why noise "stops the clock".
- The look-behind check runs only when `gap < 0.6`, after 14 s, with 1% per frame, and the student can also toggle it.
- The path is `understand`, `write`, `memorise`, `automate`. `automate` is done when `testReady` is true, which comes from `loadAutomateState` over `attempts` rows with `phase = 'automate'`, written by `recordResponse`.
- `/demo` has six stops under `app/demo/*`. The hear stop and the round stop use a scripted "Pretend" answer. `lib/demo/content.ts` holds sample answers.

## Goals / Non-Goals

**Goals:** make El Pasillo the real final step with harder, scarier tuning; keep readiness and the teacher overview working; make the demo use real voice on the real screens; ship README and roadmap.

**Non-Goals:** new art, new monster, new sound design, the scaffolding ladder, pronunciation aid, high scores, test simulation. No database schema change. No change to the memorise ladder or scoring rules.

## Decisions

1. **Keep the phase id `automate`, change what renders.** The gate, progress, overview, URLs and tests all key on `automate`; renaming is churn and risk a day before the deadline. Only the page and the desktop label change ("Answer fast" becomes "El Pasillo"). Alternative: rename the phase everywhere. Rejected for risk.

2. **"Trying" means matched progress.** `DreamcoreGame` already tracks `lastProgress` when `liveMatch` finds a new matched word. Pass `trying = t - lastProgress < 2.0` instead of `performance.now() - lastVoice < 1500`. `onVoice` still feeds the mic-working indicator but not the chase. Alternative: keep voice but require a minimum duration. Rejected: still gameable by humming.

3. **Escalation as one function of gap.** Add `fear(gap) = clamp((0.67 - gap) / 0.67, 0, 1) ** 1.5` in `chase.ts` and use it for shake amplitude, glitch, flicker rate and heartbeat tempo. Replaces three separate ad hoc expressions in the loop (the `fear` multiplier at gap < 0.5, the glitch term, the flicker term). Pure and unit tested. Mouth animation constants are untouched (CLAUDE.md).

4. **Look-behind chance.** `lookChance(gap, secondsSinceLast)` returns a per-second probability: 0 under a 10 s cooldown, otherwise `0.02 + 0.28 * fear(gap)`. Converted to a per-frame roll with `dt`. The look lasts about 1.6 s as now. Disabled under reduced motion. The manual toggle stays. Alternative: scripted look events per door. Rejected because the user asked for a procedural roll that rises with stress.

5. **Recording runs reuses `recordResponse`.** (Changed during apply: the existing `/api/respond` route already does exactly this per attempt, so no new route was added; the game posts each cleared top-rung door to it, and sends the last doors of a run to questions that have not met the target yet.) The original idea was a new route `POST /api/pasillo/run` that takes `{ sessionId, doors: [{ itemId, accuracy, responseTimeMs, assisted }] }` for the doors cleared in the run, validates each, and calls `recordResponse` per door. Only doors on the top rung (answer the question) count as timed attempts, because that matches what the timed round measured. Lower-rung doors are not sent. A door is assisted if Show me was pressed. Doors need the question id, so `buildRun` carries `itemId`. Alternative: new table. Rejected: schema change and a second readiness path.

6. **Demo stops reuse real components.** Each stop mounts the real component with a `demo` prop that swaps data and storage (the pattern `Automate demo` already uses): the hear screen, the memorise screen on `DEMO_ANSWERS`, the Tele poke, the rewards view, the teacher overview with sample data, and `DreamcoreGame` with `source="sample"` and no recording. The recogniser is the real `useLiveSpeech` / capture hook. The stop list becomes: Journey, Hear, Memorise, El Pasillo, Meet Tele, Rewards, Teacher. A scripted fallback appears only when the hook reports `unsupported`, `denied` or `unavailable`, and says so.

7. **Journey explainer is the hub.** `/demo` becomes a short illustrated page: the test, the problem, the four steps with a "why" line each, and one "Start with your voice" button that asks for the microphone up front, so the permission prompt is not a surprise mid-tour.

8. **Microcopy as data.** Step opening copy lives in one `lib/ui/step-copy.ts` (what, why, next) read by each step screen, so the pass is reviewable in one file and testable (no empty field, length limit).

## Risks / Trade-offs

- [El Pasillo has never been tested as the final step with real readiness] → Cover with unit tests for the recorder route and one e2e that clears a door with a fake speech source and checks an `automate` attempt row. Owner does one real phone run.
- [Making the chase harder could make it unfair for students with accented or quiet speech] → Matched words push the gap back, and recognition failure still pauses nothing but also never adds penalty beyond the base closing rate. `Show me` stays. Closing rate constants stay as they are, so this is only the removal of the free slowdown. Re-tune against the unit test for a reasonable run length.
- [Demo with real voice fails in a noisy judging room or on a browser without live recognition] → The server transcription fallback already exists. The labelled fallback keeps the tour completable.
- [Demo reusing real components drags real data access into a public page] → Components take props, demo pages read no profile, and a test asserts the demo routes make no database calls.
- [Time] → Tasks are ordered so each group ships on its own. The README and roadmap are last in the dependency order but must not be cut.

## Migration Plan

No data migration. Deploy to production from `main` once tests pass. Rollback is reverting the merge. Existing `automate` attempt rows remain valid. Students whose readiness came from the old timed round stay ready.

## Open Questions

- Exact closing-rate tuning after the free slowdown is removed. Answered by a play-through; constants live in one place.
