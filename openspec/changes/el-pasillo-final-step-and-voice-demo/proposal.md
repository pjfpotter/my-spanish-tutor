## Why

The coursework deadline is tomorrow. The timed "Answer fast" step was tested and disliked, so it has been replaced by El Pasillo, a dreamcore corridor game that already works at `/lab/dreamcore` but is not yet the final step, and which Dolores found too easy (any noise stops the clock) and not tense enough. The demo mode asks the visitor to press "Pretend I answered", which hides the product's main point: gamified, voice-first revision. The public README and the explanation of the student journey are not written for people outside secondary languages teaching.

## What Changes

- **El Pasillo becomes the final step.** The fourth path step opens El Pasillo on the student's own answers in place of the timed round. The old timed round stays reachable only as a lab page.
- **Pressure that mounts.** Only words that match the door's answer slow the chase. Noise, coughs and wrong words do not. Recognition failure is still never penalised.
- **Fear escalates sooner and harder.** Camera shake, glitch and the heartbeat ramp up from the first third of the gap closing, not the last half.
- **Automatic look-behind.** A stress-weighted dice roll makes the student turn round. The chance rises as the gap closes. The manual "Look behind" button stays.
- **Readiness from El Pasillo.** Clearing doors records the same kind of timed attempt as before, so "test ready" and the teacher overview keep working. Only numbers are stored, never audio or words.
- **Demo mode rebuilt around real voice.** The demo stops use the real recogniser and the real scorer. The "Pretend" buttons go, except one clearly labelled fallback when no microphone is available. The demo matches the real app's screens and ends with El Pasillo. A short opening explains the student journey and the KS3 speaking test for readers outside teaching.
- **Microcopy pass** on the first-impression screens (welcome, desktop, each step's opening): say what is happening, why, and what to do next.
- **Docs.** A public README for non-specialists (problem, journey, privacy design, cost, stack, live link, demo link) and `docs/roadmap.md` for everything postponed.
- **Out of scope, recorded in the roadmap:** the scaffolding ladder, ghost-whisper pronunciation aid, scarier monster and menacing sound design, doubling the graphic assets, the heavenscape escape, test simulation mode, GDPR-safe high scores and class table. The promo video is being remade separately.

## Capabilities

### New Capabilities
- `el-pasillo-game`: how El Pasillo plays as the final step: what counts as progress, how fear escalates, the automatic look-behind, what it records, and how it unlocks.
- `voice-demo`: the public demo: real voice recognition, matches the real screens, explains the journey, saves nothing.
- `guidance-copy`: the rule that each first-impression screen says what is happening, why and what next.

### Modified Capabilities
<!-- openspec/specs/ is empty, so there is nothing to modify. Existing behaviour lives in the archived and in-flight changes. -->

## Impact

- **Code:** `lib/dreamcore/chase.ts` (trying counts only on matched progress, escalation curve, look-behind chance), `app/components/dreamcore/DreamcoreGame.tsx` (feed matched progress to the chase, record run, auto look), `app/phases/automate/page.tsx` (render El Pasillo), `app/lab/automate/*` (kept as lab), a new run-recording route and store function reusing `recordResponse`, `app/demo/*` and `lib/demo/*` (rebuilt stops), welcome and desktop copy, `README.md`, `docs/roadmap.md`, `docs/demo-script.md`.
- **Database:** none new. Runs write existing `attempts` rows with phase `automate`.
- **Privacy:** unchanged. The demo opens the microphone in the browser; audio is not stored. Server transcription fallback on the demo goes through the cost router with no profile.
- **Cost:** demo visitors on browsers without live recognition use paid transcription. The route is rate limited.
- **Tests:** unit tests for the chase and look-behind rules, e2e for the final step and the demo (with a fake speech source), and an update to the phase-gate tests.
