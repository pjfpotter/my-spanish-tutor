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
At publish time a build script synthesises each question in two or more voices at three rates using the provider's speed setting (not time-stretching), stores MP3s and a timeline JSON per clip in object storage, keyed by hash of text, voice and rate. The student's own answers are voiced on demand once per answer and cached. The production character voice is an ElevenLabs voice chosen by the developer. Before launch, confirm the plan and cost against the budget, the licence terms for school and under-18 use, the availability of word timestamps and a speed setting, and a second voice for rotation. The unofficial edge-tts voice stays prototype only, and the build script isolates the provider so it can change. Alternatives: runtime TTS per request, rejected for cost and latency. The slower, more enunciated character voice is treated as a feature for listening practice, not a validity problem.

### D7. Clip timelines and a feeling-driven character
Each clip's timeline contains word times (from provider timestamps where available, otherwise from rules), a downsampled loudness envelope and a feeling track, so the browser never decodes audio. The character, Tele, has no mouth: its feelings (joy, sadness, anger, fear, surprise, disgust, blendable) are drawn through the eye, antennae, picture and world, and while speaking its screen and antenna tips glow with the loudness and the caption highlights the current word. Playback is driven by the audio clock inside the animation frame, never by timers, and scales with playback speed. Feelings are baked at build time per phrase-bank line, with a rule-based word list as fallback; no language model is called at runtime. The rule-based Spanish syllable and stress module is kept because syllable breakdown for missed words needs it; the viseme rules, mouth parameters and 30 ms lead are dropped. Decided at M1: v1 keeps the sketch's canvas drawing, ported nearly verbatim into `lib/tele/` so the approved look does not drift, with a typed input API (feelings, loudness, speaking, question). A layered-SVG rebuild via `docs/art-pipeline.md` is a later option if the art needs to be editable. Alternatives considered: keep a mouth and the validated lip-sync (rejected, the design choice is a mouthless character), a side-on mouth diagram for pronunciation moments (deferred), Azure viseme events (not needed).

### D8. Rubric by tagged chunks, not language analysis
Each chunk in the sentence builder carries feature tags (opinion, justification, connective, sequencer, adjective, tense, idiom). An answer's level is computed by which tagged chunks it uses, with simple counts for tenses and adjectives. This is deterministic, cheap, explainable to students, and does not depend on a model judging Spanish.

### D9. Language model only for writing support and content generation
A small model drafts answers from a prompt containing the chunk bank, level, time budget and interest tags, returning structured output. Code validates every word against the allowed set and recomputes the level; invalid drafts are regenerated once, then replaced by model answers. The same tier generates the character's phrase bank (with a feeling per line) and, if built, converts a sentence-builder photo into chunks. Student free text is never sent to a model.

### D10. Mastery as separate-session evidence
Each item has a mastery record counting qualifying successes and the distinct sessions they occurred in. Thresholds (default three successes across two sessions) are configuration. Scheduling uses short intervals inside a session and a next-session queue, in Leitner style, with items tagged by cause so support can adapt.

### D11. Diagnostics from small event data
Every attempt is an event. Cause tags come from rules over probe variations (slow word alone, normal word alone, in sentence), timed versus untimed outcomes, and the latest mood check-in. The tag set is a closed list so analytics and the teacher overview stay simple.

### D12. Engagement as a coin ledger
Coins are append-only ledger entries earned for effort and improvement, and only from practice: exploring the desktop and poking the character earn nothing. Rank derives from rolling average response time and is shown as a ladder of named steps. Coins buy fixed-price desktop items (wallpapers, objects) and stickers; there are no random draws. No real-money flow exists in the codebase. Streak freezes are earned items. Phase progress is shown in the character's world (channels that clear from static, locked phases as static) without changing the gated order.

### D13. Data protection artefacts shipped with the code
A short data-protection impact assessment, a student-facing privacy notice, and a delete-everything action are deliverables, not afterthoughts. Any third-party speech or language service is used with no-retention settings where offered.

### D14. Testing approach
Pure logic (syllabification, timeline generation, rubric counting, mastery, diagnostics rules, cost routing) gets unit tests. Speech and audio paths get a manual device matrix (Android phone, iPhone, Chromebook with headset and built-in microphone). One end-to-end scripted run covers the four phases against a seeded course.

### D15. One dreamcore theme with a separate accessibility layer
Visuals are defined as design tokens (colours, fonts, backgrounds, motion intensity) in one dreamcore set, structured so a second set is cheap later, but no theme switching ships in v1 and there is a single level of weirdness. Accessibility settings (calm switch, reduced motion) sit in a separate learner-controlled layer, and the accessibility floor is never a theme: WCAG AA contrast for text (4.5:1), no meaning carried by colour or blur alone, a legible body face with stylised faces for titles only, visible keyboard focus and generous tap targets. Atmosphere (camcorder effects, grain, collage) sits around the task, on the home desktop and in empty states and transitions, and never over question, caption or feedback surfaces. Light and dark themes are replaced by this one theme. Alternatives: light and dark themes (rejected, the Windows-style chrome is fixed-colour), a weirdness dial (parked).

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

## Open Questions

- ElevenLabs: which plan, whether its licence covers school and under-18 use, whether word timestamps and a speed setting are available, and which second voice to use for rotation (task 4.1).
- Which fallback speech recogniser vendor to use (decided by the device spike).
- Exact response-time thresholds for each rank (tuned from user testing data).
