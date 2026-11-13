# Design

## Context

Greenfield project, solo developer, two weeks, about £30 of paid services. Primary device is a phone browser; secondary is an old school Chromebook with a cheap headset. The app is homework, not classwork. Stack the developer already knows: TypeScript, React, Next.js, Node, REST, Neon Postgres, Vercel. See proposal.md for motivation and specs/ for behaviour.

The look and the character were designed with the first test user. The visual direction is in `docs/design-direction.md`, the reasoning behind each conflict with the earlier plan is in `docs/design-conflicts.md`, and the source boards are in `docs/design/`. The earlier lip-sync prototype (jaw driven by loudness, lips driven by visemes) is retired for v1 because the character, Tele, has no mouth. See D7.

## Goals / Non-Goals

**Goals:**
- One vertical slice that works end to end for one real course: write, hear, memorise, automatise.
- Per-student marginal cost near zero in the practice loop, with a measurable cost-per-student figure to demonstrate scalability.
- Privacy by design: no personal identifiers, no stored audio.
- A character that looks and sounds alive and never speaks English, in a world one teenager would love.
- Play that helps a student open the app but never dilutes the gated progress.

**Non-Goals:**
- Accounts, authentication, payments, native apps, or a full teacher product.
- Phoneme-level pronunciation scoring or any model that grades pronunciation finely.
- Live open-ended conversation with a language model.
- Generating content for arbitrary languages or exam boards.
- A virtual-pet wrapper, mini-games, a notes tab, a doodle pad, a student-drawn tutor and theme switching (parked, see tasks 17.3).

## Decisions

### D1. Next.js PWA on Vercel with Neon Postgres and Blob storage
One TypeScript codebase for UI and API routes; installable on phones; serverless fits a spiky homework workload. Alternatives: native app (slower, store friction), separate API service (more to run in two weeks). Hosted in a UK or EU region where available.

### D2. Anonymous profile instead of accounts
A random profile ID is held in device storage and mirrored by a server row, with a short recovery code. Course owners get an unguessable owner link. This removes passwords and personal data and answers the data-protection problem by design. Alternative: school SSO or email login, rejected as heavy, slower to adopt, and a larger data-protection surface.

### D3. Cost router as a thin wrapper around every external call
All paid calls go through one module that checks the budget, applies per-profile rate limits, logs service, size and estimated cost, and picks a fallback when a cap is reached. Tiers, cheapest first: stored result, rules, speech recognition, small language model, large model. Live practice loops never call a language model.

### D4. Speech recognition behind an interface
Primary: the browser's built-in recogniser (free, instant, adequate on Android Chrome and Chromebooks). Fallback: server-side transcription of a short clip held in memory only and discarded. The interface lets the fallback vendor change without touching features. Alternative: always server-side, rejected for cost and latency. A prototype spike in the first days decides which devices need the fallback.

### D5. Shallow pronunciation feedback by design
The score is a word-level diff between transcript and the student's script. A matched word means the recogniser understood it, which is the intelligibility standard. A hand-written confusion table maps mismatches to one-line tips. Spanish syllable splitting is rule-based, so no service is needed. Azure pronunciation assessment and phoneme scoring are deliberately not used.

### D6. Offline audio build with cached outputs, ElevenLabs character voice
At publish time a build script synthesises each question in the character voice at three rates using the provider's speed setting (not time-stretching), stores MP3s and a timeline JSON per clip in object storage, keyed by hash of text, voice and rate. The student's own answers are voiced on demand once per answer and cached. The production character voice is an ElevenLabs voice chosen by the developer. Before launch, confirm the plan and cost against the budget, the licence terms for school and under-18 use, the availability of word timestamps and a speed setting, and a second voice for rotation. The unofficial edge-tts voice stays prototype only, and the build script isolates the provider so it can change. Alternatives: runtime TTS per request, rejected for cost and latency. The slower, more enunciated character voice is treated as a feature for listening practice, not a validity problem.

### D7. Clip timelines and a feeling-driven character
Each clip's timeline contains word times (from provider timestamps where available, otherwise from rules), a downsampled loudness envelope and a feeling track, so the browser never decodes audio. The character, Tele, has no mouth: its feelings (joy, sadness, anger, fear, surprise, disgust, blendable) are drawn through the eye, antennae, picture and world, and while speaking its screen and antenna tips glow with the loudness and the caption highlights the current word. Playback is driven by the audio clock inside the animation frame, never by timers, and scales with playback speed. Feelings are baked at build time per phrase-bank line, with a rule-based word list as fallback; no language model is called at runtime. The rule-based Spanish syllable and stress module is kept because syllable breakdown for missed words needs it; the viseme rules, mouth parameters and 30 ms lead are dropped. Decided at M1: v1 keeps the sketch's canvas drawing, ported nearly verbatim into `lib/tele/` so the approved look does not drift, with a typed input API (feelings, loudness, speaking, question). **Redesigned 12 Nov 2026:** the designer's `tele-react` package (kept for reference in `docs/design/tele-react/`) replaces the all-procedural body and television with painted sprites (television casing, screen mask, turtleneck, jacket halves, hands, door, mushroom, cloud sheet) while the eye, feelings, antenna spring, tears, static and glitch stay procedural. Ported into `lib/tele/draw.ts` the same way: the drawing is verbatim, but the package's own clip player, audio tap and word timing are not used, because the app's playback and baked timelines already drive Tele (D7 above). The input API gains a `jacket` option (on by default) and `channelChange()` (dial turn and static flash). The stage is now 400 by 360 drawing units (was 400 by 430). Sprites are WebP under `public/tele/` (about 330 KB; the designer's PNGs were 1.7 MB) and load once, without blocking: until they arrive the antennae and world are drawn and the television appears when its sprites load. The 30 fps and 1.5 pixel-ratio caps are unchanged. A layered-SVG rebuild via `docs/art-pipeline.md` is a later option if the art needs to be editable. Alternatives considered: keep a mouth and the validated lip-sync (rejected, the design choice is a mouthless character), a side-on mouth diagram for pronunciation moments (deferred), Azure viseme events (not needed).

### D8. Rubric by tagged chunks and editable calibration data
Each chunk in the sentence builder carries feature tags, and the course's calibration data defines the features themselves: the justified-opinion frame, seven extra features (contrast, frequency or time phrase, "lo hago" or "lo hacemos", another time frame, closing line, reason beyond "es" plus an adjective, second justifier) of which three are hard, and which are checked by phrases or tags. This is deterministic, cheap, explainable to students, and does not depend on a model judging Spanish.

Superseded by D20: the three named levels are removed; each feature has a value in the calibration data and an answer's value is their sum. The text below describes how features were defined and is kept for the feature list. Repeating the frame adds nothing and each feature counts once. Whole-test targets (three tenses, two justified opinions) are a shown checklist and gate nothing. Feature definitions, thresholds, level names, glue words and the teacher's example answers are data files (`lib/course/calibration/`), versioned and overridable per course, with the teacher's examples run as regression fixtures, so live-testing problems are fixed by editing data. Level names are never shown as a ladder.

Grades are never shown or mentioned in the app and no grade mapping is kept. A test fails if a screen mentions grades.

### D9. Language model at upload time only, for course set-up and content generation
When a sentence builder is uploaded, one call to a small model through the cost router sets the course up: it flags chunk combinations that do not make sense and writes model answers for every question and level, given the calibration data and teacher examples as context. Code validates every word against the allowed set and the deterministic rubric must place each answer at its intended level; a mismatch is regenerated once, then marked missing. The writing stage makes no model call. The same tier generates the character's phrase bank and, if built, converts a sentence-builder photo into chunks. Student free text is never sent to a model. Open: whether a teacher reviews the output before publishing, and whether the call also proposes extra feature phrases (see the answer-writing-coach spec).

### D10. Mastery as separate-session evidence
Each item has a mastery record counting qualifying successes and the distinct sessions they occurred in. Thresholds (default three successes across two sessions) are configuration. Scheduling uses short intervals inside a session and a next-session queue, in Leitner style, with items tagged by cause so support can adapt.

### D11. Diagnostics from small event data
Every attempt is an event. Cause tags come from rules over probe variations (slow word alone, normal word alone, in sentence), and timed versus untimed outcomes. The mood check-in is removed (parked in learning-diagnostics). The tag set is a closed list so analytics and the teacher overview stay simple.

### D12. Engagement as a coin ledger
Coins are append-only ledger entries earned for effort and improvement, and only from practice: exploring the desktop and poking the character earn nothing. Rank derives from rolling average response time and is shown as a ladder of named steps. Coins buy fixed-price desktop items (wallpapers, objects) and stickers; there are no random draws. No real-money flow exists in the codebase. Streak freezes are earned items. Phase progress is shown in the character's world (channels that clear from static, locked phases as static) without changing the gated order.

### D13. Data protection artefacts shipped with the code
A short data-protection impact assessment, a student-facing privacy notice, and a delete-everything action are deliverables, not afterthoughts. Any third-party speech or language service is used with no-retention settings where offered.

### D14. Testing approach
Pure logic (syllabification, timeline generation, rubric counting, mastery, diagnostics rules, cost routing) gets unit tests. Speech and audio paths get a manual device matrix (Android phone, iPhone, Chromebook with headset and built-in microphone). One end-to-end scripted run covers the four phases against a seeded course.

### D15. One dreamcore theme with a separate accessibility layer
Visuals are defined as design tokens (colours, fonts, backgrounds, motion intensity) in one dreamcore set, structured so a second set is cheap later, but no theme switching ships in v1 and there is a single level of weirdness. Accessibility settings (calm switch, reduced motion) sit in a separate learner-controlled layer, and the accessibility floor is never a theme: WCAG AA contrast for text (4.5:1), no meaning carried by colour or blur alone, a legible body face with stylised faces for titles only, visible keyboard focus and generous tap targets. Atmosphere (camcorder effects, grain, collage) sits around the task, on the home desktop and in empty states and transitions, and never over question, caption or feedback surfaces. Light and dark themes are replaced by this one theme. Alternatives: light and dark themes (rejected, the Windows-style chrome is fixed-colour), a weirdness dial (parked).

### D16. Student-flow principles apply to every screen
Never hold a capable student back (skip by proof), always a way out, no dead ends, one screen without scrolling in practice, English-only interface, disabled controls after use (see `student-flow-principles`). They are testable: a Playwright check at 360 by 640 for each practice screen, and an exit control on every screen inside a section. Evidence: first user-testing round, 9 Nov 2026.

### D17. Starting point is a skip, not a lesson
The placement check is one pass: hear each question once, choose its meaning, get a results screen. All right first time skips the comprehension memorise stage. Anything wrong sends only those questions into the stage. It replaces the previous test-teach-test, which looped. The mood check-in and the session plan with timings are removed because they changed nothing a student could see and timings could not be measured. Students are told once that short, repeated sessions work better.

### D18. Feedback rhythm modelled on a recorded Duolingo session
Cast-like feedback (instant panel, sound, varied praise) is separate from the tutor. The tutor, like the mascot in that session, speaks only at meaningful moments (start, combo of five, mistake review, personal best, end) and otherwise gives wordless reactions. Loss framing (hearts, league demotion, streak-loss threats) is deliberately not copied. Source: `docs/knowledge/duolingo-ux-research-notes.md`. A tutor line never blocks the feedback panel; the earlier 1.5 second enforced pause is removed.

### D19. Task types are components; games are proposals
Memorise and comprehension sessions are built from small task-type components (match pairs, sentence scramble, fill the gap, tap what you hear, say it, hear and choose) chosen by a session mixer using a difficulty curve. A Blooket-style game (for example tower defence) is not a task type and is built only after the owner approves a written proposal. Time-to-answer play for automatisation (Times Tables Rock Stars style) rides on response-time rank and personal bests.

### D20. Writing flow: build from blank spaces, value instead of levels
Decided 9 Nov 2026 (record: `docs/writing-flow-options.md`). Everyone starts with empty slots laid out like the sentence builder, coloured by chunk kind in the same colours as the automatise chunks. There is no target or level picker. An optional generated starter answer fills the slots. Tapping a slot shows only fitting chunks; guidance about what combines comes from fit rules, since a sentence builder cannot be made fully deterministic. Answers have a value in the in-app currency (euros) that blends the number of extras with the difficulty of each; it is paid as the answer is memorised and automatised, with a bonus for finishing all five answers. The coach nudges one optional extra at a time into the challenge zone, and a student can prune a stalled answer (changing a confirmed answer resets its progress). An animated analysis, on request and cancellable, explains the value. Named levels are removed from the student's view and the spec. Glue words sit in a "cement" tray. Only the question's linked sentence builder supplies chunks. Onboarding is deliberately none: the flow must be intuitive on its own.

### D21. Memorising: a ladder of fading help, in short lessons, with live listening
Decided 12 Nov 2026 from two prototypes and a lab build (record: `docs/design/memorise-ladder-prototype.html`, `docs/design-direction.md`, `docs/user-testing-notes.md`). The end state is saying the answer on hearing the Spanish question with nothing on screen, so the question, not the English, is the final prompt and is spoken before every whole-answer attempt. Help has five levels (listen and repeat, first letters, empty blocks, English only, just the question) that the student never sees as a meter. An answer is learned in lessons with a progress bar: listen and repeat, first letters (bit on bit, a sentence at a time), from memory, and a next-day check. Inside a lesson a slip adds screens that fix the one bit; two slips put words back; three clean first attempts take words away and skip covered screens. While the microphone is open the screen shows it is hearing: words light as they are understood, the screen ends by itself when all is said, a pause brings a hint and never a timeout, and a student who carries on past one fudged bit passes and only tidies that bit. This needs the browser recogniser's interim results, so devices on the server fallback cannot light words live; what they get instead is open (see Open questions). The lab at `/lab/memorise` runs this on sample answers; the memorise phase still runs the earlier design until task 27.4.

### D21. Course shape and the teacher flow
A course has one or more sentence builders, four or five questions, and core or extension questions. In version one the developer runs the setup steps through scripts on the teacher's behalf; the teacher-facing page, photo scan and teacher edits with screening are stretch (owner, 9 Nov 2026), calling the same server functions when built. No teacher accounts; the owner link is the credential. Coursework submission dashboards are parked.

### D22. Demo mode is a separate, isolated path
Demo mode runs on a built-in sample course with no profile, no database writes to real tables and no paid calls beyond cached assets, with a "pretend" button for every spoken step.

### D23. Where the API sits
There is no separate API service. The "API" is the set of Next.js route handlers under `app/api/*` (join, profile, attempts, respond, recall, probe, baseline, transcribe, clips, clip-failure, shop, mood, answers, owner/cheeky), deployed as Vercel functions beside the pages. The browser calls them with fetch; they call the database, the cost router and, for transcription and set-up, outside services. Each is listed with its trigger, caller, target and the cases where it is not called in `docs/api-map.md` (to be written, task 25.1). Practice rounds make no language-model call. The mood route becomes unused once mood is removed.

## Risks / Trade-offs

- Browser speech recognition may be poor on iPhone Safari or noisy rooms → fallback recogniser, a no-penalty retry rule, and an early device spike.
- Teen L2 Spanish may be mis-transcribed, making the score feel unfair → score words as matched when understood, show uncertainty honestly, never penalise recognition failures.
- ElevenLabs plan, licence terms for school and under-18 use, or cost may not fit the budget → check in task 4.1 before building the audio pipeline; build script isolates the provider; unofficial edge-tts must not ship.
- Collage photos, canvas animation and effects may be too heavy for an old Chromebook → set and measure a performance budget at M1, effects only on the home desktop and empty states, compressed static wallpapers.
- Play could replace practice for a student who opens the app to explore → coins and progress only from practice, the gate unchanged, no timers or penalties on exploring.
- Two weeks is tight for fourteen capabilities plus a new look → build order is vertical-slice first with the look early (see tasks.md); photo import, cheeky pool, deep teacher views and all parked items are the first to cut, and cutting them does not break other capabilities.
- Language-model drafting may produce out-of-bank Spanish → validator plus model-answer fallback.
- Anonymous profiles mean lost phones lose progress → recovery code, accepted trade-off.
- Cost estimates depend on vendor prices that were not verified → meter real usage during user testing and publish the measured figure.
- Copyright of sentence-builder material and design photos → only developer-authored content in v1; no third-party worksheets; every photo logged in `docs/asset-credits.md` with its licence before it ships; no brand logos, recognisable people, or virtual-pet toy trade dress.

## Migration Plan

Greenfield. Deploy preview builds on each branch, one production deployment for user testing. Seed one course by script. Roll back by redeploying the previous Vercel build; database changes are additive migrations. Delete test profiles through the same delete-everything action students use.

### D22. Live listening on devices that use the server recogniser
Decided 12 Nov 2026 (task 27.12), to be confirmed by the owner. A device goes onto the browser recogniser first: the lab's device report (`/lab/memorise`, Tester tools) shows whether it sends interim results, and a device that does is verified in `docs/device-matrix.md`. Only a device that does not stays on the server recogniser, and there live listening is the level indicator plus marking at the end: the indicator moves with the voice from the microphone alone, the screen ends by itself once the voice has been heard and then stopped for about a second and a half, the clip held in memory goes to the transcribe route, and the words light together when the answer comes back, within the two-second rule. Nothing lights while speaking on that path, and the student is not asked to mark themselves unless there is no microphone at all. It is not built until a verified-failing device needs it: no device is known to be in that position yet, so building it now would be speculation.

### D23. One rule for when a bit counts as said
Decided 12 Nov 2026 (task 27.13). A bit counts as said when at least 70% of its words were understood, and a long word one letter out counts as understood. This replaces the stricter every-word rule in `lib/practice/chunk-said.ts`, so live listening in the lab and the practice screens agree. It follows the product rule that a recognition failure is never held against the student: one slipped word in a longer bit does not send them back to say it again. A one-word bit still has to be understood, and a short word one letter out does not count. The rule lives in `lib/speech/live-match.ts` (`CHUNK_SAID`, `chunkIsSaid`).

## Open Questions

- ElevenLabs: which plan, whether its licence covers school and under-18 use, whether word timestamps and a speed setting are available, (task 4.1). A second voice for rotation is deferred, by decision (see docs/voice-decision.md).
- Which fallback speech recogniser vendor to use (decided by the device spike).
- Exact response-time thresholds for each rank (tuned from user testing data).
- Writing flow details still open: euro naming confirmation, value-formula weights, size and timing of the all-five bonus, how pruning treats earned progress, whether to build outwards from the main verb phrase, the analysis animation (docs/writing-flow-options.md, section 8).
- Challenge mode: what the multi-screen flow is. Needs a design pass (go back to the design tool).
- Spoken translation into English as the comprehension check: data-protection and recogniser accuracy (question-comprehension spec).
- Game modes for memorise (Blooket-style) and automatise (time-shrinking): proposals first, nothing built.
- Teacher review of generated model answers before publish; the teacher-facing setup page, photo scan and edit screening are stretch.
- How extension questions are surfaced to higher-ability students without accounts (optional stretch for all, as specified).
- Parked: mood check-in, student interests that shape suggested model answers via tagged verb phrases, whether phases merge (memorise with automatise), the visual look (dreamcore is not yet right; deferred until the flow is settled), the production voice (audition needed).

