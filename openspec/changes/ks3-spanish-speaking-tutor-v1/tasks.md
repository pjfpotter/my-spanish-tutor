# Tasks

## 1. Project setup and shared foundations

- [x] 1.1 Scaffold the Next.js TypeScript app with PWA manifest and deploy a hello-world preview to Vercel; verify the preview URL loads on a phone and can be added to the home screen
- [x] 1.2 Create the Neon database and an initial migration for courses, chunks, questions, profiles, answers, attempts, mastery, coin ledger, plans and cost log; verify migration applies cleanly on a fresh branch
- [x] 1.3 Build the external-call wrapper (budget check, per-profile rate limit, cost log, fallback hook) with unit tests for cap reached, rate limited and logged cost
- [x] 1.4 Set up the unit test runner and a CI check on push; verify a failing test blocks the check
- [x] 1.5 Write a short README covering setup, environment variables, and how to run the tests; verify a fresh clone follows it successfully

## 2. Speech and device spike (de-risk first)

- [ ] 2.1 Build a throwaway page that records a Spanish sentence with browser recognition and prints the transcript; verify it on an Android phone, an iPhone and a Chromebook with built-in microphone and with a headset
- [ ] 2.2 Test a server-side transcription fallback with a short in-memory clip and verify transcript quality and latency for a 13-year-old's accent (use Dolores and one friend with consent)
- [ ] 2.3 Record the results in a device matrix document and choose the recognition path per device; verify the document lists a decision for each device

## 3. Course content, joining and anonymous identity

- [ ] 3.1 Define the course schema with chunk feature tags, five questions with English subtitles, test date and mark scheme; verify validation rejects incomplete courses (unit tests)
- [ ] 3.2 Seed one hand-authored course and a seed script; verify the script creates it and re-running does not duplicate it
- [ ] 3.3 Implement class codes and the join flow with the privacy notice; verify valid, unknown and repeat codes behave as specified
- [ ] 3.4 Implement the anonymous profile, nickname picker, interest tag picker (fixed list) and recovery code; verify restore on a second browser works and that no free-text field exists
- [ ] 3.5 Implement delete-everything; verify all server rows for the profile are gone and the device returns to first-use
- [ ] 3.6 Write the student-facing privacy notice and the one-page data-protection impact assessment; verify both are linked from the app and review the notice for reading age

## 4. Speech audio assets and lip-sync

- [ ] 4.1 Run the voice audition (Azure, OpenAI, Google, one open-source voice) on the five seeded questions and pick two voices; verify the choice is recorded with reasons and the unofficial prototype voice is not used in production
- [ ] 4.2 Write the build script that synthesises each question in two voices at slow, normal and fast rates using rate control and stores clips by content hash; verify rerunning produces no new files for unchanged text
- [ ] 4.3 Port the Spanish-spelling-to-mouth-unit rules and syllable grouping into a tested module; verify unit tests cover diphthongs, hiatus, silent h, qu, gu, ll, ch, final y
- [ ] 4.4 Generate the per-clip timeline (word times, nuclei aligned to loudness peaks, viseme targets, minimum hold, downsampled loudness envelope) and store it beside each clip; verify timelines exist for every clip and unit tests cover hold filtering
- [ ] 4.5 Build the avatar mouth renderer with the validated settings (jaw by loudness, lead 30 ms, speed 32, minimum shape 70 ms) driven by the audio clock; verify against the prototype at 1×, 0.75× and 0.5× that closures land on sounds
- [ ] 4.6 Implement the missing-clip fallback (text plus subtitle); verify it by blocking a clip in the browser
- [ ] 4.7 Document the asset pipeline in docs/audio-pipeline.md; verify the documented commands regenerate a clip

## 5. Spoken-answer feedback

- [ ] 5.1 Implement speech capture with permission handling and the chosen recognition path per device; verify the permission-denied and unsupported-browser paths on real devices
- [ ] 5.2 Implement word-level diff scoring with accuracy percentage; verify unit tests for missing, extra, swapped and accent-tolerant words
- [ ] 5.3 Implement the confusion table (me/mi, final o, silent h, j, ll, v/b, z/c) and tip display; verify unit tests map each entry and an unmatched mismatch shows no tip
- [ ] 5.4 Implement syllable breakdown with slow word audio for missed words; verify on five sample words
- [ ] 5.5 Implement low-confidence handling (no penalty, retry offer); verify with a noisy recording

## 6. Question comprehension phase

- [ ] 6.1 Build the hear-then-choose screen with voice rotation, speed progression, replay, slow and reveal; verify a revealed attempt does not count toward mastery
- [ ] 6.2 Implement the mastery rule (three correct across two sessions, configurable) and in-session spaced return; verify unit tests including the single-session case
- [ ] 6.3 Gate progression until all five questions are mastered; verify the next phase stays locked until then

## 7. Answer writing coach

- [ ] 7.1 Implement the rubric engine counting tagged chunks into survival, good and showing off with a feature list; verify unit tests across three sample answers
- [ ] 7.2 Implement the word-bank validator with an allowed-word list; verify out-of-bank words are caught
- [ ] 7.3 Build the confidence and minutes questions and the draft request through the call wrapper, returning structured output; verify a draft passes the validator and rubric for each level
- [ ] 7.4 Implement upgrade suggestions (recycled chunks first), interest-tag substitutions and the confirmation gate; verify each by a scripted run
- [ ] 7.5 Implement the model-answers fallback when drafting is unavailable or capped; verify it by simulating the cap

## 8. Answer memorisation phase

- [ ] 8.1 Build English-prompt recall with spoken attempts and accuracy percentage; verify result time under two seconds on a phone
- [ ] 8.2 Implement scaffold fading and chunk isolation; verify unit tests for threshold changes
- [ ] 8.3 Implement memorisation mastery across sessions and encouraging single-next-step feedback; verify unit tests and copy review

## 9. Response automatisation phase

- [ ] 9.1 Build hear-and-answer rounds with shuffled order and varied voices; verify the order differs between rounds
- [ ] 9.2 Measure response time from question end to speech start and store it per attempt; verify against a stopwatch test within a tolerance of a few hundred milliseconds
- [ ] 9.3 Implement adaptive window, blank handling with first-words hint, and the repeat-question phrase; verify each by scripted attempts
- [ ] 9.4 Implement the test-ready threshold and message; verify unit tests

## 10. Diagnostics and mood

- [ ] 10.1 Implement attempt event logging and the closed cause-tag list; verify events carry all specified fields
- [ ] 10.2 Implement comprehension probes and tag rules (too fast, word not known, sound-spelling gap, thrown by context); verify unit tests for each pattern
- [ ] 10.3 Implement recall cause tags and chunk hotspot detection; verify unit tests including the stress pattern
- [ ] 10.4 Build the mood check-in and the baseline test-teach-test at course start; verify the dislike option leads to an easy quick win
- [ ] 10.5 Feed tags into session planning so tagged items get adjusted support; verify the too-fast case starts slower

## 11. Revision planner

- [ ] 11.1 Build the countdown, phase display and readiness meter that names its next action; verify unit tests for the readiness calculation
- [ ] 11.2 Build the session plan from minutes and days left, with redistribution on missed days and late-starter mode; verify unit tests for each case
- [ ] 11.3 Add opt-in reminders and the after-test-date state; verify no notification is sent without opt-in

## 12. Tutor personas, phrase banks and custom drawing

- [ ] 12.1 Design three original personas with art and generate each persona's phrase bank once through the call wrapper, in Spanish at course level with English subtitles; verify banks contain every situation key
- [ ] 12.2 Voice and time every phrase-bank line with the audio pipeline; verify all lines have clips and timelines
- [ ] 12.3 Implement situation-based line selection avoiding immediate repeats and the subtitle toggle; verify unit tests
- [ ] 12.4 Implement interest-tag flavoured banks within course vocabulary; verify no out-of-level words appear
- [ ] 12.5 Implement the own-drawing flow (upload, place mouth, store on device only); verify with the network panel that no image is sent
- [ ] 12.6 Implement reduced-motion behaviour; verify with the system setting enabled

## 13. Engagement and rewards

- [ ] 13.1 Implement the append-only coin ledger and effort-based awards; verify a low-scoring attempt still earns coins
- [ ] 13.2 Implement the response-time rank from rolling averages; verify unit tests at rank boundaries
- [ ] 13.3 Implement collectibles, packs with server-side odds, stickers and streak freezes; verify there is no payment path in the codebase
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

- [ ] 16.1 Run one scripted end-to-end pass of all four phases on the seeded course; verify it completes on phone and Chromebook
- [ ] 16.2 Run user testing with Dolores and up to five classmates with parental consent, collect feedback on enjoyment, fairness of scores and lip-sync; verify notes are saved and the top three issues are fixed
- [ ] 16.3 Capture measured cost per student from real usage and add it to the demo; verify the figure comes from the cost log
- [ ] 16.4 Prepare the demo script and short write-up covering education, creativity and technical choices; verify a dry run fits the allotted time

## 17. Stretch (cut first if time is short)

- [ ] 17.1 Implement photo import of a sentence builder with review and confirm, hashed reuse and manual fallback; verify an unreadable photo is handled
- [ ] 17.2 Add meme and reggaeton-style remix of a confirmed answer using the curated pool; verify output stays within the course vocabulary

## Workflow follow-up

- Review the artifacts, then start implementation with the apply workflow.
- Archive this change after the application passes user testing.
