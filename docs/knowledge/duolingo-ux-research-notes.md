# Duolingo UX Research Notes

Date: 9 November 2026
Purpose: UX research for the My Spanish Tutor app, with a focus on character interactions as an engagement tool.
Scope: One French lesson (Section 4, Unit 16, "Talk about technology", lesson 5 of 6), plus the end-of-lesson screens up to the streak-goal picker.

## Caveats
- I can't hear audio, so sound is not covered.
- I batched actions, so short auto-advancing interstitials could have been missed.
- Timings are not reliable and are not reported.
- Not tested: whether tapping a character does anything.
- The progress bar colour changes (green, gold, orange) were observed, but I couldn't work out what triggers them.

## Account side effects
- Hearts ended at 3/5. One was a deliberate wrong answer to capture error feedback; one was lost through rapid keypresses causing a wrong pair in matching (UI lag).
- The speaking exercise was skipped with "Can't speak now" (mic off for 15 minutes).
- Streak went from 0 to 1 and 14 XP was earned.
- I stopped on the streak-goal screen without choosing a goal.

## Lesson structure (19 exercises)
Order: multiple choice, word-bank translate (the most common by far), select meaning, speak (skipped), complete the chat, matching pairs, fill the blanks, tap what you hear, then one re-queued mistake.

Layout: the top bar always has an X, a progress bar and a heart count. Content sits below it (instruction title, character with speech bubble, answer area, word bank). All feedback appears in a panel at the bottom.

## Character interactions

| Where | Character present? |
|---|---|
| Single cast member with speech bubble | 13 of 19 exercises |
| Two-character dialogue ("Complete the chat") | 1 |
| Illustrated group scene (fill the blanks) | 1 |
| No character: opener multiple-choice, matching pairs, tap what you hear | 3 |

- A character appeared in about 15 of 19 exercises, consecutively from exercise 2 to 15.
- About nine distinct cast members appeared across the 13 solo exercises. Lily (deadpan, arms crossed) and Bea (the bear) each returned three times.
- The character is the speaker: the speech bubble holds the sentence and the audio button. The same character voices the same sentence across exercise types. Bea's speaking prompt returned as her translate prompt, and the exercise I got wrong came back with the same character.
- Reaction states:
  - Idle: blinks and sways.
  - Speaking: mouth movement while audio plays.
  - Correct: a personality-specific celebration (jump with arm raised, eyes-closed smile, hands clasped, nod).
  - Wrong: a wince and shrug with one arm out.
  - Reactions fire at the same moment the bottom panel appears.
- Duo (the owl) is separate from the cast and only appears at meta moments. Four times in this lesson:
  1. "5 IN A ROW!" interstitial (auto-advances in about 2 seconds; fired after five consecutive correct answers, and the skipped exercise neither counted nor broke it).
  2. "Let's review the exercise you missed!"
  3. Lesson Complete, alongside a cast member in a fireworks celebration.
  4. The streak-goal prompt ("Let's commit to learning with a Streak Goal!").

## Feedback and rewards
- Bottom panel: colour-coded (green correct, red wrong with "Correct solution:" shown, amber skipped). The Continue button matches the colour.
- Correct-answer copy varies: "Nice job!", "Nice!", "Excellent!", "Nicely done!", "Correct!", "Great job!", "Great!".
- Extras: some answers add "Meaning: ...". Alternative answers show "Another correct solution". The panel has Too easy, Too difficult and Report buttons.
- Wrong answer: a heart is lost, and the missed exercise is re-queued at the end with an orange "PREVIOUS MISTAKE" tag.
- Completion sequence:
  1. Stat cards appear one at a time (Combo 14, Total XP 14, "GREAT! 94%").
  2. The streak counter animates 0 to 1, with a weekday tracker and the copy "Practicing daily grows your streak, but skipping a day resets it!".
  3. The streak-goal picker (7, 14, 30, 50 days, labelled Good, Great, Incredible, Unstoppable).
- Speed: number keys pick choices (1-3 for multiple choice, 1-0 for matching) and Enter checks and continues. This is what makes the Enter-Enter loop so fast. The matching grid lagged when keys were pressed too quickly.
- In-world humour: one chat option was literally "they couldn't have Duolingo".

## Pressure outside the lesson
- The path screen showed a league card: "Better luck next time! You finished #18 and dropped down to the Ruby League".
- The lesson start button said "START +10 XP", so the reward is promised before you commit.
- Daily Quests sit in the sidebar (e.g. "Earn 10 XP"), alongside a Super upsell.

## What makes it feel intuitive and addictive
1. Constant micro-rewards: every answer gets an immediate panel, an animation and a new line of praise, so the timing is predictable and the wording varies.
2. Characters make drills feel social: the character says the sentence, so a repetitive task feels like someone talking to you, and cast rotation stops you tuning them out.
3. Two-tier character system: cast members handle content and micro-feedback; the mascot handles meta moments (combo, mistakes, milestones), which keeps the mascot special.
4. Loss framing everywhere: hearts, the league demotion card, the streak reset warning and the accuracy percentage all push toward 100%.
5. Mistakes become a second chance: the review round turns a failure into a correction, so the lesson ends on success.

## Takeaways for My Spanish Tutor
- Make the character the speaker of each prompt, not decoration beside it.
- Build a small set of reaction states: idle, speaking, correct, wrong, skipped.
- Reserve bigger celebrations for combo moments, mistake-review and lesson-complete.
- Keep a short combo interstitial that auto-advances so it doesn't break flow.
- Re-queue mistakes with the same character.
- Caution: Duolingo's cast works partly because it is large and consistent. A single character will repeat faster, so the reaction library will need more variants.

## Suggested next step
Write a one-page character reaction spec for the my-spanish-tutor repo.
