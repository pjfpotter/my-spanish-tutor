# Proposal

## Why

El Pasillo is the final step, but its run is a flat staircase of six help levels, two doors each, ending after twelve doors whatever the student managed. A student who stumbles early gets the same run as one who is flying, and the "escape" is just running out of doors. The roadmap's first item turns the run into a real scaffolding ladder: help fades only as the student shows they can do without it, and the way out is earned by surviving doors with no help at all, which is also the thing the speaking test measures.

## What Changes

- **Five stages replace the six rungs.** Read the Spanish chunk; read the whole answer; hear the question and see only the first and last letters of each answer word; hear the question and see only the first chunk; no help (hear the question, say the answer).
- **Hearing the question comes in at stage 3.** Tele speaks the Spanish question aloud from stage 3 on. English stays a subtitle only.
- **The escape is earned.** The student escapes after clearing three no-help doors without pressing Show me. No-help doors keep coming until they do. Doors cleared with Show me do not count towards the escape; a door passed by tap because the microphone cannot hear does, so nobody is stuck for a recognition failure.
- **The chase stops growing without limit.** Because the final stage has no fixed length, the closing rate stops rising after the last fixed door.
- **Stage shown to the student.** Each door names its stage, and the result screen says how far up the ladder they got and what to try next, in an effort-first tone.
- **Readiness unchanged.** Only no-help doors are recorded as timed attempts, exactly as top-rung doors are today, and Show me still marks them assisted so they do not count.
- **Out of scope:** ghost-whisper, scarier monster and sound, more art, the heavenscape sky itself (the escape keeps its current ending), test simulation mode, scores and class table, any change to the mouth animation or to scoring rules.

## Capabilities

### New Capabilities
- `el-pasillo-scaffolding`: how a run climbs from full help to no help, what each stage shows and says, and what earns the escape.

### Modified Capabilities
<!-- None in openspec/specs/ (it is empty). The El Pasillo behaviour this builds on is specified in the in-flight change `el-pasillo-final-step-and-voice-demo`; the scenarios here do not contradict it. -->

## Impact

- **Code:** `lib/dreamcore/doors.ts` (stage model, `buildRun`, `plaqueOf`, masks), `lib/dreamcore/chase.ts` (cap on `closingRate`), `app/components/dreamcore/DreamcoreGame.tsx` (stage-driven plaque, play the question, escape rule, recording on the no-help stage, result copy), `lib/dreamcore/rewards.ts` (outcome carries the stage reached), `lib/ui/step-copy.ts` (stage names), `docs/roadmap.md` (mark item 1 shipped).
- **Data and privacy:** none new. The same `/api/respond` numbers-only attempts. No audio or words stored, no model calls in the run.
- **Tests:** unit tests for stage building, masks and escape rule; update `lib/dreamcore/dreamcore.test.ts`, `tests/pasillo-step.spec.ts` and the demo e2e that assume twelve doors.
- **Depends on:** `el-pasillo-final-step-and-voice-demo` landing first (it introduces the final-step wiring this edits).
