# Design

## Context

Greenfield project, solo developer, two weeks, about £30 of paid services. Primary device is a phone browser; secondary is an old school Chromebook with a cheap headset. The app is homework, not classwork. Stack the developer already knows: TypeScript, React, Next.js, Node, REST, Neon Postgres, Vercel. See proposal.md for motivation and specs/ for behaviour.

A lip-sync prototype has already been built and tuned by the developer and judged "bang on" with these settings: model C (jaw opening driven by audio loudness, lip shapes driven by visemes), mouth leads audio 30 ms, mouth speed 32, shortest shape kept 70 ms, vowels placed on the loudest moment of each syllable. Its approach is carried forward as-is.

## Goals / Non-Goals

**Goals:**
- One vertical slice that works end to end for one real course: write, hear, memorise, automatise.
- Per-student marginal cost near zero in the practice loop, with a measurable cost-per-student figure to demonstrate scalability.
- Privacy by design: no personal identifiers, no stored audio.
- A tutor that looks and sounds alive and never speaks English.

**Non-Goals:**
- Accounts, authentication, payments, native apps, or a full teacher product.
- Phoneme-level pronunciation scoring or any model that grades pronunciation finely.
- Live open-ended conversation with a language model.
- Generating content for arbitrary languages or exam boards.

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

### D6. Offline audio build with cached outputs
At publish time a build script synthesises each question in two or more voices at three rates using SSML rate control, stores MP3s and a mouth timeline JSON per clip in object storage, keyed by hash of text, voice and rate. The student's own answers are voiced on demand once per answer and cached. Prototype voice: edge-tts es-ES Elvira (unofficial, prototype only). Production voice is chosen by listening to Azure, OpenAI, Google and an open-source voice; Azure is the leading candidate for licensing clarity. Alternatives: runtime TTS per request, rejected for cost and latency.

### D7. Lip-sync as precomputed timelines with a parametric mouth
Each clip's timeline contains word times, syllable nuclei and viseme targets plus a downsampled loudness envelope, so the browser never decodes audio. Spanish spelling is converted to mouth units by rules (vowels a, e/i, o, u; closed for m, b, p, v; teeth-on-lip for f; other consonants dropped unless shapes would be longer than the minimum hold). Vowels are aligned to loudness peaks. The mouth is drawn from continuous parameters (width, openness, rounding, press, smile, teeth, tuck) and eased with a critically damped spring; the jaw follows loudness with a faster spring. Playback is driven by the audio clock inside the animation frame, never by timers. Custom drawings reuse the same mouth parameters as an overlay. Alternatives considered: one sprite per phoneme (failed in an earlier attempt), runtime audio analysis only (less deterministic across devices), Azure viseme events (needs the same voice vendor).

### D8. Rubric by tagged chunks, not language analysis
Each chunk in the sentence builder carries feature tags (opinion, justification, connective, sequencer, adjective, tense, idiom). An answer's level is computed by which tagged chunks it uses, with simple counts for tenses and adjectives. This is deterministic, cheap, explainable to students, and does not depend on a model judging Spanish.

### D9. Language model only for writing support and content generation
A small model drafts answers from a prompt containing the chunk bank, level, time budget and interest tags, returning structured output. Code validates every word against the allowed set and recomputes the level; invalid drafts are regenerated once, then replaced by model answers. The same tier generates one phrase bank per persona and, if built, converts a sentence-builder photo into chunks. Student free text is never sent to a model.

### D10. Mastery as separate-session evidence
Each item has a mastery record counting qualifying successes and the distinct sessions they occurred in. Thresholds (default three successes across two sessions) are configuration. Scheduling uses short intervals inside a session and a next-session queue, in Leitner style, with items tagged by cause so support can adapt.

### D11. Diagnostics from small event data
Every attempt is an event. Cause tags come from rules over probe variations (slow word alone, normal word alone, in sentence), timed versus untimed outcomes, and the latest mood check-in. The tag set is a closed list so analytics and the teacher overview stay simple.

### D12. Engagement as a coin ledger
Coins are append-only ledger entries earned for effort and improvement. Rank derives from rolling average response time. Collectible packs use a server-side odds table spending only coins. No real-money flow exists in the codebase. Streak freezes are earned items.

### D13. Data protection artefacts shipped with the code
A short data-protection impact assessment, a student-facing privacy notice, and a delete-everything action are deliverables, not afterthoughts. Any third-party speech or language service is used with no-retention settings where offered.

### D14. Testing approach
Pure logic (syllabification, mouth targets, rubric counting, mastery, diagnostics rules, cost routing) gets unit tests. Speech and audio paths get a manual device matrix (Android phone, iPhone, Chromebook with headset and built-in microphone). One end-to-end scripted run covers the four phases against a seeded course.

## Risks / Trade-offs

- Browser speech recognition may be poor on iPhone Safari or noisy rooms → fallback recogniser, a no-penalty retry rule, and an early device spike.
- Teen L2 Spanish may be mis-transcribed, making the score feel unfair → score words as matched when understood, show uncertainty honestly, never penalise recognition failures.
- Unofficial edge-tts must not ship → production voice chosen before launch; build script isolates the provider.
- Two weeks is tight for fourteen capabilities → build order is vertical-slice first; photo import, custom drawing, cheeky pool and deep teacher views are the first to cut, and cutting them does not break other capabilities.
- Language-model drafting may produce out-of-bank Spanish → validator plus model-answer fallback.
- Anonymous profiles mean lost phones lose progress → recovery code, accepted trade-off.
- Cost estimates depend on vendor prices that were not verified → meter real usage during user testing and publish the measured figure.
- Copyright of sentence-builder material → only developer-authored content in v1; no third-party worksheets are ingested.

## Migration Plan

Greenfield. Deploy preview builds on each branch, one production deployment for user testing. Seed one course by script. Roll back by redeploying the previous Vercel build; database changes are additive migrations. Delete test profiles through the same delete-everything action students use.

## Open Questions

- Which production voice and second voice to use (decided by listening test, no spec impact).
- Which fallback speech recogniser vendor to use (decided by the device spike).
- Exact response-time thresholds for each rank (tuned from user testing data).
