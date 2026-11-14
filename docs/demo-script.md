# Demo script and write-up (task 16.4)

Draft for a 5-minute demo. Timings are a guess: do a dry run on a stopwatch and trim, then tick 16.4. The allotted time has not been confirmed.

## Set-up before starting

- Open `/demo` (the "Try the demo" link on the welcome page). It needs no class code and saves nothing. Turn on Recording mode in the Demo menu for a video, and use Reset between runs. Every spoken step has a Pretend button for a noisy room.
- A second tab with the teacher overview in demo mode (`/owner/<your owner link>?demo=1`).
- Real cost figure from `npm run cost-report -- TELE8` written on a card once the pilot has run. If there is no pilot yet, say the cost is an estimate and show the sample figure, which is marked sample.

## Script

**0:00 The problem (education).** Year 8 students dislike speaking tests and feel self-conscious saying Spanish aloud. Revision is lonely and badly timed. The test is one short conversation, so five questions can be learned properly if the practice is private, short and forgiving.

**0:30 Meet Tele (creativity).** Poke Tele. A CRT television with one eye and no mouth, speaking only Spanish, with English as subtitles. Its feelings are in the eye, antennae and the world behind it. It was designed with a 13-year-old, so it is deliberately odd.

**1:15 The path.** Show the desktop: four steps in a fixed order, locked steps shown as static not as a blocked screen, five question files that clear from static as they are learned. Say: play is a reward and never a way to skip practice. Looking around earns no coins.

**1:45 Hear it, then say it.** Play a question with the words hidden. Answer by voice. Show feedback that names one thing to fix and a score from rules, not a model. A recognition failure is never held against the student.

**2:45 Against the clock.** One timed round. Show the response-time rank, the student's own history, no public ranking, no hearts or lives.

**3:15 Readiness and the plan.** Show the readiness meter naming its next action and the short daily plan from the minutes they chose.

**3:45 Privacy by design (technical).** No names, no emails, no recordings stored. Join by class code, a nickname from a list, interests as fixed tags. One button deletes everything. The notice is written for a 13-year-old and checked for reading level.

**4:15 The teacher's view and the cost (technical).** Open the demo overview: counts by step, class hotspots, nicknames only, every figure marked sample. Then the cost: the practice loop makes no language-model calls, and a test fails if one is added. Every paid call goes through one cost router with a cap and a fallback. Cost per student: say the measured number.

**4:45 Close.** Built to be adopted by a department in one step with one class code. Next: the open questions below.

## Write-up points

- **Education:** retrieval practice, spaced across sessions (mastery needs two sessions), comprehension before production, speed practice for automatic recall, effort rewarded not only correct answers.
- **Creativity:** an original character and world, designed with the target age; mouthless tutor with feelings baked at build time.
- **Technical choices:** Next.js on Vercel with Neon; browser speech recognition with a server fallback; pre-built audio with timelines; rules-based scoring; one cost router; in-process Postgres for fast tests; 770 unit tests and Playwright journeys on phone and Chromebook profiles.

## Known open items to mention honestly

- Draft answers are saved as typed, so a student could type something personal. Decision pending.
- The speech vendor's data retention is not yet verified.
- The prototype Spanish voice must be replaced by a licensed one before launch.
- Cheeky phrases are drafts awaiting approval, and are off by default.
