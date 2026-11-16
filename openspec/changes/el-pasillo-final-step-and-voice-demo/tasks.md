## 1. Chase rules (pure logic)

- [x] 1.1 Add `fear(gap)` and `lookChance(gap, secondsSinceLast)` to `lib/dreamcore/chase.ts`; replace `wantsLookBehind`. Verify with unit tests in `lib/dreamcore/dreamcore.test.ts`: fear at gap 0.3 is at least 3x fear at 0.7; look chance at 0.2 is at least 5x at 0.9; zero inside the cooldown.
- [x] 1.2 Make `tick` slow only for matched progress: change the `trying` input meaning and document it. Verify with a unit test that a run of unmatched voice closes at the full rate and a matched word slows it for 2 s.

## 2. El Pasillo gameplay

- [x] 2.1 In `DreamcoreGame.tsx`, drive `trying` from `lastProgress`, keep `onVoice` for the mic indicator only. Verify with the e2e fake speech source: noise-only keeps the meter falling at the full rate.
- [ ] 2.2 **Implemented 16 Nov; the screenshot check at three gaps and the phone feel check are still to do by hand.** Drive shake, glitch, flicker and heartbeat tempo from `fear(gap)`. Do not touch mouth constants. Verify by a screenshot at gaps 0.8, 0.5 and 0.2 on the phone profile, and by the reduced-motion test staying minimal.
- [x] 2.3 **Unit tested; no e2e, because the roll is random by design.** Roll the automatic look-behind each frame with `lookChance`, off under reduced motion, keeping the manual toggle. Verify with a seeded-random unit test of the roll and an e2e check that a look starts by itself at low gap.
- [ ] 2.4 **Tuned on paper only (closing rate 0.018 + 0.0045 per door, see `chase.ts`); the owner's play-through is still to do.** Play-through tuning on the dev server: a student who says everything correctly should clear a run, and one who only makes noise should be caught. Verify by recording both in the notes and adjusting constants in `chase.ts` only.

## 3. Final step wiring and readiness

- [x] 3.1 Carry `itemId` on each `Door` in `lib/dreamcore/doors.ts`. Verify with a doors unit test.
- [x] 3.2 Record each cleared top-rung door through the existing `/api/respond` route (no new route: it already calls `recordResponse` with validation and stores numbers only), and send the last doors to questions that have not met the target (`unmet`). Verify with `tests/pasillo-step.spec.ts`: a full run posts exactly two unassisted attempts with numbers only.
- [x] 3.3 Render El Pasillo from `app/phases/automate/page.tsx` with the student's answers, keeping the gate redirect and `NothingToPractise`; post the run summary at the end. Keep the old round at the unlinked `/phases/automate/round`. Verify: `gate.test.ts` and `gate-callers.test.ts` pass, and an e2e on the testing course clears a door and the desktop shows the step progressing.
- [x] 3.4 Rename the desktop step to El Pasillo with its one-line description and update `window-titles`. Verify with the existing desktop tests updated.
- [x] 3.5 Keep `/lab/dreamcore` working as a standalone page that records nothing. Verify by loading it signed out.

## 4. Demo rebuilt around real voice

- [x] 4.1 Reuse the real memorise ladder, El Pasillo (with an `exit` link prop) and the sample-data screens in the demo. Verify with the demo e2e asserting no write requests.
- [x] 4.2 Remove "Pretend" from the stops; add the labelled no-microphone fallback keyed on the speech hook state. Verify: unit test of the fallback condition and an e2e with a fake speech source that says an answer and sees words light up.
- [x] 4.3 Rewrite the demo hub as the journey explainer (the test, the problem, four steps each with a why line, one "Start with your voice" button that requests the mic). Verify by reading it cold at 360 by 640 and checking `expectFits`.
- [x] 4.4 Update `lib/demo/stops.ts` to Hear, Memorise, El Pasillo, Meet Tele, Rewards, Teacher (the hub is the journey), and update `DemoBar` and the stop tests. Verify with the stop unit tests and a click-through e2e.
- [x] 4.5 Rewrite `docs/demo-script.md` to match. Verify by a dry run on a stopwatch.

## 5. Microcopy pass

- [x] 5.1 Create `lib/ui/step-copy.ts` with what, why and next for the welcome screen, the desktop and each of the four steps' openings, and a unit test that no field is empty or over the length limit. Verify with the test.
- [x] 5.2 Use it on the welcome screen, the desktop step list (a why line under each step) and El Pasillo's title card. The openings of the Understand, Write and Memorise screens are not rewritten in this change. Verify with screenshots at phone size and the updated e2e text assertions.
- [x] 5.3 Locked and empty states say why and what unlocks them. Verify with the existing locked-step tests updated.

## 6. Docs

- [x] 6.1 **Links and live URL checked; the screenshots are not added yet.** Rewrite `README.md` for a reader outside education: the problem, the four steps, the privacy and no-model-in-practice design, cost per student, stack, live link, demo link, run instructions, screenshots. Verify by having every link and command checked.
- [x] 6.2 Write `docs/roadmap.md` with the postponed items and the reason, the order and Dolores's findings: scaffolding ladder, ghost-whisper pronunciation aid, scarier monster and sound, doubled assets, heavenscape escape, test simulation mode, GDPR-safe high scores and class table. Verify it is linked from the README.
- [x] 6.3 Update `ks3-spanish-speaking-tutor-v1/tasks.md` in the same commit: tick what this change completes, record 29.8 as decided (demo rebuilt), mark 29.4 as superseded. Verify the diff.

## 7. Release check

- [ ] 7.1 Run `npm run typecheck`, `npm test`, `npm run test:e2e`; fix failures. Verify all green.
- [ ] 7.2 Deploy to production and check the live URL: welcome, join with a testing code, El Pasillo, and the demo with a real microphone on the phone. Verify and record in `docs/user-testing-notes.md`.
