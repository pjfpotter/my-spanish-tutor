# Design

## Context

See proposal.md. Observed in code and data:

- Clips live in `public/audio/clips/<slot>.mp3` and `.json`. 705 files, 15 MB. Each course chunk has a slow (0.7) and a normal clip. Each JSON carries `words[]` with `text` and `t0` (start only), the loudness `envelope`, and a `source.hash`.
- `lib/audio/build.ts` asks ElevenLabs once per text at natural speed, keeps the character alignment, and drops the character end times in `wordsFromAlignment`. Slow and fast clips are made from the natural clip by `ffmpegStretcher` (rubberband), with a `STRETCH` marker in the hash so a recipe change marks them stale.
- 450 distinct words sit inside the normal-speed clips; only 73 exist as standalone clips. A student's answer is made of course chunks, so any word they get wrong is inside a clip we already have.
- `scripts/build-audio.mjs` is a local script (dry run by default, `--yes` to build) that also writes the generated `lib/audio/built.ts` index. It runs ffmpeg locally; no server-side ffmpeg use exists today.
- In `DreamcoreGame.tsx`, `liveMatch` gives `hit[c][w]` and `next` (the first unlit word) per door, and `assisted` marks a door as helped. Tele's voice in the game is `useVoice` (a built clip, else `speechSynthesis`). The game already owns an `AudioContext` for the hum.
- `speechSynthesis` output cannot be routed through Web Audio, so the roadmap's "haunted browser voice" is not buildable. The whisper must come from clips.

## Goals / Non-Goals

**Goals:** a rescue for one mispronounced word, in Tele's voice, haunted, from existing audio, with no paid call and no new data stored, safe on an old Chromebook.

**Non-Goals:** a scarier monster or new sound design; new art; any change to the mouth animation constants (CLAUDE.md) or to matching and scoring; whispering in the memorise ladder; a live vocoder; a second voice.

## Decisions

1. **Cut words from the slow clip, build them ahead of time.** One short ghost MP3 per distinct normalised word, from the slow clip of the first (by slot order, so deterministic) chunk that contains it. Slow clips give a slowed word, which suits pronunciation. Alternative: live slicing and effects only. Rejected as the main path because a good whisper needs a spectral treatment the browser can only do with an AudioWorklet vocoder, which risks the old Chromebook, and because a build step is testable and identical on every device.
2. **Recipe: randomised-phase whisper plus a light glitch.** ffmpeg `afftfilt` with `real='hypot(re,im)*cos(2*PI*random(0))'` and `imag='hypot(re,im)*sin(2*PI*random(0))'` (window about 512, overlap 0.75) keeps the spectral envelope, so vowels stay recognisable, while discarding pitch. Then a short `aecho`, a touch of `acrusher`, and `vibrato` for the haunted feel, loudness normalised, 64 kbps mono MP3 like clips. The exact values are set by ear in task 2.3 and then frozen behind a `GHOST` recipe marker. Alternative considered: keep a quiet voiced bed under the whisper for clarity. Left as a recipe switch decided by the listening test, since unvoiced whisper might teach less. Voiced bed is the fallback if the owner's test says so, and needs no spec change.
3. **Cut with end times, padding and fade.** `wordsFromAlignment` keeps `character_end_times_seconds` and stores `t1` per word (optional in the schema; stretched clips scale it by the rate). A cut runs `t0 - 30 ms` to `t1 + 30 ms`, with a 10 ms fade at both edges. Existing clips have no `t1`, so the cut ends at the next word's `t0` or the clip's `end`; a build of ghost words works for both. Clips are not rebuilt just to add `t1`, because that would cost money.
4. **Own folder and index.** Files go in `public/audio/ghost/<slot>.mp3`, slot a hash of the normalised word. A generated `lib/audio/built-ghost.ts` lists `{ word, slot }` so the browser never guesses at a 404, the same pattern as `built.ts`. Staleness uses `sourceHash` over the word, the source clip hash and a `GHOST` marker, so a new voice or recipe rebuilds only ghost words. The build prunes ghost files nothing wants and the dry run says what it would build and remove.
5. **Where the build runs.** Same place as clips today: the owner's machine via `npm run build-audio`, committed with the repo. The ghost step is free and local. Open question below covers courses built on the server. If it is needed there, `ffmpeg-static` is the route; the `GhostMaker` interface keeps the maker swappable, as `Stretcher` already is.
6. **Which word is offered.** `match.next` at the moment of the tap: the first word of the door not yet lit. Its text is looked up in the ghost index by normalised word. If there is none, no button. The plaque is not changed, so a no-help door never shows the word in writing.
7. **Supply and cost live in game state.** `WHISPERS_PER_RUN = 3` and `WHISPER_CHASE_COST` (a fixed amount of chase progress, tuned in `chase.ts` only) are constants beside `ESCAPE_AFTER`. Pure helpers `whispersLeft` and `spendWhisper` are unit tested. Starting value is a guess to be tuned in the owner play-through. Spending one marks the door assisted, the same as Show me, so readiness and the escape stay honest. Alternative: leave the door unassisted because a whisper is milder than Show me. Rejected: it is still hearing the answer, and the test is unaided.
8. **Playing it.** `useGhostWhisper` plays the file through `AudioContext` when available (so a light reverb and detune can sit on top) and through a plain `Audio` element otherwise. The question audio and mic follow the existing rule: while the whisper plays the recogniser's words are ignored and the door's count restarts after, so the whisper is never mistaken for the student. The live layer is a small optional chain (convolver from a generated impulse, a tiny detune, a gain flicker), created once and reused. No `AudioWorklet`.
9. **Button copy and tone.** The button shows `Whisper · N left` and a short note that it lets the monster closer. At zero it reads `No whispers left` and is disabled. Cheeky but passable, names at most one thing to fix.
10. **Privacy and cost.** Ghost audio is derived from the course's own clips and holds no student data. Nothing new is sent or stored. The whisper path makes no model call, so the existing no-model-in-practice test stays green; the build step makes no paid call and does not go through the cost router.

## Risks / Trade-offs

- [Unvoiced whisper teaches pronunciation poorly] → Vowel colour survives because the spectral envelope is kept; the listening test in 2.3 decides, and a quiet voiced bed is the planned fallback.
- [A word cut from a slow clip is clipped or has a neighbour's sound] → Padding, fades and `t1` where available; a spot check of the whole word list by ear before release (task 2.4).
- [Chromebook CPU on `AudioContext` plus reverb] → The live layer is optional and light; failing it falls back to the plain file.
- [Whisper makes the no-help stage trivial] → Three per run, a chase cost, and assisted doors never count towards the escape or readiness.
- [Same word sounds different in different sentences] → One file per word is deliberate (about 3 MB and no per-chunk duplication); the slow clip is the clearest context.
- [Course built on the server has no ghost files] → The button is not offered for a word with no file, so nothing breaks.

## Migration Plan

No data migration. Run `npm run build-audio` (dry run, then `--yes`); existing clips are untouched and no paid call is made. Ship the ghost folder and the generated index with the change. Rollback by revert; students lose only the button.

## Open Questions

- Does the production course build need to produce ghost words on the server (and so bundle `ffmpeg-static`), or is local build and commit enough for now?
- Is an unvoiced whisper the right teaching tool, or should the recipe keep a quiet voiced bed? Settled by the owner's listening test in task 2.3.
- Are three whispers per run and the chase cost right? Settled in the owner play-through (task 5.1), tuned in constants only.
