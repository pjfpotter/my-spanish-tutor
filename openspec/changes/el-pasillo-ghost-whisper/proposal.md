# Proposal

## Why

A student who says *quiero* as "kwee air oh" has no way, inside El Pasillo, to hear how the word should sound without leaving the game or giving up the door. Roadmap item 1 adds a rescue for exactly that moment: tap the word you keep getting wrong and hear it whispered by Tele in a glitchy, haunted voice. It suits the dreamcore world, it is memorable for self-conscious 12 to 13 year olds, and the limited supply keeps it a rescue and not a crutch.

## What Changes

- **A Whisper button on a door.** When a word of the current door has not been understood, the student can tap Whisper and hear that one word, slowly, as a ghost whisper of Tele's own voice. The word offered is the first one the recogniser has not matched.
- **Built from clips we already have.** Each ghost word is cut from the slow (0.7) clip of a course chunk that contains it, using the word timings already stored with every clip. No new text-to-speech call, no browser voice, no model call.
- **Made at build time.** A new free ffmpeg step beside the slow-clip stretcher turns each distinct word into a short ghost MP3 (a randomised-phase whisper with a light glitch). Words are keyed by their text and marked stale through the same hash mechanism as clips, and fetched only when tapped.
- **Limited supply.** Each run gives a small number of whispers, and each one costs chase time. A whisper is help, so the door counts as assisted, like Show me.
- **Optional live haunting.** A light Web Audio layer (a little reverb, a slight detune, a flicker) is added on top when `AudioContext` is available, and falls back to the plain ghost whisper without it. No live vocoder.
- **Word end times kept.** The clip builder stores each word's end time as well as its start, so cuts are exact for newly built clips. Existing clips keep working by using the next word's start.
- **Out of scope:** a scarier monster and sound, more art, the heavenscape, test simulation mode, scores, any change to the mouth animation or to scoring rules, whispering words in the memorise ladder or other steps.

## Capabilities

### New Capabilities
- `el-pasillo-ghost-whisper`: when a student can ask for a ghost whisper, which word it speaks, how it sounds and what it costs, and how it is made from existing clips.

### Modified Capabilities
<!-- None in openspec/specs/ (it is empty). The run structure this plugs into is specified in the in-flight change `el-pasillo-scaffolding-ladder`; nothing there is contradicted. -->

## Impact

- **Code:** `lib/audio/ghost.ts` (new: pick the source word, slice, recipe, index), `lib/audio/ffmpeg.ts` (ghost maker beside the stretcher), `lib/audio/build.ts` and `lib/tele/clip.ts` / `lib/tele/alignment.ts` (store word end times), `scripts/build-audio.mjs` (ghost step, dry run, prune), `lib/audio/built-ghost.ts` (generated index), `lib/dreamcore/` (whisper supply and chase cost), `app/components/dreamcore/DreamcoreGame.tsx` (button, play, assisted marking), a new `app/components/useGhostWhisper.ts`, `docs/roadmap.md`.
- **Assets:** about 450 short MP3s, roughly 3 MB, under `public/audio/ghost/`.
- **Data and privacy:** none new. No audio or words stored, nothing sent from the device beyond the existing numbers-only attempts.
- **Cost:** no paid calls. The ghost step is local ffmpeg.
- **Tests:** unit tests for slicing, recipe arguments, index and supply; an e2e on the fake speech source; update tests that count Pasillo controls if any.
- **Depends on:** `el-pasillo-scaffolding-ladder` landing first (it owns the stage model and the assisted rule this extends).
