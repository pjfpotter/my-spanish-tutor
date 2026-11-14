## Why

The student home screen is confusing and over-built. The `preguntas` box is decoration that nobody can read, several windows (My progress, class goal, reminder, start.exe) are half-finished or outside version one, the `.exe` titles risk spooking anxious 12 to 13 year olds, and the "Hi, Snazzy Llama" line is orphaned grey text. Separately, mastery currently needs successes in two separate sessions, so a student revising at the last minute (about half of them) is told "come back tomorrow" and cannot finish. The home screen should say plainly what the student can do and what to do next, and nothing should block a student who wants to revise in one sitting.

## What Changes

- **Remove** the My progress page and its button, the own-history and "best saying" metrics, the class goal and its cross-student query, the daily reminder (window, notification code, local preferences), the start.exe window and the `/baseline` page.
- **Reorder** the four steps to Understand, Write, Memorise, Automate. Gating is unchanged: Write and Understand stay open from the start, and Memorise needs a confirmed answer and all questions understood.
- **Add a test-out inside Understand.** An optional "quick check" at the start of Understand lets a student prove which questions they already know. It replaces the start.exe placement check, reuses the stored baseline results, and applies to Understand only (there is no test-out for Memorise).
- **Add a "What's next?" window.** One sentence and one button, chosen by a rule from the student's progress and last session ("It's your first session, so learn what the test questions mean", "Last time you did X, now let's do Y"). The grey "Next:" line leaves the test window.
- **Replace the `preguntas` box with "What I can do".** One plain-English can-do statement per question, with four labelled ticks (Understand, Write, Memorise, Fast) and three states (Not yet, Getting there, Got it).
- **Rename every window title to plain English** (no `.exe`, no Spanish interface labels).
- **Add a dreamy dusk-sky greeting** for the student's nickname inside the Tele area, in place of the grey text. It respects reduced motion and light and dark themes, and is dreamy rather than eerie.
- **BREAKING: remove the multi-session mastery gate.** A question is understood, an answer is memorised and a question is automated on the accuracy and speed thresholds alone, achievable in one sitting. The "come back tomorrow" messages go. Students with existing mastery records are unaffected or advance sooner.

## Capabilities

### New Capabilities
- `home-screen`: the desktop's windows and their plain-English titles, step order, "What's next?", "What I can do", and the nickname greeting.

### Modified Capabilities
- `question-comprehension`: mastery no longer needs separate sessions; skip-by-proof becomes a test-out inside the phase.
- `answer-memorisation`: memorised no longer needs separate sessions.
- `response-automatisation`: test-ready no longer needs separate sessions.
- `learning-diagnostics`: the standalone starting-point check becomes the Understand test-out; skipping by proof is reworded to match.
- `engagement-rewards`: progress shown as "What I can do" instead of static channels; the response-time rank and class goal wording no longer refer to history or a class total.
- `revision-planner`: the daily reminder is removed; the readiness meter no longer carries the next action (that moves to "What's next?").
- `student-flow-principles`: examples that name the starting-point check are updated.

## Impact

- **Removed code:** `app/progress/`, `app/baseline/`, `lib/progress/history.ts`, `lib/progress/class-goal.ts`, `ReminderWindow` in `app/components/Planner.tsx`, `lib/planner/reminders.ts`, and their tests.
- **Changed code:** `app/components/Desktop.tsx`, `desktop.css`, `lib/server/home.ts`, `lib/phases/gate.ts`, `lib/planner/readiness.ts`, `lib/mastery/mastery.ts`, `lib/automate/window.ts`, `app/phases/understand/*`, `app/phases/memorise/Memorise.tsx`, `lib/diagnostics/baseline.ts` (kept, reused), the e2e tests under `tests/`.
- **New code:** `nextStep()` in `lib/planner/`, a "What I can do" window, a greeting component, a small query for the most recent attempt's step and date.
- **Data:** no migration. `baseline_results`, `mastery` and `attempts` are unchanged. No new data is stored.
- **Docs:** `docs/PRD.md`, `docs/api-map.md`, `docs/dpia.md` (the class goal was the only cross-student aggregate), `docs/technical-documentation.md`, `docs/design-direction.md`.
- **Dependencies:** none.
