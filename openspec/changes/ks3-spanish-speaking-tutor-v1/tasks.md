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
- [ ] 3.3 Implement class codes and the join flow with the privacy notice; verify valid, unknown and repeat codes behave as specified
- [x] 3.4 Implement the anonymous profile, nickname picker, interest tag picker (fixed list) and recovery code; verify restore on a second browser works and that no free-text field exists
- [ ] 3.5 Implement delete-everything; verify all server rows for the profile are gone and the device returns to first-use
- [ ] 3.6 Write the student-facing privacy notice and the one-page data-protection impact assessment; verify both are linked from the app and review the notice for reading age

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

- [ ] 9.1 Build hear-and-answer rounds with shuffled order and varied speeds; verify the order differs between rounds
- [ ] 9.2 Measure response time from question end to speech start and store it per attempt; verify against a stopwatch test within a tolerance of a few hundred milliseconds
- [ ] 9.3 Implement adaptive window, blank handling with first-words hint, and the repeat-question phrase; verify each by scripted attempts
- [ ] 9.4 Implement the test-ready threshold and message; verify unit tests
- [ ] 9.5 Show the response-time rank as a ladder of named steps with the student's own history; verify at rank boundaries

## 10. Diagnostics and mood

- [x] 10.1 Implement attempt event logging and the closed cause-tag list; verify events carry all specified fields
- [ ] 10.2 Implement comprehension probes and tag rules (too fast, word not known, sound-spelling gap, thrown by context); verify unit tests for each pattern
- [ ] 10.3 Implement recall cause tags and chunk hotspot detection; verify unit tests including the stress pattern
- [ ] 10.4 Build the mood check-in and the baseline test-teach-test at course start; verify the dislike option leads to an easy quick win
- [ ] 10.5 Feed tags into session planning so tagged items get adjusted support; verify the too-fast case starts slower

## 11. Revision planner

- [ ] 11.1 Build the countdown, phase display and readiness meter that names its next action; verify unit tests for the readiness calculation
- [ ] 11.2 Build the session plan from minutes and days left, with redistribution on missed days and late-starter mode; verify unit tests for each case
- [ ] 11.3 Add opt-in reminders and the after-test-date state; verify no notification is sent without opt-in

## 12. Tutor character, phrase bank and calm mode

- [x] 12.1 Write one original character, Tele, and generate its phrase bank once through the call wrapper, in Spanish at course level with English subtitles and a feeling per line; verify the bank contains every situation key
- [x] 12.2 Voice and time every phrase-bank line with the audio pipeline; verify all lines have clips and timelines
- [x] 12.3 Implement situation-based line selection avoiding immediate repeats and the subtitle toggle; verify unit tests
- [ ] 12.4 Moved to stretch (17.3): interest-tag flavoured banks
- [ ] 12.5 Moved to stretch (17.3): own-drawing tutor
- [x] 12.6 Implement reduced-motion behaviour and the calm switch; verify with the system setting enabled and with the switch on that idle motion, glitches and camcorder effects stop and the caption still follows the voice

## 13. Engagement and rewards

- [x] 13.1 Implement the append-only coin ledger and effort-based awards; verify a low-scoring attempt still earns coins
- [ ] 13.2 Implement the response-time rank from rolling averages; verify unit tests at rank boundaries
- [ ] 13.3 Implement fixed-price desktop unlocks (wallpapers, objects), stickers and streak freezes; verify there is no payment path or random draw in the codebase and that exploring the desktop earns no coins
- [ ] 13.4 Implement own-history progress and class-total goals with no individual names; verify the class goal shows only totals
- [ ] 13.5 Add the curated cheeky pool with a course-level switch; verify it disappears when switched off

## 14. Cost control and reporting

- [ ] 14.1 Configure caps and fallbacks for every paid service and verify each degrades as specified when the cap is simulated
- [ ] 14.2 Build the cost-per-student report broken down by tier; verify it matches the cost log for a seeded run
- [ ] 14.3 Add a test asserting practice rounds make no language-model calls; verify it fails if one is added

## 15. Teacher overview

- [ ] 15.1 Build the read-only overview behind an unguessable owner link with phase counts, average readiness and class hotspots; verify the student class code cannot open it
- [ ] 15.2 Add labelled demonstration data kept apart from real students; verify every figure is marked sample in demo mode

## 16. Integration, user testing and demo

- [ ] 16.1 Run one scripted end-to-end pass of all four phases on the seeded course; verify it completes with Playwright on the phone and Chromebook profiles. Optional manual check: the same run on a real phone and Chromebook
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

## Workflow follow-up

- Review the artifacts, then start implementation with the apply workflow.
- Archive this change after the application passes user testing.
