# Tasks

Verification rule (deadline): every task is verified by automated tests (unit tests, or Playwright on headless Chromium with a mocked or fake microphone). Checks that need a real device or a real person are marked "Optional manual check" and never block ticking a task. Untested devices are recorded as unverified in the device matrix (2.3).

## Build order

Task ids are stable and are not renumbered. Work through the milestones in this order, and within a milestone in the order listed. Group 18 (the look and the character) is written last but is built early.

- **M0, finish the spike:** 2.2, 2.3
- **M1, Tele on the desktop (first check with Dolores):** 4.1, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 12.6
- **M2, hear it:** 3.1, 3.2, 3.4, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 12.1, 12.2, 12.3, 6.1, 6.2, 6.3, 6.4, 5.1, 5.2, 10.1, 13.1
- **M3, write it:** 7.5, 7.1, 7.2, 7.3, 7.4, 7.6
- **M4, say it:** 8.1, 8.2, 8.3, 8.4, 5.3, 5.4, 5.5
- **M5, own it:** 9.1, 9.2, 9.3, 9.4, 9.5, 13.2, 13.3, 13.4, 11.1, 11.2, 11.3, 10.2, 10.3, 10.4, 10.5
- **M6, before anyone but Dolores:** 3.3, 3.5, 3.6
- **M7, wrap-up:** 14.1, 14.2, 14.3, 15.1, 15.2, 16.1, 16.2, 16.3, 16.4, 13.5
- **M8, fix what user testing found (before any new feature):** 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7
- **M9, make it feel good:** 20.1, 20.2, 20.3, 20.4, 20.5, 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 22.1, 22.2, 22.3, 22.4
- **M10, teacher flow and demo:** 23.1, 23.2, 23.3, 24.1, 24.2, 24.3
- **Alongside, documents for the presentation:** 25.1 to 25.6
- **On hold:** 23.4 and 26.2 (needs the owner's design decision)
- **Writing flow rebuild:** 26.1a to 26.1e (decided)
- **Stretch teacher flow:** 23.4, 23.6
- **Stretch, only if time:** 17.1, 17.2, 17.3

## 1. Project setup and shared foundations

- [x] 1.1 Scaffold the Next.js TypeScript app with PWA manifest and deploy a hello-world preview to Vercel; verify the preview URL loads on a phone and can be added to the home screen
- [x] 1.2 Create the Neon database and an initial migration for courses, chunks, questions, profiles, answers, attempts, mastery, coin ledger, plans and cost log; verify migration applies cleanly on a fresh branch
- [x] 1.3 Build the external-call wrapper (budget check, per-profile rate limit, cost log, fallback hook) with unit tests for cap reached, rate limited and logged cost
- [x] 1.4 Set up the unit test runner and a CI check on push; verify a failing test blocks the check
- [x] 1.5 Write a short README covering setup, environment variables, and how to run the tests; verify a fresh clone follows it successfully

## 2. Speech and device spike (de-risk first)

- [x] 2.1 Build a throwaway page that records a Spanish sentence with browser recognition and prints the transcript; verify with Playwright (mocked recogniser, phone and Chromebook profiles). Optional manual check: run `/spike/speech` on an Android phone, an iPhone and a Chromebook with built-in microphone and with a headset, and paste each device's matrix block into 2.3
- [x] 2.2 Test a server-side transcription fallback with a short in-memory clip; verify with a test that the clip is never stored and that the cost router is called. Optional manual check: transcript quality and latency for a 13-year-old's accent (Dolores and one friend with consent)
- [x] 2.3 Record the results in a device matrix document and choose the recognition path per device (untested devices default to the server fallback and are marked unverified); verify the document lists a decision for each device

## 3. Course content, joining and anonymous identity

- [x] 3.1 Define the course schema with chunk feature tags, five questions with English subtitles and answering topics, test date and the mark scheme; verify validation rejects incomplete courses (unit tests). Rework for three levels and calibration data is task 7.7
- [x] 3.2 Seed one hand-authored course and a seed script; verify the script creates it and re-running does not duplicate it
- [x] 3.3 Implement class codes and the join flow with the privacy notice; verify valid, unknown and repeat codes behave as specified
- [x] 3.4 Implement the anonymous profile, nickname picker, interest tag picker (fixed list) and recovery code; verify restore on a second browser works and that no free-text field exists
- [x] 3.5 Implement delete-everything; verify all server rows for the profile are gone and the device returns to first-use
- [x] 3.6 Write the student-facing privacy notice and the one-page data-protection impact assessment; verify both are linked from the app and review the notice for reading age

## 4. Speech audio assets and clip timelines

- [x] 4.1 Check the ElevenLabs character voice for production use: plan and cost against the budget, licence terms for school and under-18 use, availability of word timestamps and a speed setting, and a second voice for rotation; verify the decision is recorded with reasons and the unofficial prototype voice is not used in production
- [x] 4.2 Write the build script that synthesises each question in the character voice at slow, normal and fast rates using the provider's speed setting (not time-stretching) and stores clips by content hash; verify rerunning produces no new files for unchanged text
- [x] 4.3 Port the Spanish syllable-grouping and stress rules into a tested module; verify unit tests cover diphthongs, hiatus, silent h, qu, gu, ll, ch, final y and stress position
- [x] 4.4 Generate the per-clip timeline (word times from provider timestamps or rules, downsampled loudness envelope, feeling track) and store it beside each clip; verify timelines exist for every clip and unit tests cover envelope downsampling and the feeling track
- [x] 4.5 Drive Tele's glow and the caption highlight from the audio clock using the timeline; verify words and glow stay aligned at 1×, 0.75× and 0.5× with a fake audio clock
- [x] 4.6 Implement the missing-clip fallback (text plus subtitle); verify it by blocking a clip in the browser
- [x] 4.7 Document the asset pipeline in docs/audio-pipeline.md; verify the documented commands regenerate a clip

## 5. Spoken-answer feedback

- [x] 5.1 Implement speech capture with permission handling and the chosen recognition path per device; verify the permission-denied and unsupported-browser paths with Playwright. Optional manual check: the same paths on real devices
- [x] 5.2 Implement word-level diff scoring with accuracy percentage; verify unit tests for missing, extra, swapped and accent-tolerant words
- [x] 5.3 Implement the confusion table (me/mi, final o, silent h, j, ll, v/b, z/c) and tip display; verify unit tests map each entry and an unmatched mismatch shows no tip
- [x] 5.4 Implement syllable breakdown with slow word audio for missed words; verify on five sample words
- [x] 5.5 Implement low-confidence handling (no penalty, retry offer); verify with a noisy recording

## 6. Question comprehension phase

- [x] 6.1 Build the hear-then-choose screen with speed progression, replay, slow and reveal; verify a revealed attempt does not count toward mastery
- [x] 6.2 Implement the mastery rule (three correct across two sessions, configurable) and in-session spaced return; verify unit tests including the single-session case **Superseded 14 Nov** by `rework-home-screen`: three correct answers now master a question, with no two-session gate.
- [x] 6.3 Gate progression until all five questions are mastered; verify the next phase stays locked until then
- [x] 6.4 Show comprehension mastery as Tele's channels: the picture clears from static as mastery rises and locks only after the second session day; verify with seeded mastery records

## 7. Answer writing coach

- [x] 7.1 Implement the rubric engine counting tagged chunks into the five rungs (survival, opinion, detail, range, showing off), per answer and across all five answers (tenses, justified opinions), with a feature list and no grades; verify unit tests including detail without an opinion, the whole-test tense gate, phrases worth more than single words, and fancy features
- [x] 7.2 Implement the word-bank validator with an allowed-word list; verify out-of-bank words are caught
- [x] 7.3 Select model answers by target level (easiest route first), with swaps, glue words and spare extras; verify each by unit tests and the teacher examples
- [x] 7.4 Implement the whole-test checklist, target switching, the one-suggestion rule, the Showing off load note and the confirmation gate; verify by a scripted run
- [x] 7.5 Implement the model-answers fallback when drafting is unavailable or capped; verify it by simulating the cap
- [x] 7.6 Show each answer as a "file" whose rubric features light up as they are used, saved on confirmation; verify the lit features match the rubric output
- [x] 7.7 Rework the rubric engine and course schema to three levels read from calibration data files (`lib/course/calibration/`), seeded from the teacher's calibration and rubric files, with the teacher examples as regression fixtures; verify all examples classify at their level and a threshold edit changes results with no code change
- [x] 7.8 Implement the upload-time set-up call through the cost router (flag bad combinations, write and validate model answers by level, regenerate once, mark missing); verify with a mocked model, including a mislevelled answer

## 8. Answer memorisation phase

- [x] 8.1 Build English-prompt recall with spoken attempts and accuracy percentage; verify result time under two seconds with Playwright on the phone profile
- [x] 8.2 Implement scaffold fading and chunk isolation; verify unit tests for threshold changes
- [x] 8.3 Implement memorisation mastery across sessions and encouraging single-next-step feedback; verify unit tests and copy review. Decision: an attempt made while the whole script is showing is reading aloud, so it earns coins and helps the prompt fade but does not count toward mastery
- [x] 8.4 Dim words out of the prompt as scaffold fades and show the student's own personal best; verify the dimming follows the fading thresholds

## 9. Response automatisation phase

- [x] 9.1 Build hear-and-answer rounds with shuffled order and varied speeds; verify the order differs between rounds
- [x] 9.2 Measure response time from question end to speech start and store it per attempt; verify against a stopwatch test within a tolerance of a few hundred milliseconds
- [x] 9.3 Implement adaptive window, blank handling with first-words hint, and the repeat-question phrase; verify each by scripted attempts
- [x] 9.4 Implement the test-ready threshold and message; verify unit tests
- [x] 9.5 Show the response-time rank as a ladder of named steps with the student's own history; verify at rank boundaries

## 10. Diagnostics and mood

- [x] 10.1 Implement attempt event logging and the closed cause-tag list; verify events carry all specified fields
- [x] 10.2 Implement comprehension probes and tag rules (too fast, word not known, sound-spelling gap, thrown by context); verify unit tests for each pattern
- [x] 10.3 Implement recall cause tags and chunk hotspot detection; verify unit tests including the stress pattern
- [x] 10.4 Build the mood check-in and the baseline test-teach-test at course start; verify the dislike option leads to an easy quick win **Superseded 14 Nov** by `rework-home-screen`: the baseline page is removed; the placement check is an optional quick check inside Understand.
- [x] 10.5 Feed tags into session planning so tagged items get adjusted support; verify the too-fast case starts slower

## 11. Revision planner

- [x] 11.1 Build the countdown, phase display and readiness meter that names its next action; verify unit tests for the readiness calculation
- [x] 11.2 Build the session plan from minutes and days left, with redistribution on missed days and late-starter mode; verify unit tests for each case
- [x] 11.3 Add opt-in reminders and the after-test-date state; verify no notification is sent without opt-in **Superseded 14 Nov** by `rework-home-screen`: the daily reminder is removed.

## 12. Tutor character, phrase bank and calm mode

- [x] 12.1 Write one original character, Tele, and generate its phrase bank once through the call wrapper, in Spanish at course level with English subtitles and a feeling per line; verify the bank contains every situation key
- [x] 12.2 Voice and time every phrase-bank line with the audio pipeline; verify all lines have clips and timelines
- [x] 12.3 Implement situation-based line selection avoiding immediate repeats and the subtitle toggle; verify unit tests
- [ ] 12.4 Moved to stretch (17.3): interest-tag flavoured banks
- [ ] 12.5 Moved to stretch (17.3): own-drawing tutor
- [x] 12.6 Implement reduced-motion behaviour and the calm switch; verify with the system setting enabled and with the switch on that idle motion, glitches and camcorder effects stop and the caption still follows the voice

## 13. Engagement and rewards

- [x] 13.1 Implement the append-only coin ledger and effort-based awards; verify a low-scoring attempt still earns coins
- [x] 13.2 Implement the response-time rank from rolling averages; verify unit tests at rank boundaries
- [x] 13.3 Implement fixed-price desktop unlocks (wallpapers, objects), stickers and streak freezes; verify there is no payment path or random draw in the codebase and that exploring the desktop earns no coins
- [x] 13.4 Implement own-history progress and class-total goals with no individual names; verify the class goal shows only totals **Superseded 14 Nov** by `rework-home-screen`: My progress, own history and the class goal are removed.
- [x] 13.5 Add the curated cheeky pool with a course-level switch; verify it disappears when switched off

## 14. Cost control and reporting

- [x] 14.1 Configure caps and fallbacks for every paid service and verify each degrades as specified when the cap is simulated
- [x] 14.2 Build the cost-per-student report broken down by tier; verify it matches the cost log for a seeded run
- [x] 14.3 Add a test asserting practice rounds make no language-model calls; verify it fails if one is added

## 15. Teacher overview

- [x] 15.1 Build the read-only overview behind an unguessable owner link with phase counts, average readiness and class hotspots; verify the student class code cannot open it
- [x] 15.2 Add labelled demonstration data kept apart from real students; verify every figure is marked sample in demo mode

## 16. Integration, user testing and demo

- [x] 16.1 Run one scripted end-to-end pass of all four phases on the seeded course; verify it completes with Playwright on the phone and Chromebook profiles. Optional manual check: the same run on a real phone and Chromebook
- [ ] 16.2 Optional manual check, skipped if there is no time: run user testing with Dolores and two or three other 13-year-olds with parental consent, collect feedback on enjoyment, fairness of scores, whether the look and Tele land, and whether play pulls them away from practice; verify notes are saved and the top three issues are fixed
- [ ] 16.3 Capture measured cost per student from real usage and add it to the demo; verify the figure comes from the cost log
- [ ] 16.4 Prepare the demo script and short write-up covering education, creativity and technical choices; verify a dry run fits the allotted time

## 17. Stretch (cut first if time is short)

- [ ] 17.1 Implement photo import of a sentence builder with review and confirm, hashed reuse and manual fallback; verify an unreadable photo is handled
- [ ] 17.2 Add meme and reggaeton-style remix of a confirmed answer using the curated pool; verify output stays within the course vocabulary
- [ ] 17.3 Parked from the design work, build only if time allows and discuss before starting: virtual-pet wrapper (Bicho), mini-games, notes tab, doodle pad (possibly as a fidget corner inside practice), theme switcher and other weirdness levels, interest-tag flavoured phrase banks, student-drawn tutor, a pronunciation mouth diagram, wallpaper shop beyond two or three items

## 18. Tele and the dreamcore desktop (built early, in M1)

- [x] 18.1 Create the single dreamcore token set (colours, fonts, backgrounds, motion intensity) and a separate learner-controlled accessibility layer; verify with an automated contrast check that reading surfaces meet 4.5:1 and that no state is conveyed by colour alone
- [x] 18.2 Build the Tele component with eye, antennae, picture and world driven by a feeling vector and voice loudness, deciding canvas code versus layered SVG per docs/art-pipeline.md and recording the decision in design.md; verify with Playwright that all six feelings render and the idle character runs without console errors
- [x] 18.3 Build the caption window with the Spanish line, English subtitle, word highlight and subtitle toggle; verify the subtitle can be hidden and the highlighted word follows a stub timeline
- [x] 18.4 Build the desktop home with the countdown stub, the five question files and locked phases shown as static; verify a locked phase cannot be opened
- [x] 18.5 Add poke-for-a-line using hand-written placeholder lines until 12.1 and 12.2 land; verify no coins or progress are awarded
- [x] 18.6 Set and record a performance budget (asset size and frame rate) by measuring on an old Chromebook, with effects limited to the home desktop and empty states; verify with a build-size check in CI. Optional manual check: run on a real school Chromebook
- [x] 18.7 Create docs/asset-credits.md and log every photo and third-party asset before it ships; verify a test fails if an image under public/ has no entry
- [x] 18.8 Play one ElevenLabs line through Tele with its caption and a baked feeling; verify with Playwright using a stub clip, and manually check that the real voice sounds right on a phone

## 19. Fix what user testing found (M8)

Note: task 7.x level work (names, thresholds) is superseded by 26.1a. Tasks 10.4 (mood check-in) and 11.2 (session plan) are done in code but superseded by the revised specs; 19.4 removes them.

- [x] 19.1 Fix listening: find why the browser recogniser path is not used or fails and why `/api/transcribe` returns 503 (the key `OPENAI_API_KEY` is unset when it returns `not_configured`); configure the fallback; show a plain-English message with retry and a continue-without-speaking option when both paths fail. Verify with Playwright (mocked 503) and a release-checklist step. Optional manual check: a real phone and a laptop browser
- [x] 19.2 Rework the starting-point check into the single-pass placement check: English title, positive feedback on every outcome, results screen, disabled controls after a correct answer, skip the comprehension stage when all are correct first time, only the missed questions otherwise; verify by Playwright for all-correct, some-wrong and all-wrong runs and that the page always has navigation
- [x] 19.3 Add a back and an exit-to-desktop control to every screen inside a section, keeping progress; verify with a Playwright walk through every section
- [x] 19.4 Remove the mood check-in screen, API route use and storage, the session plan and every timing; keep the parked spec text; keep interest tags out of the join flow; add the little-and-often message; verify no screen shows a timing or asks about mood
- [x] 19.5 Audit all interface text for unexplained Spanish and replace titles such as "Punto de partida" with English or add a translation; verify with a test that scans interface strings against an allow-list of learning content
- [x] 19.6 Reword the first screen to "Sign up for a new account" and "I lost my account", each with a one-line explanation; verify by Playwright and a copy review for reading age
- [x] 19.7 Disable or hide controls that no longer apply (for example replay after a correct answer); verify per screen

## 20. Feedback and tutor rhythm (M9)

- [x] 20.1 Fit every practice screen into 360 by 640 with no scrolling, with a compact tutor; verify with a Playwright layout check per screen on the phone profile
- [x] 20.2 Implement tutor rhythm (speak at start, combo, mistake review, personal best, end, poke; wordless reactions otherwise), non-blocking lines, subtitle visible, and remove the enforced pause; verify the Continue control works while a line plays and the reaction starts within 300 ms
- [x] 20.3 Implement the feedback panel (instant, colour plus non-colour cue, correct answer on a miss, Continue), varied praise pool and mistake re-queue with a label; verify unit tests for no-repeat praise and re-queue
- [x] 20.4 Add original or licensed feedback sounds and small reward animations with a sound setting, calm switch and reduced motion respected; log them in docs/asset-credits.md; verify settings silence them
- [x] 20.5 Implement the combo moment (default five, auto-advances, skipped items neither count nor break); verify unit tests

## 21. Task types and memorising (M9)

- [x] 21.1 Build match pairs (Spanish with English); verify rapid-key input is safe
- [x] 21.2 Build sentence scramble (tap and drag, coloured by chunk kind); verify for phone touch and keyboard
- [x] 21.3 Build fill the gap and tap what you hear; verify distractor rules (similar length, cognates)
- [x] 21.4 Build the session mixer (at least three types, no type more than three in a row, rising difficulty); verify unit tests
- [x] 21.5 Implement scaffolding kinds (English, chunk reveal, first words, gaps, listen then repeat) chosen from results and cause tags, and chunk-by-chunk build-up; verify step-down by unit tests
- [x] 21.6 Implement skipping a known answer by recall-first; verify mastery rules still apply

## 22. Automatise ladder (M9)

- [x] 22.1 Build the chunk ladder (1, 2, 3, all) with start-higher; verify progression by unit tests
- [x] 22.2 Show each chunk, in its colour, as it is said correctly; verify with a stub recogniser
- [x] 22.3 Add the hint delay (default 2.5 s) with first words of the next chunk, treated as assisted; verify timing with a fake clock
- [x] 22.4 Add expert mode (no text) and personal-best celebration; verify no text appears while answering

## 23. Teacher flow and course shape (M10)

- [x] 23.1 Document the teacher flow end to end (steps, where each runs, calls made, what is cached) in docs/teacher-flow.md, including the question of local versus server; verify it matches the scripts **Done 13 Nov:** `docs/teacher-flow.md`, checked against the scripts. It records honestly that the model-answer set-up call has no script yet and that a lost owner link cannot be regenerated.
- [x] 23.2 Extend the course schema for one or more sentence builders, four or five questions and core or extension questions; update readiness and the overview; verify with a two-builder, four-question seed course **Done 13 Nov:** chunks can name a builder, questions can be marked extension, a course needs 4 or 5 core questions and at most one recycled (migration `0016_course_shape.sql`). Gates, readiness, the overview and the desktop count the course's core questions (`Progress.total`); extension questions are practised but never counted. Verified with a two-builder, four-core-plus-one-extension course (`lib/course/course-shape.test.ts`). The practice screens still list every question including extensions; nothing yet lets a teacher author extension questions except the course file. Also fixed two Windows path-separator test failures.
- [x] 23.3 Record the draft, set-up, review, publish and share status per course; make publish block on missing items; verify re-publishing unchanged text makes no new calls **Done 13 Nov:** `lib/course/status.ts` and `npm run course -- status|review|publish|share <code>`. Status (draft, set up, reviewed, published, shared) is worked out from the course's content; sign-offs store a content hash so an edit lapses them. Publish blocks and names every missing item (model answers, audio, review). Publishing an unchanged course runs nothing; after an edit only the paid step whose output is missing runs again (tests count the calls). Shown on the owner overview. Courses that existed before this count as published and shared (migration `0017_course_status.sql`). Publish itself is not wired to the real set-up call or audio build: the script reports what is missing and which command to run.
- [ ] 23.6 Stretch: add scan-to-start (photo of a sentence builder to an editable draft) with a manual fallback, and edit screening (length, blocklist, valid words, class-code visibility, disable course); verify a blocklisted edit blocks publishing.  Stays with 17.1 as stretch
- [x] 23.7 Price a new course and limit how many a teacher can load: have the audio build and set-up record each course's spend against its course id in the cost log (the log already has a `course_id` column, the build does not fill it yet), report the cost of a course before loading it (new clips only: a clip is shared by text, voice and speed, so a repeated phrase costs nothing), and add a per-teacher monthly limit on new courses with the reason shown to the teacher; owner to choose the limit. Verify a second course that shares phrases with the first is priced for the new clips only **Done 13 Nov (limit number is the owner's to choose):** `npm run price-course -- <code or file>` prices a course for new clips only (shared phrases cost nothing; a second course sharing phrases is priced for the new clips only, tested); the audio build records its spend against the course (`--course=CODE`, needs DATABASE_URL); the set-up call already did. New-course limit lives in `lib/course/limits.ts`: **3 new courses per teacher per 30 days is a placeholder, owner to confirm**; the refusal says why and when they can load another. A teacher is only a label the developer gives a course (`teacher_ref`), so courses with no label (the developer's own) are not limited.
- [ ] 23.4 On hold: a teacher-facing setup page that calls the same server functions as the scripts, with regenerate-owner-link; do not start until the owner decides
- [ ] 23.5 Parked for later: coursework submission dashboard

## 24. Demo mode (M10)

- [x] 24.1 Build the demo entry, sample course and isolated session with a Demo label; verify nothing is written to real tables **Built 13 Nov:** `/demo` (linked from `/welcome`), the sample course is the memorise lab's five answers so every clip is already built; a Demo strip on every demo screen; no profile and no writes to the server (tests assert no non-GET API calls). Tests: `tests/demo.spec.ts`, `lib/demo/content.test.ts`.
- [x] 24.2 Build the one-minute stops (hear, memorise, timed round, tutor, rewards, teacher overview) with direct access and the pretend button for spoken steps; verify the whole tour runs with no microphone **Built 13 Nov:** six stops (hear, memorise, timed round, tutor, rewards, teacher overview with sample data), each reachable from the hub or the Demo menu with Previous and Next. Pretend buttons: hear, memorise and the timed round; the round never opens the microphone and works out rank and euros on the page only. Tested with no microphone and with a recogniser that hears nothing.
- [x] 24.3 Add reset and a recording-friendly switch; verify reset returns to stop one **Built 13 Nov:** Reset (clears the demo's browser keys and the sample answers' device stores, then returns to the hub) and a recording switch (no countdown, no hint, no pause prompts). Owner to try the whole tour on the phone before Tuesday.

## 25. Documents for the evaluation and presentation

- [x] 25.1 Write docs/api-map.md: every route under app/api, its trigger, caller, target, auth, cost-router use, and when it is not called, with a sequence diagram per main flow; verify against the route files **Done 13 Nov:** `docs/api-map.md`, 16 handlers in 15 route files, checked against the files, with four sequence diagrams.
- [x] 25.2 Write an evaluation plan that answers each success criterion in proposal.md from test notes or the cost log **Written 13 Nov:** `docs/evaluation-plan.md`. Every result is blank until the user testing session; fill them from the notes and `npm run cost-report`.
- [x] 25.3 Run a voice audition (three or more voices, clarity and pace) with a Year 8 student; record the decision in docs/voice-decision.md **Not needed (16 Nov):** the owner moved to a new voice on `eleven_v4` on 13 Nov because they judged it better; no student audition. Recorded in docs/voice-decision.md.
- [x] 25.4 Write the one-page character reaction spec (states, variants, when the tutor speaks); verify it matches practice-session-feel **Done 13 Nov:** `docs/character-reaction-spec.md`, checked against the screens that call Tele. It lists the phrase-bank situations no screen uses yet.
- [x] 25.5 Write game-mode proposals for memorise and automatise for the owner to approve; build nothing until approved **Written 13 Nov:** `docs/game-proposals.md` for the owner. Nothing built. Recommends M1 (clear the static) and A1 (beat your own ghost).
- [x] 25.6 Update docs/PRD.md and docs/ARD.md where they still describe the mood check-in, the session plan, exactly five questions or one sentence builder; verify with a search **Done 13 Nov:** PRD and ARD no longer describe the mood check-in, the session plan, exactly five questions or one sentence builder (FR-37 and FR-39 are marked parked and superseded). `docs/technical-documentation.md` still says five questions in places; it follows task 23.2.

## 26. Writing flow rebuild and challenge mode

- [x] 26.1 Writing flow rebuild (decided in docs/writing-flow-options.md), in these steps; verify each by unit tests or Playwright on the phone profile:
  - [x] 26.1a Replace named levels with feature values in the calibration data and rubric engine (value is a blend of count and difficulty, each feature once); update the regression fixtures to assert feature sets and values
  - [x] 26.1b Build the empty-slot sentence-builder interface with colours shared with automatise, tap-a-slot to see fitting chunks only, the cement tray and the optional starter answer
  - [x] 26.1c Add per-answer confirmation that unlocks memorising for that answer, the all-five bonus, change-resets-progress, the stalled-answer suggestion to simplify (cognates and high-frequency first) and pruning
  - [x] 26.1d Add the one-optional-extra nudge, the memorising load note and the animated, cancellable analysis
  - [x] 26.1e Pay answer value through memorising and automatising (engagement-rewards) and rename the currency to euros once confirmed
- [ ] 26.2 Challenge mode flow design (multi-screen), possibly through the design tool

## 27. Memorise ladder and live listening

Built as a lab at `/lab/memorise` on sample answers. The memorise phase is unchanged until 27.4. Feedback behind 27.5 to 27.11: `docs/user-testing-notes.md`.

- [x] 27.1 Prototype the memorise ladder (five levels of help, lessons with a progress bar, one thing per screen) and record it in docs/design/memorise-ladder-prototype.html
- [x] 27.2 Implement the lesson engine (plans, a fix for a slipped bit, more help after two slips, less after three clean, keep-going, next-day check) in lib/memorise/ladder.ts; verify by unit tests including a run that always ends
- [x] 27.3 Implement live listening (words light as understood, ends by itself, hint after a pause with no timeout, later words count after a slip) in lib/speech/live-match.ts, lib/speech/pause.ts and app/components/useLiveSpeech.ts, with the lab screen; verify by unit tests and Playwright with a stand-in recogniser
- [x] 27.4 Move the ladder and live listening into the memorise phase with the student's own confirmed answers and chunks: store lesson progress and recalls per profile, reconcile with the mastery rule and scaffold state already stored (lib/memorise/fade.ts, lib/practice/scaffold.ts), pay euros through the existing ledger, replace the lab's device voice with built clips for answer bits, and update tests/memorise.spec.ts; verify the journey test passes **Built 13 Nov (design D24):** `/phases/memorise` runs the ladder on the student's own answers; progress in `memorise_ladder`, recalls recorded through the existing attempts so mastery agrees (one session per UK day), euros paid to the ledger (reason `memorise`, capped), `tests/memorise.spec.ts` rewritten and passing; the old screen is kept at `/phases/memorise/classic`. Clips built 13 Nov in the new voice (`eleven_v4`): all 309 clips, the questions, Tele's lines, every course chunk and the model answers' plain bits at slow and normal speed, and Tele's fixed lesson lines, about £0.65 in total, replacing the earlier voice; the memorise screens play bits from clips and use the device voice only for a bit with no clip. Bit clips may have no English subtitle (a plain bit has no gloss). Not carried across: hotspot ordering and the shorter-answer offer.
- [x] 27.5 When a student has said some bits of a longer screen and stalls, mark the next bit to say and offer that bit's hint and audio directly; verify with a stand-in recogniser that the marker moves to the first unsaid bit **Done 12 Nov:** after a pause on a screen of three or more bits with some said, the next unsaid bit is marked with Hint and Hear it for that bit (lab, stand-in recogniser tests); owner to try on the phone.
- [x] 27.6 Offer pronunciation support (slow audio and syllables, reusing the word practice from task 5.4) when the same word stays unlit on three attempts in a lesson; verify by unit test on the repeat counter and Playwright for the offer **Done 13 Nov:** `lib/memorise/repeat-miss.ts` counts a word left unlit attempt after attempt (per answer, reset when it lights, offered once per lesson); the result shows "Practise <word>" with syllables and Hear it slowly (`useWordAudio`, as in 5.4) and does not move on by itself while it is on offer. Unit tests and `tests/memorise-lab.spec.ts` pass; owner to try on the phone and check the offer fits 360 by 640.
- [x] 27.7 Make live matching aware of position so a repeated word lights only at the student's place in the sentence; verify with an answer that repeats "me gusta" **Done 12 Nov:** matching prefers unbroken runs and lights a repeated word only at the student's place (`lib/speech/live-match.ts`, design in the file header); unit and Playwright tests cover the repeated "me gusta" and a recogniser that repeats itself; owner to try on the phone.
- [x] 27.8 When the end is reached with a bit missing, direct the student back to that bit in place and let saying it complete the screen; verify with a stand-in recogniser **Done 12 Nov:** the screen no longer ends when the last bit is said with one missing; the bit is marked and saying it completes the screen as helped (not clean); Move on keeps the "kept going" credit; owner to try on the phone.
- [x] 27.9 Measure speech-to-highlight delay on a real Android phone, set a budget in docs/performance-budget.md and docs/device-matrix.md, and reduce it (fewer renders per interim result, lighter matching); verify against the budget on the phone **Done 12 Nov:** measured on the reference Android phone (result to screen median 13 ms; first word median 2.1 s), budget set from it in docs/performance-budget.md and recorded in docs/device-matrix.md; our share is under a frame and the rest is the recogniser's.
- [x] 27.10 Signal speaking screens and tapping screens apart with little or no text, without any transition or interruption when the kind changes; verify with a student that the change is understood unprompted **Built 12 Nov, waiting for a student check:** a quiet badge on every screen (microphone to speak; mouse pointer or pointing hand to tap); the first version's flash-up icon was removed after owner testing because it interrupted flow; Playwright covers it. Tick when a student understands the two kinds unprompted. **Passed 13 Nov:** owner confirmed on a real Android phone.
- [x] 27.11 Keep the screen awake while a lesson listens and resume listening after a screen lock or return from the background, without dropping to self-marking; verify on a real Android phone **Built 12 Nov, waiting for the phone run:** wake lock while a lesson listens, listening resumes on return from a lock or the background, errors just after hiding are not read as a fault; Playwright covers it with stand-ins. Tick when it holds on a real Android phone. **Passed 13 Nov:** owner confirmed on a real Android phone.
- [ ] 27.12 Decide what live listening is on devices that use the server recogniser, and record the browser recogniser results for Android, iPhone and Chromebook in docs/device-matrix.md using the lab **Decided 12 Nov (design D25, owner to confirm). Android lab run recorded 12 Nov (the row stays Unverified until the `/spike/speech` run passes); still to run and record: a PC or Chromebook and an iPhone** (paste each device report into docs/device-matrix.md).
- [x] 27.13 Decide whether a bit counts as said at 70% of its words with long words one letter out (the lab) or at every word (lib/practice/chunk-said.ts), and use one rule everywhere **Done 12 Nov:** the lab's rule is used everywhere (design D23); `saidChunks` now uses it and its tests cover one slipped word, a long word one letter out, and a one-word bit.

## 28. Tele redesign (12 Nov 2026)

The owner redrew Tele (television with a realistic eye, turtleneck and corduroy jacket, painted room). Source package: `docs/design/tele-react/`.

- [x] 28.1 Port the redesigned drawing into `lib/tele/draw.ts` behind the existing input API, add the `jacket` option and `channelChange()`, and keep the 30 fps and 1.5 pixel-ratio caps; verify by unit tests, type check and Playwright (`tests/tele-lab.spec.ts`, `calm`, `caption`, `desktop`) **Done 12 Nov:** the designer's clip player is not used because the app's playback drives Tele; the canvas is now 400 by 360.
- [x] 28.2 Ship the sprites as WebP in `public/tele/` (330 KB, was 1.7 MB as supplied), log them in `docs/asset-credits.md`, and keep `npm run check:budget` passing **Done 12 Nov:** `public/` is 3016 KB of 3072 KB, the limit was raised to 7 MB on 13 Nov (see docs/performance-budget.md).
- [ ] 28.3 Re-measure the drawing cost and frame rate on the school Chromebook and the reference phone (the redesign draws more images per frame than the old procedural body) and update docs/performance-budget.md; if it is slow, cache the static world and body to an offscreen canvas first **Owner will check when live (13 Nov).**
- [x] 28.4 Owner to confirm where the sprites came from and their licence (docs/asset-credits.md rows are marked "to confirm"), and whether the photo-real television is acceptable under the asset rules **Done 13 Nov:** the sprites were generated with Gemini (Nano Banana) and are credited so in docs/asset-credits.md.
- [ ] 28.5 Check every screen that shows Tele at 360 by 640 now that the picture is shorter (400 by 360): practice screens, home, memorise lab; verify with `expectFits` in `tests/helpers.ts` **Owner will check when live (13 Nov).**

## 29. Test the whole student journey (16 Nov)

Three ways to reach the final phase exist on `main`: (a) the testing course (code in `lib/course/seed.ts`), where every phase and every gate inside a phase is open and the tester practises the model answers (changes `course-unlock-testing-mode` and `question-sheet-match-and-open-testing`); (b) `/lab/automate`, which runs the real timed round on three fake students and sends nothing to the server (change `automate-lab`); (c) the real course `TELE8` with real written answers. The steps today are Understand, Write (the sentence builder sheet), Memorise, Automate.

- [x] 29.1 Confirm production has the testing course and that it is current **Done 16 Nov:** read-only queries on the production database found the testing course with `unlock_all` true, the sheet attached and published, and all 20 migrations applied (up to `0020_course_sheet.sql`). `TELE8` is present and locked as designed in the data (`unlock_all` false). No seed was needed; seed from `main`, never from an old branch, because the seed attaches sheets since 14 Nov.
- [ ] 29.2 Check by hand on production: join the testing code and see all four steps open, then join `TELE8` and see memorise and automate still locked **Owner check.**
- [ ] 29.3 In one sitting on the phone, run the manual walkthroughs already written in other changes: `question-sheet-match-and-open-testing` 8.2 (write journey on the testing course), `rework-home-screen` 10.2 (first visit, quick check, all four steps in one sitting, signed-out view) and `upload-sentence-builder-pipeline` 5.4 (re-run the first testing walkthrough). Tick each in its own change and write each problem as one line in docs/user-testing-notes.md **Owner check.**
- [x] 29.4 (Superseded 16 Nov: the owner tested the timed round, disliked it and replaced it with El Pasillo as the fourth step; see change `el-pasillo-final-step-and-voice-demo`.) Run the timed round on `/lab/automate` once for each fake student, then once for real through the testing course to the result screen **Owner check. This is the final phase that has never been tested end to end.**
- [ ] 29.5 Repeat 29.3 and 29.4 on the school Chromebook with a headset **Owner check.**
- [ ] 29.6 Run one pass through `TELE8` with real written answers, because the testing course practises model answers and does not exercise the memorise ladder on a student's own answers (27.4) **Owner check.**
- [ ] 29.7 Archive finished changes: `course-unlock-testing-mode` (17 of 17) and `automate-lab` (12 of 12) now, and the others as their open tasks close. `openspec/specs/` is empty, so the first archive has to sync delta specs; `rework-home-screen` 9.4 says to sync after this change
- [x] 29.8 Decide what to do with demo mode (24.1 to 24.3): remove it or rebuild it **Decided 16 Nov: rebuilt around real voice recognition, on the real screens, ending in El Pasillo, with the hub explaining the journey (change `el-pasillo-final-step-and-voice-demo`).** Originally: deferred by the owner on 16 Nov; they disliked the Pretend buttons. `/demo` and the "Try the demo" link on `/welcome` are still on `main`. Change nothing until decided, and treat the demo script (16.4) as on hold.
- [ ] 29.9 The testing course `PRBA7K3M` has five questions, each with its own sentence builder from the teacher's Year 8 sheets (change `testing-course-five-builders`). Built from local, gitignored data; the code, tests and docs are done and verified locally. Clips built (396, about £0.39) and production seeded on 16 Nov. **Open:** deploy the code and clips (the live write screen needs the `WriteSheet` change), then join `PRBA7K3M` on the live site and open each question (task 7.1 of that change) **Stopgap 17 Nov:** the built clips for this course are committed with their ids listed in `lib/audio/stopgap-clips.json` so a fresh clone passes the clips test; the clips' text is therefore in the public repo. Clip storage is to move to object storage under change `clip-storage-and-sharing`, and the five questions move to real per-question builders under `course-builder-per-question`. **Per-question builders 17 Nov:** change `course-builder-per-question` replaces the merged sheet with five real builders, one per question, and adds the same for any course (data in `course_builders`). It still needs the migration run on production and a deploy (its tasks 5.3 and 6.3).

## 30. Work done outside the spec (recorded 16 Nov)

Built in cloud sessions or direct commits and folded back without a task. Recorded here so the history matches the code.

- [x] 30.1 Audio build makes one natural-speed call per text, and the slow and fast versions are made locally with ffmpeg **Built 13 Nov (0b69a2a).**
- [x] 30.2 Audio build writes 64 kbps output, has `--limit` for a listening test, removes old clips after a full build and allows the voice tag on newer models **Built 13 Nov (963f68c).**
- [x] 30.3 Optional per-sentence voice tag in the audio build, with the setting noted in `.env.example` **Built 13 Nov (8b60f10, 94bdc9b).**
- [x] 30.4 The clip index lists only clips that are in git, and a full rebuild regenerates it **Built 13 Nov (94bdc9b).**
- [x] 30.5 Rebuild all 309 clips on `eleven_v4`, with bit clips and Tele's fixed lesson lines, replacing the `eleven_v3` clips **Built 13 Nov (7cc3236), about 0.65 GBP.**
- [x] 30.6 Measure the JavaScript budget on real student and teacher screens (leaving out `/lab` and `/spike`) and raise it from 300 KB to 400 KB by the owner's choice **Built 12 Nov (3fc2ace).**
- [x] 30.7 Speed up CI: shard Playwright four ways, install Chromium only, cache npm, cancel superseded runs and stop running CI twice per push; the full suite took about 17 minutes on one worker **Built 14 Nov (5f2c047).**

- [x] 30.8 Make the sentence builder sheet mandatory and remove the old write flow: a course cannot be created or published without a sheet, the write phase is the sheet only, and the slot-builder screen and its text save path are deleted **Built 14 Nov (b62447c).** Overtakes the slot-builder parts of sections 7 and 26.
- [x] 30.9 Seed attaches the sentence builder sheet to every seeded course, with plain SQL so the script runs under node **Built 14 Nov (f09b066, 2441c9c).**
- [x] 30.10 Show a message instead of crashing when a course has no sheet (React error 441 in production on the write page) **Fixed 14 Nov (3334490).**
- [x] 30.11 Add El Pasillo, a dreamcore corridor speaking game at `/lab/dreamcore`, which uses the student's own answers when there is a profile **Built 15 Nov in a cloud session (90d5e35).** Live at `/lab/dreamcore` (owner confirmed 16 Nov).
- [x] 30.12 Add Neon CLI config and a branch policy (`neon.ts`: 7-day TTL for new non-default branches) **Built 14 Nov (6427aaf).**
- [x] 30.13 Add promo video assets under `docs/promo-video/` (about 140 files, not part of the app) **Added 15 Nov (66e4982, af811c6).**
- [ ] 30.14 Remake the promo video in HyperFrames with real footage in place of the `/brag` output, using the `product-launch-video` route with a storyboard the owner approves before the build (planned 16 Nov; supersedes the `/brag` attempt in `docs/promo-video/`)
  - [ ] 30.14a Owner records, on a phone in portrait with Do Not Disturb on, volume about 70% and mic off in the recorder: a few seconds of the memorise phase, of El Pasillo (`/lab/dreamcore`, live) and of Tele talking with the app's own sound. Separate takes with about 5 seconds of padding each end; iPhone captures app audio, on Android test 5 seconds first
  - [ ] 30.14b Footage goes in a new `promo/footage/` folder (not in the app bundle); demo content only, no real student data, and Tele on the rebuilt `eleven_v4` voice (30.5), never edge-tts
  - [ ] 30.14c Settle audience, length and format (vertical or 16:9), and voiceover, captions or music only, before the storyboard
  - [ ] 30.14d Storyboard approved by the owner, then build, preview in Studio and render
  - [x] 30.14e Generate the storyboard sketch images in `docs/promo-video/` (beats 1 to 4, 7, and four Dolores poses as transparent PNGs) with Nano Banana 2 via the Made API, `MADEAPP_KEY` in `.env.local`, 9:16, about 17 credits spent; still to review: the owner's approval of the look, and whether the reference sketches are an invented character

**Superseded by `rework-home-screen` (14 Nov):** 6.2 (the mastery rule is now three correct answers, with no two-session gate), 10.4 (the baseline page and start.exe are removed and the placement check moved into Understand), 11.3 (the daily reminder is removed) and 13.4 (My progress, own history and the class goal are removed). The ticked boxes stay as history. **Overlaps `upload-sentence-builder-pipeline`:** 17.1 and 23.6 (photo import and scan-to-start) now sit with that change's 5.1c and 8.1.
- [x] 30.15 Make El Pasillo the fourth step in place of the timed round, with mounting pressure (only matched words slow the monster), steeper escalation, automatic look-behind, runs recorded as timed attempts, the rebuilt voice demo, welcome and desktop copy, the public README and `docs/roadmap.md` **Done 16 Nov in change `el-pasillo-final-step-and-voice-demo`.** The old timed round stays at the unlinked `/phases/automate/round`. Postponed items are in `docs/roadmap.md`.
- [x] 30.16 Turn El Pasillo's flat six-rung run into a five-stage scaffolding ladder with an earned no-help escape, the question spoken from stage 3, and a stage-and-one-suggestion result screen **Built 19 Nov in change `el-pasillo-scaffolding-ladder`. The owner's phone play-through (its task 4.1) is still to do.**

## 31. Other OpenSpec changes on main (state on 16 Nov)

Cloud sessions made these as their own changes. None is archived and the list was not linked here until now.

| Change | Tasks done | Open |
|---|---|---|
| `course-unlock-testing-mode` | 17 of 17 | none, ready to archive |
| `automate-lab` | 12 of 12 | none, ready to archive |
| `question-sheet-match-and-open-testing` | 26 of 27 | 8.2, a manual walkthrough (in 29.3) |
| `rework-home-screen` | 50 of 52 | 9.4 (sync specs at archive), 10.2 (manual walkthrough, in 29.3) |
| `upload-sentence-builder-pipeline` | 26 of 35 | 5.1c, 5.3, 5.4, 6.1 to 6.3, 7.3, 8.1, 8.2; 5.1c and 6.2 need a model key |

## Workflow follow-up

- Review the artifacts, then start implementation with the apply workflow.
- Archive this change after the application passes user testing.
