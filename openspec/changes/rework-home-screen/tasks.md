## 1. Remove the multi-session gate

- [x] 1.1 Set `DEFAULT_MASTERY.sessions` to 1 in `lib/mastery/mastery.ts`; simplify `masteryFraction` and delete `needsLaterSession`
- [x] 1.2 Set `DEFAULT_AUTOMATE.readySessions` to 1 in `lib/automate/window.ts`
- [x] 1.3 Remove the `laterSession` field, queue filters and the hard-coded `>= 3` check in `app/phases/understand/*`, `app/phases/memorise/Memorise.tsx`, `lib/memorise/store.ts`
- [x] 1.4 Remove the "come back tomorrow" copy in `Understand.tsx` and `Memorise.tsx`; replace with a plain "Nice work, that is all of them" style message
- [x] 1.5 Update unit tests in `lib/mastery`, `lib/automate`, `lib/progress/progress.test.ts`, `lib/coins/answer-value.test.ts` so one session can master, memorise and automate
- [x] 1.6 Add a Playwright test that a single session takes a student through Understand, Memorise and Automate to "test ready"
- [x] 1.7 Memorise ladder (`lib/memorise/ladder.ts`): make the last lesson always open (rename "Next-day check" to "Final check"), and count an answer as memorised after three clean from-memory answers whatever the day
- [x] 1.8 Memorise ladder copy and UI (`MemoriseLadder.tsx`, finish messages in `ladder.ts`): remove "opens tomorrow", "A night's sleep" and "comes back tomorrow" wording and the lab's "Skip to tomorrow" button
- [x] 1.9 `lib/memorise/ladder-store.ts`: stop using one mastery session per UK day (`ladderSessionId`) as a gate and update its comments; keep the database and the ladder agreeing on when an answer is memorised
- [x] 1.10 Update `ladder.test.ts`, `ladder-answers.test.ts` and `ladder-store.test.ts` so an answer is memorised in one day, and add a test that no lesson is ever in a "wait" state

## 2. Remove unwanted features

- [x] 2.1 Delete `app/progress/`, the My progress button in `Desktop.tsx`, `lib/progress/history.ts`, `lib/progress/class-goal.ts` and their tests
- [x] 2.2 Delete `ReminderWindow`, `lib/planner/reminders.ts` and its test; add a one-time removal of `planner:prefs` and `planner:reminder-shown` from device storage
- [x] 2.3 Remove the start.exe window, the `baselineDone` prop and its `lib/server/home.ts` field
- [x] 2.4 Update `tests/desktop.spec.ts`, `tests/section-nav.spec.ts`, `tests/diagnostics.spec.ts` and any other test that visits the removed screens
- [x] 2.5 Confirm nothing else imports the deleted modules (typecheck and lint pass)

## 3. Step order

- [x] 3.1 Change `PHASES` to Understand, Write, Memorise, Automate in `lib/phases/gate.ts` and update its diagram comment
- [x] 3.2 Check consumers of the array order (Desktop list, phase router, `readiness.ts`, tests) and fix any that rely on position
- [x] 3.3 Add a gate unit test that Write and Understand are open on a fresh profile and that unlock rules are unchanged

## 4. Test-out inside Understand

- [x] 4.1 Move the check from `app/baseline/Baseline.tsx` into the Understand phase as a "Quick check" with "Already know these? Try the quick check" and "Start learning" choices
- [x] 4.2 Use plain-English wording on the results screen ("worth a listen", never "wrong" or "failed") and end on a next step with a way back to the desktop
- [x] 4.3 Keep `/api/baseline`, `saveBaseline` and `knownAtStart`; delete the `/baseline` route and page once nothing links to it
- [x] 4.4 Keep a small "Take the quick check" link while the student has no baseline results
- [x] 4.5 Playwright test: all correct marks Understand done; some wrong practises only those; a student with older baseline results keeps their skips
- [x] 4.6 Confirm Memorise has no test-out

## 5. What's next?

- [x] 5.1 Write `nextStep()` in `lib/planner/next-step.ts` with the ordered rules from the home-screen spec, using `phaseStates()` so it never suggests a locked step
- [x] 5.2 Add the most-recent-attempt query (step and time) and `hasActivity` (any attempt or any baseline row) to `loadHome()`
- [x] 5.3 Unit-test every rule, including first session, quick check only, Understand unfinished, Write next, Memorise, Automate, all done, and the locked-step guard
- [x] 5.4 Build the "What's next?" window: one sentence, one button, English only, one thing to do
- [x] 5.5 Remove the "Next:" line and `nextAction` from the speaking-test window and `readiness.ts`; keep the percentage and countdown

## 6. What I can do

- [x] 6.1 Check what per-question data exists for Write (confirmed answers), Memorise (mastery) and Fast (`sessionsMet` and automate attempts); fall back to a whole-course tick for any step without it
- [x] 6.2 Write `loadCanDo()` returning four states per question: Not yet, Getting there, Got it
- [x] 6.3 Unit-test the state rules per step, including that a failure never lowers a tick and a recognition failure is never penalised
- [x] 6.4 Build the "What I can do" window: English statement per question, four labelled ticks with icon plus word, "N of M ready" count, complete marker, no percentages, no colour-only states
- [x] 6.5 Make each row link to the question's next unfinished step (focus on the question if the step page supports it)
- [x] 6.6 Delete the static-overlay file icons, `clarityWord`, `channelClarity` and the `preguntas` window and its CSS

## 7. Window titles

- [x] 7.1 Put all home-window titles in one constants object and use it in `Desktop.tsx` and `Planner.tsx`
- [x] 7.2 Rename `test.exe`, `steps.exe`, `desktop.exe`, `get-started.exe` and any other `.exe` or Spanish title to plain English
- [x] 7.3 Add a unit test that fails on any title containing `.exe` or a non-English word
- [x] 7.4 Sweep the interface for other Spanish labels outside learning content and give them English or an English translation

## 8. Nickname greeting

- [x] 8.1 Invoke the frontend-design skill and write the dusk-sky greeting plan (palette, type, layout) into `docs/design-direction.md`
- [x] 8.2 Build a `Greeting` component inside `.desktop-tele`: nameplate, time-of-day line from the device clock after mount, neutral "Hello" on server render
- [x] 8.3 Add the dusk-sky strip with a CSS-only drifting cloud and stars; stop all motion under `prefers-reduced-motion`
- [x] 8.4 Check light and dark themes, visible focus, the 360 by 640 viewport and the old Chromebook, and that it reads as calm rather than eerie
- [x] 8.5 Remove the grey "Hi, {nickname}" paragraph; show nothing for a signed-out visitor
- [x] 8.6 Playwright test for the greeting text and for no animation under reduced motion

## 9. Docs and specs

- [x] 9.1 Update `docs/PRD.md`, `docs/api-map.md`, `docs/technical-documentation.md` and `docs/design-direction.md` for the removed and new screens
- [x] 9.2 Update `docs/dpia.md`: the class goal was the only cross-student aggregate, and reminders no longer use device storage
- [x] 9.3 Run `openspec validate rework-home-screen` and fix any delta errors
- [ ] 9.4 At archive time, update the Purpose lines in the affected specs that mention "separate sessions" and sync after `ks3-spanish-speaking-tutor-v1`

## 10. Final checks

- [x] 10.1 Typecheck, lint and the full unit and Playwright suites pass
- [ ] 10.2 Walk through on a phone viewport: first visit, quick check, one-sitting run through all four steps, signed-out view
- [x] 10.3 Confirm no model calls were added to the practice loop and no new data is stored
