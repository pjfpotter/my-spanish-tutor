## Context

The home screen (`app/components/Desktop.tsx`) is a stack of "windows" with file-style titles: `test.exe`, `reminder.exe`, `start.exe`, `steps.exe`, `desktop.exe`, `get-started.exe` and a Spanish-titled `preguntas` box of question "files" that fade from static. A separate `/progress` page holds own history, "best saying" scores and a class goal. Tele (the tutor) already sits in a painted room with a checkerboard floor and drifting clouds, and the nickname is a grey `<p>` above the windows.

Mastery today means three correct unassisted answers across at least two distinct session ids (`DEFAULT_MASTERY = { successes: 3, sessions: 2 }` in `lib/mastery/mastery.ts`). A session is one visit with a 30-minute idle gap (`lib/session/session-id.ts`), so the rule is "two visits", not strictly "two days". Automate has the same shape (`DEFAULT_AUTOMATE.readySessions: 2` in `lib/automate/window.ts`). The UI turns this into "come back tomorrow" messages (`Understand.tsx:298`, `Memorise.tsx:484`) and hides `laterSession` items from the queue.

The existing starting-point check already writes `baseline_results`, and `knownAtStart()` already counts proven questions as understood in `progress.ts`, so a test-out needs no new storage. Memorise opens when at least one answer is confirmed and every question is understood (`lib/phases/gate.ts`); that stays.

## Goals / Non-Goals

**Goals:**
- A home screen where every window says what it is for, in plain English, with no `.exe` titles.
- One obvious next action ("What's next?") and one clear picture of progress ("What I can do").
- A last-minute student can complete every step in one sitting.
- Delete the half-built features cleanly (My progress, history, class goal, reminder, start.exe, `/baseline`).
- No new stored data, no migration, no language-model calls in the practice loop.

**Non-Goals:**
- A reminder feature, a class goal or any cross-student total (deferred past version one).
- A test-out for Memorise or Automate.
- Changing the gate rules (Memorise and Automate unlock conditions) or the tutor's validated mouth animation values.
- Teacher-authored topic labels for can-do statements (version one uses the question's English meaning).
- Any change to coin amounts or the streak and shop windows.

## Decisions

**1. Remove the session gate by changing defaults, not deleting the concept.**
Set `DEFAULT_MASTERY.sessions` and `DEFAULT_AUTOMATE.readySessions` to 1, keep the config fields, and stop special-casing `laterSession` in the UI (remove the "come back tomorrow" copy and the queue filter). `needsLaterSession` then returns false for every real state and can be deleted with its callers. `masteryFraction` is simplified to success progress only.
*Why:* the specs say thresholds are configurable, the schema already stores `distinct_sessions`, and mastery is re-evaluated on read, so students who already have three successes in one session become mastered immediately with no data change. *Alternative:* delete the sessions field and column. Rejected: a migration and wider diff for no student benefit, and it would remove the option of a teacher-set threshold later.

**1b. The live Memorise step is the ladder, and it carries the day rule too.**
`lib/memorise/ladder.ts` has a final "Next-day check" lesson that opens only when `day > wipeDay` (`lockOpen`), `memorisedNow` requires clean answers on at least two distinct days, and `ladder-store.ts` maps each UK day to one mastery session so the database agrees. Change: `lockOpen` is always true, the lesson becomes a same-sitting "Final check" (still a cold start, an order tap and a clean whole-answer from memory), `memorisedNow` is three clean from-memory answers regardless of day, and the day is no longer used as the mastery session. The `wipeDay`, `recalls` and `day` fields stay in the stored shape so saved progress still loads. *Why keep the lesson:* it is a useful cold retrieval check and removing the stage would shift stage indexes in saved `memorise_ladder` rows.

**2. The test-out is the existing baseline, moved inside Understand.**
Reuse `Baseline.tsx`, `/api/baseline`, `saveBaseline` and `knownAtStart`. Understand opens with two choices, "Already know these? Try the quick check" and "Start learning", while the student has no baseline rows and nothing understood yet. After that it stays reachable as a small link. Delete the `/baseline` route and the home-level `baselineDone` prop. The `'post'` stage in `BaselineStage` stays untouched.
*Why:* `progress.ts:53` already counts proven questions as understood for the gate, so no gate or data change is needed. *Alternative:* a new `test_outs` table. Rejected: duplicates `baseline_results`. *Risk:* the check is multiple choice, so a lucky guess skips a question; accepted because those questions return in Write, Memorise and Automate.

**3. "What's next?" is a pure function.**
`nextStep({ states, progress, last, hasActivity })` in `lib/planner/next-step.ts` returns `{ step, sentence, href, label }` using the ordered rules in the home-screen spec. `last` is the step and time of the student's most recent attempt, from one new query on `attempts` (`order by created_at desc limit 1`) added to `loadHome()`. `hasActivity` is true if there is any attempt or any baseline row, so a student who only did the quick check is not shown "first session" again. It uses `phaseStates()` for what is open, so it cannot suggest a locked step. The sentence is stock English text with the step names filled in; the tone follows the project rules (encouraging, one thing). `readiness.ts` keeps the percentage and loses `nextAction`, which `nextStep()` replaces.
*Alternative:* extend `readiness().nextAction`. Rejected: it has no notion of "last time" and is tied to the meter.

**4. "What I can do" is computed per question from data that already exists.**
A `loadCanDo()` helper returns, per question, four states. "Got it" means the step is complete for that question: Understand mastered or proven, Write answer confirmed, Memorise mastered, Fast meeting the accuracy and time target. "Getting there" means some stored progress on that step that is not yet complete (some qualifying successes, an unconfirmed answer, a memorise attempt, an automate attempt). Otherwise "Not yet". Sources are `loadMastery(db, profileId, phase)`, the `answers` table (`confirmed_at`), and `loadAutomateState().sessionsMet`. Rows render as a list with an icon plus a word per tick, never colour alone, and the header shows "N of M ready" as whole numbers. Statement text is the question's English meaning. The static overlay and `clarityWord` are deleted along with `channelClarity`.
*Alternative:* a progress bar per question. Rejected: it loses the four-step structure the app is organised around.

**5. Steps order is a one-line change plus its consumers.**
`PHASES = ['understand', 'write', 'memorise', 'automate']` in `gate.ts`. The gate logic is keyed by id, not by position, so behaviour is unchanged. Update the diagram comment, `ACTIONS` ordering where it matters, and any Playwright test that clicks by position.

**6. The greeting is a small component inside `.desktop-tele`.**
A `Greeting` renders a nameplate with the nickname and a time-of-day line ("Good morning / afternoon / evening, {nickname}") over a soft dusk-sky strip. Time of day comes from the device clock after mount; the server render and the first client render use a neutral "Hello" to avoid a hydration mismatch. A drifting cloud and a few stars are CSS-only and removed under `prefers-reduced-motion: reduce`. Colours are tokens that work in light and dark. It reuses the existing painted-room look so it feels like part of Tele's world, and stays calm: no faces, no flicker, no sound. The frontend-design skill is invoked first and its plan written to `docs/design-direction.md`, as CLAUDE.md requires.

**7. Titles are plain English and listed in one place.**
Window titles move to a single constants object used by `Desktop.tsx` and the screens that still use `Win`, so none are scattered. A unit test fails if any title contains `.exe` or a non-English word.

**8. Removals are deletions, with tables left alone.**
Delete the files listed in the proposal and their tests. No table is dropped: `baseline_results`, `mastery` and `attempts` are all still used. Remove the localStorage keys `planner:prefs` and `planner:reminder-shown` with a one-time `removeItem` on load so they do not linger on shared school devices.

## Risks / Trade-offs

- **Weaker evidence of mastery from one sitting** → three unassisted correct answers are still required, items still return at spaced intervals inside the session, and each question is met again in Memorise and Automate. The threshold stays configurable.
- **Existing students jump ahead** (those with three successes in one visit become mastered) → intended, and `payAnswerValue` pays any newly earned coins on the next answer, so no coin logic changes.
- **A lucky guess in the quick check skips a question** → accepted; the question returns in later steps.
- **"What I can do" can overclaim "Got it"** (a student passes Understand, then forgets) → it reports completed steps, not retention, and the wording stays "Got it" per step, not "I know this".
- **Memorise and Automate "Getting there" depends on what attempts are stored per question** → implementation checks the existing per-question data first; if a step lacks per-question data, that tick falls back to the whole-course state.
- **Dreamy styling reads as unsettling to anxious students** → calm palette, no faces or flicker, reduced motion honoured, and the design plan is reviewed on a phone before building more.
- **Spec drift:** the base specs live in the unarchived `ks3-spanish-speaking-tutor-v1` change, so these deltas name capabilities from there. Archive order matters: sync this change after, not before, that one, and update the Purpose lines that mention "separate sessions".

## Migration Plan

1. Ship the code with no database change. Existing mastery rows are re-evaluated against the new default on read.
2. Remove the reminder keys from device storage on first load.
3. Rollback: revert the commit. Nothing was written in a new shape, so old and new code read the same tables.

## Open Questions

- Should the coin share for "effort across sessions" (`EFFORT_SESSIONS` in `lib/coins/answer-value.ts`) stay? It rewards spreading practice over several visits but blocks nothing. Left unchanged unless you want it removed too.
- Tap-to-continue on a "What I can do" row: does each step page accept a focus on one question (Memorise has `focusIds`)? If not, version one opens the step and the per-question focus is a follow-up.
- Should the quick check ever be offered again once the student has started learning? The plan leaves it as a small link; say if you would rather it disappear.
