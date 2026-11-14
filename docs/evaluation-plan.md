# Evaluation plan (task 25.2)

How each success criterion in `openspec/changes/ks3-spanish-speaking-tutor-v1/proposal.md` is answered, from what evidence, and what is still missing. Status is as of 13 Nov 2026. No criterion has been answered yet: the only users so far are the owner and Dolores in informal sessions (`docs/user-testing-notes.md`), so every "Result" below is blank on purpose. Fill it in after the user testing session; do not write a result the evidence does not support.

## Evidence sources

| Source | What it holds | How to get it |
|---|---|---|
| Observation notes | What a child did, in the tester's words. No audio, no video, no names | `docs/user-testing.md` is the script; notes go in `docs/user-testing-notes.md` |
| Short questions after a session | Five questions at the end of `docs/user-testing.md`, answered by the child | Same notes file, one line per question |
| Attempt events | Every attempt with phase, outcome, accuracy, response time, session and date, numbers only | The `attempts` table; the teacher overview reads it. Return days and trends come from its `created_at` and `session_id` |
| Cost log | Every paid call with service, estimated cost, course and refusals | `npm run cost-report -- <class code>` and the cost figure on the overview |
| Teacher interview | One teacher, using the owner link and the demo | Questions below |
| Demo mode | The same app with sample data and no sign-up | `/demo`, so a teacher can try it without a class |

## Criteria

### 1. Is it more engaging than what exists now (Blooket, flashcards, worksheets)?

- **Evidence.** Observed behaviour (opens the app unprompted, keeps going after the first task, returns to practice from the shop or the desktop), plus attempt events for returns on separate days. Comparison is the child's own words about what they use now, collected with the question "Would you open this on your own? When?" and one added question: "What would you use instead tonight?"
- **Measure.** Share of testers who return on 3 or more separate days (PRD target: at least half). Share of session time spent hearing and speaking (PRD target: over 80%).
- **Limit.** Two weeks and a handful of children cannot show that it beats Blooket. The honest claim is whether it holds attention without being told to.
- **Result.** To fill in.

### 2. Would a high-ability student who currently does not revise (Dolores) actually revise with it?

- **Evidence.** Dolores's unprompted use between sessions (attempt events for her profile only), and what she says in the final five questions.
- **Measure.** Did she open it on days without a prompt, and how many answers reached memorised.
- **Limit.** One student. Report as a case, not a rate.
- **Result.** To fill in.

### 3. Would that student aim higher with it?

- **Evidence.** In the writing phase, whether the answer she confirms uses more features than the first thing she built (the tester writes down the first draft as it appears on screen, because only the latest saved answer is stored), and whether she took the one-optional-extra nudge. Also her own words.
- **Measure.** Feature value (from the rubric) of the confirmed answer against the observed first draft, per question.
- **Limit.** Value is what the rubric counts, not what a teacher would mark.
- **Result.** To fill in.

### 4. Is it simple, fast and reliable for a class teacher, and does it make sense to them?

- **Evidence.** A teacher given only the demo link and the owner link, asked to find: how many students have started, which question is hardest, how much it costs. Timed observation, no help. Reliability from the device matrix (`docs/device-matrix.md`), the performance budget (`docs/performance-budget.md`) and the Playwright suite on the phone and Chromebook profiles.
- **Measure.** Tasks completed unaided out of three; time to each; any step they could not do.
- **Limit.** The setup steps are run by the developer (`docs/teacher-flow.md`), so "simple for the teacher" is currently only true of using the overview, not of setting up a course.
- **Result.** To fill in.

### 5. Does it save the teacher work rather than create it?

- **Evidence.** The teacher flow table in `docs/teacher-flow.md` lists what the teacher does: supply the course, share a code, read the overview. Everything else is done for them. Teacher interview question: "How long would this take you each term, and what would you stop doing?"
- **Measure.** Teacher's estimate of minutes per term against their current revision handouts and marking.
- **Limit.** Today the developer does the work, so the saving is a design claim until a teacher-facing setup exists (23.4, on hold).
- **Result.** To fill in.

### 6. Is it cost-effective as a cheap subscription?

- **Evidence.** Measured cost per student from the cost log, with the breakdown by tier (build once, per course, per student). The practice loop makes no language-model calls, and a test fails if one is added.
- **Measure.** `npm run cost-report -- TELE8` after the pilot: total, students, cost per student, refusals. Audio build for the current voice was about £0.65 in total (build log, 13 Nov).
- **Expected finding, recorded as honest.** Likely no for Key Stage 3 alone, because a teacher runs about two such tests a year and nobody is held to the results. The case needs Key Stage 4 external speaking-exam preparation, which reuses the same machinery. This is a finding, not a goal of version one.
- **Limit.** Prices in the cost router are estimates, not invoices. State that beside every figure.
- **Result.** To fill in with the real figure from the cost log.

## Other claims the presentation makes

| Claim | Where it is evidenced |
|---|---|
| No names, emails or recordings stored | `docs/dpia.md`, the delete-everything test, and the route list in `docs/api-map.md` |
| Scores come from rules, not a model | `lib/speech/score.ts`, and the no-model-in-practice test |
| A recognition failure is never held against the student | Capture-judgement tests and the "unclear" path |
| Works on a phone and an old school Chromebook | `docs/device-matrix.md` (Android lab run recorded; iPhone and Chromebook still to run) and `docs/performance-budget.md` |

## After the session: filling this in

1. Copy observation notes into `docs/user-testing-notes.md` under a dated heading.
2. Run the cost report and paste the output beside criterion 6.
3. For each criterion, write one sentence that says what the evidence showed and how sure you are, then delete "To fill in".
