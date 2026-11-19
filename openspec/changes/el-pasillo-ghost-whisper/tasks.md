# Tasks

## 1. Word timings and word choice (pure logic)

- [ ] 1.1 In `lib/tele/alignment.ts` keep each word's end time (`t1`) from `character_end_times_seconds`, add optional `t1` to the clip schema in `lib/tele/clip.ts`, and scale it by the rate when `lib/audio/build.ts` writes a stretched clip. Verify with unit tests: `t1` is the end of the word's last character, old clips without `t1` still parse, a stretched clip's `t1` is divided by the rate.
- [ ] 1.2 Add `lib/audio/ghost.ts` with `ghostWords(clips)` (distinct normalised words, each mapped to the slow clip of the first chunk in slot order that contains it, using the same normalisation as scoring), `wordCut(clip, index)` (start `t0 - 0.03`, end `t1 + 0.03` or else the next word's `t0` or the clip's `end`, clamped to the clip) and `ghostSlot(word)`. Verify with unit tests: dedupe across chunks, deterministic source choice, cut with and without `t1`, last word ends at the clip end, accents and punctuation normalise like `lib/speech/score`.
- [ ] 1.3 Add `ghostHash(word, sourceClipHash)` using `sourceHash` with a `GHOST` marker and `planGhost(words, store)` returning `upToDate` and `toBuild`. Verify with unit tests: unchanged is skipped, a changed source clip or a changed marker is stale, a changed unrelated clip is not.

## 2. Build step

- [ ] 2.1 Add a `GhostMaker` interface and an ffmpeg implementation in `lib/audio/ffmpeg.ts` beside `ffmpegStretcher`: cut the word with a 10 ms fade at each edge, apply the whisper and glitch recipe, normalise loudness, encode 64 kbps mono MP3. Verify with a unit test of the argument list (cut times, fade, recipe filters) and one test that runs real ffmpeg on a short fixture when `ffmpeg` is available and is skipped otherwise.
- [ ] 2.2 Extend `scripts/build-audio.mjs`: after clips, plan and build ghost words from the slow clips already on disk, writing `public/audio/ghost/<slot>.mp3` and the generated `lib/audio/built-ghost.ts` index; the dry run lists words to build and files to remove, `--only=ghost` runs just this step, a full successful build prunes ghost files nothing wants, and nothing here calls the cost router or any paid service. Verify by a dry run that lists the words, a real run, and a second run that builds nothing.
- [ ] 2.3 **Listening test.** Build the ghost words for ten sample words (including *quiero*, *tengo*, *gusta*, *me*) and choose the recipe values by ear on a phone and on the Chromebook headset: is the vowel still recognisable, is it haunted but not unpleasant, is it loud enough? Decide unvoiced or a quiet voiced bed. Freeze the values behind the `GHOST` marker and note the choice in `design.md`. Verify with the owner's sign-off recorded in `docs/user-testing-notes.md`.
- [ ] 2.4 Build the full ghost set (about 450 words, about 3 MB) and spot-check cuts by ear, listing any word that sounds clipped or carries a neighbour's sound. Fix by padding or choosing another source chunk in `ghostWords`, not by hand editing files. Verify the notes list zero unresolved words.

## 3. Whisper rules (pure logic)

- [ ] 3.1 In `lib/dreamcore/` add `WHISPERS_PER_RUN`, `WHISPER_CHASE_COST`, `whispersLeft(used)` and `spendWhisper(state)` beside `ESCAPE_AFTER`, and make `countsAsClean` treat a door with a spent whisper as assisted. Verify with unit tests: supply runs out, spending past zero changes nothing, a whispered door does not count as clean, an unwhispered door still does.
- [ ] 3.2 Add the chase cost in `lib/dreamcore/chase.ts` so a spent whisper moves the monster closer by `WHISPER_CHASE_COST` and never past the point of catching in one step. Verify with a unit test and that `closingRate` values are unchanged.

## 4. Game wiring

- [ ] 4.1 Add `app/components/useGhostWhisper.ts`: look up the word in the generated index, fetch the file only on tap, play it through `AudioContext` with the light optional haunting chain (generated reverb impulse, slight detune, gain flicker) and fall back to a plain `Audio` element when Web Audio is missing or fails; never throw and never block. Verify with a unit test for the lookup and fallbacks, and a manual check that failing `AudioContext` still plays.
- [ ] 4.2 In `DreamcoreGame.tsx` show `Whisper · N left` with a short note that it lets the monster closer, only while listening with an unlit word and a ghost file for it, disable it at zero with `No whispers left`, play the whisper for `match.next`, spend one, mark the door assisted and apply the chase cost. Ignore microphone words while it plays and restart the door's word count after, as for the question. Verify by e2e on the fake speech source: the button appears after a missed word and not after a full match, a tap spends one and shows N-1, the door still opens, and the cleared whispered door does not count towards the escape.
- [ ] 4.3 Check the privacy and no-model rules: `lib/cost/no-model-in-practice.test.ts` still passes with the new files, nothing from a whisper is stored or sent except the existing numbers-only attempt marked assisted, no English audio plays, and the plaque never shows the whispered word at stages 4 and 5. Verify with the existing test plus a new assertion in the e2e that the plaque at a no-help door contains no answer word after a whisper.

## 5. Owner check and docs

- [ ] 5.1 **Owner play-through on a phone and a Chromebook.** Say a word badly on purpose, use a whisper, then say it well; confirm the whisper helps, the supply and chase cost feel right, and the haunting layer does not stutter. Adjust `WHISPERS_PER_RUN`, `WHISPER_CHASE_COST` and the recipe constants only. Verify with notes in `docs/user-testing-notes.md`.
- [ ] 5.2 Mark the ghost whisper shipped in `docs/roadmap.md`, tick this change in `ks3-spanish-speaking-tutor-v1/tasks.md` in the same commit, and note the new `--only=ghost` build option where `build-audio` is documented. Verify by reading the diff.
- [ ] 5.3 Run `npm run typecheck`, `npm test` and `npm run test:e2e`. Verify all green.
