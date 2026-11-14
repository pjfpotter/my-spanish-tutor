# Tele: reaction spec (task 25.4)

One page. When Tele reacts, with what, and when it stays quiet. Matches the `tutor-avatar` and `practice-session-feel` specs and the code as of 13 Nov 2026. Tele has no mouth: feelings show in the eye, antennae, picture and the world behind it. Tele speaks only Spanish; English is the subtitle.

## Two kinds of reaction

| Kind | What it is | Where it comes from | Cost |
|---|---|---|---|
| **Wordless** | A reaction state: `idle`, `correct`, `wrong`, `skipped`. A feeling on Tele's face and a short sound (`tele-correct`, `tele-wrong`, `tele-skipped`, several takes each, never the same take twice in a row) | Set by the screen the moment an answer is checked | Free, no audio clip |
| **Spoken** | A Spanish line with subtitle and a baked feeling track, played from a built clip, with the caption following the words | The phrase bank (`lib/tele/phrase-bank.ts`, chosen by `lib/tele/select.ts`) or Tele's fixed memorise-lesson lines (`lib/memorise/tele-lines.ts`) | Built once, played free |

Lines are chosen by situation alone. No student data, no names, no model call. The same line never plays twice in a row unless it is the only one.

## When Tele speaks

Only at meaningful moments. Everywhere else it reacts wordlessly or stays still.

| Moment | Situation | Where |
|---|---|---|
| Start of a section (first screen) | `quick_win` | Understand, classic memorise |
| Combo: five correct in a row | `streak` | Understand, Automate |
| Review of a missed question | `wrong` (kind, short) | Understand, classic memorise |
| New personal best response time | `improvement` | Automate |
| Question mastered | `mastered` | Understand |
| End of a section or round | `session_end` | Automate |
| Student asks for the question again, in Spanish | `repeat_request` (rewarded as good test technique) | Automate |
| No answer in the window | `hint` (it is a blank, never a wrong answer) | Automate |
| Audio too unclear to score | `heard_badly` (the attempt is not scored, the question is asked again) | Automate, memorise |
| Student pokes Tele | `poke` (plus the cheeky pool when the teacher has switched it on) | Desktop |
| Memorise lesson | Fixed lines: `good`, `miss`, `up` (taking words away), `down` (more help), `echo`, `now`, and an end line per lesson type | Memorise ladder |

In the phrase bank and voiced, but no screen asks for them yet: `welcome_first`, `welcome_back`, `days_far`, `days_near`, `test_day`, `after_test` (the countdown tone could use them, a small job) and `nervous`, `dislike` (they depended on the mood check-in, which was removed and parked). The demo's Meet Tele stop plays the placeholder lines from `lib/tele/lines.ts`.

## When Tele does not speak

- After an ordinary correct or wrong answer: wordless reaction only. Three correct in a row must not trigger speech.
- While the student is saying something. In the memorise ladder Tele speaks first, then the microphone opens, so its voice is never taken for the student's.
- Never over the feedback panel or Continue. A line never delays them, and continuing cuts the line off. The English subtitle stays visible without scrolling.

## Feelings

Six feelings (joy, sadness, anger, fear, surprise, disgust) are recipes that add together, so any two blend. Each phrase-bank line carries a baked feeling track. Wordless reactions map as follows: `correct` is joy (0.8), `wrong` is sadness (0.4 to 0.45), `skipped` is a little surprise (0.3), `idle` is calm. Lines are comforting first and strange second: no jokes at a student's expense, nothing frightening, at most one thing to fix, never blame.

## Timing and limits

- Wordless reaction starts within 300 ms of the answer being checked. A spoken line starts within 600 ms.
- Compact on practice screens (a small fixed area, never pushing the prompt, answer or feedback off a 360 by 640 screen). Full size on the desktop and celebration screens.
- Calm mode and the device's reduced-motion setting stop clouds, glances, breathing and glitches. The caption still follows the voice.
- Several variants per reaction. Wordless sounds rotate; spoken lines do not repeat back to back.

## Known gaps

- The cheeky phrase pool (`lib/tele/cheeky.ts`) is a draft awaiting the owner's approval and is off by default, so it is not part of this spec.
- The audio for any new line has to be built (`npm run build-audio`) before it speaks. Until then the line shows with a timed caption and no sound.
