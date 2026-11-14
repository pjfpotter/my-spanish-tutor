# Game-mode proposals for memorise and automatise (task 25.5)

For the owner to approve. **Nothing here is built, and nothing will be until you say which, if any.** (Design D19: a game is a proposal first.) Written 13 Nov 2026.

## Rules every proposal has to meet

From `CLAUDE.md` and the specs. A proposal that breaks one is not offered.

- No hearts or lives, no public ranking of students, no real-money payments, no streak-loss threats.
- Effort and improvement are rewarded, not only correct answers. A recognition failure or noise is never held against the student.
- Scores come from rules, not a model. The practice loop makes no language-model calls and no new paid calls.
- The tutor never speaks English. Original characters only (Tele and the world around it).
- No new personal data. Everything is numbers on the profile, or lives on the device.
- Light enough for a phone and an old school Chromebook, and the game never replaces the practice: play stays a reward for practice or happens inside it.

## What exists to build on

The memorise ladder (five levels of help, lessons, a progress bar, words that light as they are heard), the timed round (response-time window, chunk ladder, rank from Caracol to Gato, personal bests on the device), the euro ledger and shop, the combo moment at five in a row, and Tele's reactions.

## Memorise

### M1. Clear the static (recommended)

Each answer lives behind a patch of TV static on Tele's screen. Every lesson step you finish clears part of it; a memorised answer shows as a clear picture on the answer list. It is the ladder's progress shown as a picture instead of pips.

- **Play.** No new task. The existing steps drive it, so the game cannot be played instead of practising.
- **Effort reward.** Static clears on finishing a step, whatever the score, and fades back slightly overnight if an answer is not revisited (it never goes to zero, and the copy says what the student has, not what they could lose).
- **Cost.** One canvas or CSS layer on the answer list and lesson header. No new data: the stage and top level already stored per answer decide the picture.
- **Risk.** Low. Purely visual. Calm mode and reduced motion simply show the clear and unclear states without animation.

### M2. Say it before the signal drops

A timed bit-by-bit challenge on an answer the student already knows: each bit is a station that fades in over a few seconds and has to be said to keep it. Misses never cost anything; they just leave that station fuzzy.

- **Reward.** Euros for each station tuned, plus a smaller amount for trying a missed one again.
- **Concern.** It adds a clock to the memorise phase, which the feedback so far (a hint after a pause, never a timeout) has pushed away from. Not recommended before the automatise timer has been tested with students.

## Automatise

### A1. Beat your own ghost (recommended)

A pale marker on the answer window shows your previous best start time for that question. Start speaking before it and the marker is left behind; the rank and personal best already stored decide where it sits.

- **Play.** Fits the existing round: nothing new to learn.
- **Effort reward.** A new personal best already earns a combo-style moment. Add a smaller moment for a faster-than-last-time attempt that is still below the best, so improvement is seen as well as records.
- **Cost.** Reads `best-ms` from the device store, which already exists. No server change. No comparison with anyone else.
- **Risk.** Low. A student who is slower than their ghost must not feel punished: the marker is hidden after a blank or a hint, and the copy never says "slower".

### A2. Class signal strength

A single bar for the whole class, filled by the total number of answers attempted that week, shown on the teacher overview and on each student's desktop as a weather icon beside Tele ("Señal fuerte"). No names, no per-student numbers.

- **Why.** A shared goal without a public ranking, and the teacher gets a cheap engagement number.
- **Cost.** One aggregate query the overview already nearly makes. A tiny desktop element.
- **Risk.** Medium. A class that practises little sees a weak signal, which can read as blame. Needs the owner's call on tone, and a rule that a quiet week shows "waiting for signal" and not a failure.

### A3. Channel surfing (not recommended now)

Questions arrive as channels flicking past; tune in to the one that matches what was just asked. A multiple-choice game over the same questions.

- **Concern.** It is a Blooket-style game with no speaking, and speaking is the point. It would also need new task components and tests. Left for after the test date.

## Recommendation

Build **M1 (clear the static)** and **A1 (beat your own ghost)** if time allows. Both are small, visual or cosmetic, reuse stored numbers, add no data and no cost, and reward effort. Hold **A2** for a conversation about tone. Do not build M2 or A3 before Tuesday.

## What I need from you

Which of M1, A1, A2 (if any) to build. Nothing else is blocked on this.
