# Demo script and write-up (task 16.4)

Draft for a 5-minute demo. Timings are a guess: do a dry run on a stopwatch and trim, then tick 16.4. The allotted time has not been confirmed.

## Set-up before starting

- Open `/demo` (the "Try the demo" link on the welcome page). It needs no class code and saves nothing. Allow the microphone: every spoken stop listens for real. If a room is too noisy, each stop falls back to a clearly labelled example.
- A second tab with the teacher stop (`/demo/teacher`).
- Real cost figure from `npm run cost-report -- TELE8` on a card. If there is no pilot yet, say the cost is an estimate and show the sample figure, which is marked sample.

## Script

**0:00 The problem (education).** Read the hub: Year 8 students dislike speaking tests and avoid practising aloud. Five questions, answered from memory. The four steps, each with its why.

**0:45 Hear a question (stop 1).** Tele asks in Spanish with no text, English only as a subtitle. Say an answer into the microphone. The score comes from matching words, with one thing to fix and no penalty for a recognition failure.

**1:30 Memorise (stop 2).** Say an answer a bit at a time. Words light up as they are heard. The help fades as the student gets it.

**2:15 El Pasillo (stop 3).** The last step, as a corridor game. Say what is on each door to open it. Stay silent or make noise and the monster closes in; only matching words push it back. The student's own answers are the doors in the real app. A caught student wakes up with a souvenir and effort-based praise, never a game-over.

**3:00 Meet Tele and rewards (stops 4 and 5).** Poke Tele and try its feelings. Euros for effort, a streak that never threatens, no real money.

**3:30 Teacher view (stop 6).** Sample class data, nicknames only: counts by step, where the class struggles.

**3:45 Privacy by design (technical).** No names, no emails, no recordings stored. Join by class code, a nickname from a list, interests as fixed tags. One button deletes everything. The notice is written for a 13-year-old and checked for reading level.

**4:15 The cost (technical).** the practice loop makes no language-model calls, and a test fails if one is added. Every paid call goes through one cost router with a cap and a fallback. Cost per student: say the measured number.

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
