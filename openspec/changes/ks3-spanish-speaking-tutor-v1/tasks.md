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
- [x] 6.2 Implement the mastery rule (three correct across two sessions, configurable) and in-session spaced return; verify unit tests including the single-session case
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
- [x] 10.4 Build the mood check-in and the baseline test-teach-test at course start; verify the dislike option leads to an easy quick win
- [x] 10.5 Feed tags into session planning so tagged items get adjusted support; verify the too-fast case starts slower

## 11. Revision planner

- [x] 11.1 Build the countdown, phase display and readiness meter that names its next action; verify unit tests for the readiness calculation
- [x] 11.2 Build the session plan from minutes and days left, with redistribution on missed days and late-starter mode; verify unit tests for each case
- [x] 11.3 Add opt-in reminders and the after-test-date state; verify no notification is sent without opt-in

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
- [x] 13.4 Implement own-history progress and class-total goals with no individual names; verify the class goal shows only totals
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

- [ ] 23.1 Document the teacher flow end to end (steps, where each runs, calls made, what is cached) in docs/teacher-flow.md, including the question of local versus server; verify it matches the scripts
- [ ] 23.2 Extend the course schema for one or more sentence builders, four or five questions and core or extension questions; update readiness and the overview; verify with a two-builder, four-question seed course
- [ ] 23.3 Record the draft, set-up, review, publish and share status per course; make publish block on missing items; verify re-publishing unchanged text makes no new calls
- [ ] 23.6 Stretch: add scan-to-start (photo of a sentence builder to an editable draft) with a manual fallback, and edit screening (length, blocklist, valid words, class-code visibility, disable course); verify a blocklisted edit blocks publishing.  Stays with 17.1 as stretch
- [ ] 23.4 On hold: a teacher-facing setup page that calls the same server functions as the scripts, with regenerate-owner-link; do not start until the owner decides
- [ ] 23.5 Parked for later: coursework submission dashboard

## 24. Demo mode (M10)

- [ ] 24.1 Build the demo entry, sample course and isolated session with a Demo label; verify nothing is written to real tables
- [ ] 24.2 Build the one-minute stops (hear, memorise, timed round, tutor, rewards, teacher overview) with direct access and the pretend button for spoken steps; verify the whole tour runs with no microphone
- [ ] 24.3 Add reset and a recording-friendly switch; verify reset returns to stop one

## 25. Documents for the evaluation and presentation

- [ ] 25.1 Write docs/api-map.md: every route under app/api, its trigger, caller, target, auth, cost-router use, and when it is not called, with a sequence diagram per main flow; verify against the route files
- [ ] 25.2 Write an evaluation plan that answers each success criterion in proposal.md from test notes or the cost log
- [ ] 25.3 Run a voice audition (three or more voices, clarity and pace) with a Year 8 student; record the decision in docs/voice-decision.md
- [ ] 25.4 Write the one-page character reaction spec (states, variants, when the tutor speaks); verify it matches practice-session-feel
- [ ] 25.5 Write game-mode proposals for memorise and automatise for the owner to approve; build nothing until approved
- [ ] 25.6 Update docs/PRD.md and docs/ARD.md where they still describe the mood check-in, the session plan, exactly five questions or one sentence builder; verify with a search

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
- [ ] 27.4 Move the ladder and live listening into the memorise phase with the student's own confirmed answers and chunks: store lesson progress and recalls per profile, reconcile with the mastery rule and scaffold state already stored (lib/memorise/fade.ts, lib/practice/scaffold.ts), pay euros through the existing ledger, replace the lab's device voice with built clips for answer bits, and update tests/memorise.spec.ts; verify the journey test passes
- [x] 27.5 When a student has said some bits of a longer screen and stalls, mark the next bit to say and offer that bit's hint and audio directly; verify with a stand-in recogniser that the marker moves to the first unsaid bit **Done 12 Nov:** after a pause on a screen of three or more bits with some said, the next unsaid bit is marked with Hint and Hear it for that bit (lab, stand-in recogniser tests); owner to try on the phone.
- [ ] 27.6 Offer pronunciation support (slow audio and syllables, reusing the word practice from task 5.4) when the same word stays unlit on three attempts in a lesson; verify by unit test on the repeat counter and Playwright for the offer
- [x] 27.7 Make live matching aware of position so a repeated word lights only at the student's place in the sentence; verify with an answer that repeats "me gusta" **Done 12 Nov:** matching prefers unbroken runs and lights a repeated word only at the student's place (`lib/speech/live-match.ts`, design in the file header); unit and Playwright tests cover the repeated "me gusta" and a recogniser that repeats itself; owner to try on the phone.
- [x] 27.8 When the end is reached with a bit missing, direct the student back to that bit in place and let saying it complete the screen; verify with a stand-in recogniser **Done 12 Nov:** the screen no longer ends when the last bit is said with one missing; the bit is marked and saying it completes the screen as helped (not clean); Move on keeps the "kept going" credit; owner to try on the phone.
- [x] 27.9 Measure speech-to-highlight delay on a real Android phone, set a budget in docs/performance-budget.md and docs/device-matrix.md, and reduce it (fewer renders per interim result, lighter matching); verify against the budget on the phone **Done 12 Nov:** measured on the reference Android phone (result to screen median 13 ms; first word median 2.1 s), budget set from it in docs/performance-budget.md and recorded in docs/device-matrix.md; our share is under a frame and the rest is the recogniser's.
- [ ] 27.10 Signal speaking screens and tapping screens apart with little or no text, without any transition or interruption when the kind changes; verify with a student that the change is understood unprompted **Built 12 Nov, waiting for a student check:** a quiet badge on every screen (microphone to speak; mouse pointer or pointing hand to tap); the first version's flash-up icon was removed after owner testing because it interrupted flow; Playwright covers it. Tick when a student understands the two kinds unprompted.
- [ ] 27.11 Keep the screen awake while a lesson listens and resume listening after a screen lock or return from the background, without dropping to self-marking; verify on a real Android phone **Built 12 Nov, waiting for the phone run:** wake lock while a lesson listens, listening resumes on return from a lock or the background, errors just after hiding are not read as a fault; Playwright covers it with stand-ins. Tick when it holds on a real Android phone.
- [ ] 27.12 Decide what live listening is on devices that use the server recogniser, and record the browser recogniser results for Android, iPhone and Chromebook in docs/device-matrix.md using the lab **Decided 12 Nov (design D22, owner to confirm). Android lab run recorded 12 Nov (the row stays Unverified until the `/spike/speech` run passes); still to run and record: a PC or Chromebook and an iPhone** (paste each device report into docs/device-matrix.md).
- [x] 27.13 Decide whether a bit counts as said at 70% of its words with long words one letter out (the lab) or at every word (lib/practice/chunk-said.ts), and use one rule everywhere **Done 12 Nov:** the lab's rule is used everywhere (design D23); `saidChunks` now uses it and its tests cover one slipped word, a long word one letter out, and a one-word bit.

## Workflow follow-up

- Review the artifacts, then start implementation with the apply workflow.
- Archive this change after the application passes user testing.
