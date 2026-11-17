# Promo video handoff (17 Nov 2026)

Summary of the session that generated the storyboard sketches, so the work can continue on another computer. Task: `30.14` in `openspec/changes/ks3-spanish-speaking-tutor-v1/tasks.md` (30.14e is ticked for the images).

**Branch:** `promo-assets`. It carries the images and is never meant to merge into `main` (see "Git" below).

## The video

- 9:16 vertical, about 45 seconds, no spoken narration. Captions, Tele's real voice, app sounds and music only. English appears only as subtitles, never in Tele's voice.
- Story and beat table: `STORYBOARD.md`. Look: blue biro on lined paper for the worry world, full-colour Win98 dreamcore for the app. Colour bleeds in at beat 5.
- `animation-plan.md` is the OLD 16:9 plan. Only its "look" and "techniques" sections still apply. `sound/elevenlabs-clips.txt` is from the first script (Tele speaks English in it): ignore it, except the teacher line.
- Render with HyperFrames (`video/` has a project skeleton).

## Images (generated, all 9:16, 1K)

Made with **Nano Banana 2** (`nano_banana_2`) through the Made API (docs copied to `tools/made-api-docs.md`). Dolores is an invented character; references are the owner's hand-supplied `scribbles-dolores-1.jpg` (sofa) and `scribbles-dolores-2.jpg` (face, plasters). Beat 1 used reference 2.

| File | Beat |
|---|---|
| `01-desk-drawing.jpg` | 1, Dolores drawing at the desk (owner preferred this to the `-b` re-roll) |
| `02a-flashcards.jpg`, `02b-talking-to-wall.jpg`, `02c-lost-notes.jpg` | 2 |
| `03-calendar-facedown.jpg` | 3 |
| `04a-nightmare-corridor.jpg` | 4 (empty corridor, also the base for the colour bleed in 5) |
| `04b-monster-teacher.jpg` | 4 |
| `07a-test-day-classroom.jpg`, `07b-teacher-pen-drop.jpg` | 7 |
| `pose-neutral`, `pose-eyes-wide`, `pose-speaking`, `pose-grin` (`.jpg` and `.png`) | cut-outs. The `.png` files are transparent and filled opaque inside the figure. |

Known small flaws: `03` still has a few scribbled words on the open book; the pen in `07b` is the one thing to animate in HyperFrames if it reads small. Superseded drafts (`-v1`, `-v2`, `-raw`, `01-desk-drawing-b`) were deliberately not committed.

**Prompt lessons (nano banana):** say "no readable writing, letters or numbers anywhere" (it ignores "no text" alone); name the outfit exactly for poses (jumper, white shirt, striped tie, grey trousers, black shoes, no skirt, no plasters) or it changes; ask for "keep the bottom fifth calm for captions"; ask for "FULL FIGURE from the top of her head to the soles of her shoes" on poses or it crops at the waist; for line-work poses say "do not fill the jumper with solid grey".

**Framing:** 9:16 everywhere, action in the middle 60%, bottom fifth calm for captions.

### Regenerating (scripts in `tools/`, run from the repo root)

- Needs `MADEAPP_KEY` in `.env.local` (not committed; the owner must copy it across). About 167 credits were left; each 1K image costs 0.8 credits, background removal 0.2.
- `gen-all-frames.mjs` holds the style block and all prompts. `gen-rerolls-1.mjs` and `-2.mjs` hold the tightened re-roll prompts. `remove-pose-backgrounds.mjs` runs the Made `background-remover` tool on the poses (the opaque fill was done afterwards in Python with PIL: close the outline, flood-fill from the corner, fill the inside paper-white).
- Flow for any model run: upload references (`POST /v1/media`, PUT, confirm), quote (`POST /v1/cost`, free), run (`POST /v1/generations` with `request_id` and `max_cost_cents`), poll `GET /v1/generations/{id}`. Reference images go in `medias: [{value, role: "image"}]`. Tools take `media_...` ids, not URLs.
- `gen-rerolls-1.mjs` references `pose-neutral-v1.jpg`, which is not committed; use `pose-neutral.jpg` instead.

## Audio

### Existing Tele clips (production `eleven_v4` voice `01EL79JZueiJl1jDb743`, files `public/audio/clips/<id>.mp3` and `.json`)

The `.json` has timings and a loudness `envelope` for driving Tele's screen glow (Tele has one eye and no mouth).

| Beat | id | Spanish / subtitle |
|---|---|---|
| 5 | `42407617cb73` | ¡Hola! Soy Tele. Vivo en la tele. / Hi! I'm Tele. I live in the TV. |
| 5 or 6a | `2a15625aa4ca` | El examen está lejos. Aquí no hay prisa. / The test is far away. There is no hurry here. |
| 6a | `0b23e03b6c6a` | Repite. / Say it after me. |
| 6b | `e40b358899e9` | Ya casi es tuyo. / It's nearly yours. |
| 6c missed | `3c0e7865150c` | Casi. Escucha otra vez. / Almost. Listen again. |
| 6c matched | `38a1465c18a5` | Sí. Eso es. / Yes. That's it. |
| 6c alt | `29975bf76f59` | Muy bien. Sigue así. / Very good. Keep going. |
| 6d | `626f3a123e21` | detrás / behind |
| 6e | `ef8b7c014293` | Hoy has ido mejor que ayer. / Today went better than yesterday. |
| 7 | `37d222bc8795` | Mira, esta ya la sabes. / Look, you already know this one. |

App sounds: `assets/sfx/` (24 files). Tele sprites: `assets/tele/`. App stills: `screens/`.

### To generate in ElevenLabs (3 or 4 takes each; if a take reads a [tag] aloud, delete the tag)

- **T1, beat 6d, Tele:** `[urgent, playful] ¡Corre! ¡Te está alcanzando!` Cheeky and breathless, not scary.
- **T2, beat 7, Tele:** `[warm, quiet] Tú puedes. [short pause] Ya lo sabes.` Nearly a whisper.
- **Monster teacher** (new voice, Voice Design): "A tall, thin, unsettling Spanish-speaking adult, male or neutral, with a dry, dull monotone. Very slow, stretched vowels, slightly nasal, as if bored of asking questions. Calm and stern, never shouting. Clear Castilian Spanish diction." Lines: `¿Qué haces en tu tiempo libre?` / `¿Qué hiciste el fin de semana?` / `¿Cómo es tu casa?` Edit: low-pass, slow about 10%, drop the pitch, reverb.
- **Dolores** (new voice, gender-neutral, they/them): "A young teenager's voice, around 13 years old, gender-neutral, clear Spanish pronunciation. Soft, a little shy and hesitant at first. Natural and unpolished. Calm when confident." Lines: beat 2 `[quiet, hesitant] En mi tiempo libre… [trailing off] eh…`; beat 7 `[calm, confident] En mi tiempo libre dibujo y escucho música.` (short form: `Dibujo y escucho música.`)

### Music beds (instrumental, no vocals; generate 4 to 6 seconds over each slot; shared key and tempo so cuts do not clash)

1. **Beats 1 to 3, 0 to 14s, 20s:** "Lo-fi hip hop bedroom beat, 80 BPM, A minor. Dusty drums, mellow detuned Rhodes piano, warm vinyl crackle, slightly flat and tired, a little sad and sleepy, like a 13-year-old procrastinating. Tape wobble on the pitch. The last two seconds thin out to just the piano and crackle."
2. **Beat 4, 14 to 19s, 10s:** "Dark ambient horror drone, A minor, 80 BPM pulse. Low sub bass rumble, detuned strings slowly rising, distant ticking clock, dissonant stabs, sense of being chased. No melody, no drums, only dread. Ends abruptly."
3. **Beat 5, 19 to 22s, 8s:** "Dreamy vaporwave transition, starting from a dark drone in A minor and blooming into a bright, warm major chord (C major). Shimmering synth pads, glassy bells, soft reverse cymbal swell, light chorus. Hopeful, wide, magical. Resolves on a held chord."
4. **Beat 6, 22 to 40s, 25s, loopable:** "Upbeat vaporwave and dreamcore, 90 BPM, C major. Playful, bright, slightly nostalgic. Soft mallets, glossy synth arpeggios, warm bass, gentle 90s CD-ROM menu vibe, light shuffle drums. Cheeky but friendly, builds gently without peaking. Seamless loop." Keep it simple so it does not fight Tele's Spanish; duck it under the voice.
5. **Beat 7, 40 to 46s, 12s:** "Warm, confident resolution in C major, 90 BPM. Starts from a calm vaporwave synth groove, then lifts into a triumphant but understated finish: bright piano, soft strings, a gentle drum fill, and a final clean held chord with a short reverb tail. Feels like quiet victory."

Sound effects still to write prompts for: tape stop, quick stabs, a swell, the distorted teacher voice.

## Screen footage (task 30.14a) and the Android problem

Needed: about 6s memorise, 8s El Pasillo (`/lab/dreamcore`, live), 6s Tele talking, plus the moment recognised words light up. Phone in portrait, Do Not Disturb, about 5s padding each end, into `promo/footage/` (does not exist yet; keep it out of the app bundle). Demo content only.

**Problem:** on Android the screen recorder cannot capture app audio while the app's own mic works, so speech recognition cannot be filmed with sound.

**Plan:** record video only (recorder internal audio and mic both off); the app's own mic still works, so say the Spanish aloud and the words really light up. Rebuild the audio in HyperFrames from the clips above plus the app sfx, timed from each clip's `.json`. Wear headphones while filming so the mic does not hear Tele. Tap a clear start mark for syncing. Test 5 seconds first. If Android still blocks the mic: resize desktop Chrome to phone width, record the window in OBS and use the laptop mic (the Chromebook is a supported device anyway), or film the phone with a second phone for one beat. Open idea: check whether the app has a demo or replay mode that fakes a recognition result.

## Open decisions (owner)

- Approve the storyboard (30.14c and 30.14d).
- End card: name only, or a URL or "for teachers" line, and the tagline.
- Check the two reference sketches show an invented character, not a real recognisable child, before anything is published (`image-prompts.md` warns the first Gemini images came from family photos).
- Beat 5's pastel corridor is built in HyperFrames from `04a` plus the footage; generate a coloured frame only if it looks weak.

## Rules that apply (from CLAUDE.md)

Tutor audio is Spanish only, English as subtitles. No copyrighted characters. No student data, names or recordings. Tele's mouth animation values are validated, do not change them. The edge-tts voice must never ship.

## Git

The images are about 35 MB, so they live only on `promo-assets` and are not meant to merge into `main`. When the video is finished: delete the branch (or `git rm -r --cached docs/promo-video`), and keep `HANDOFF.md` if wanted. The earlier 150-odd files already tracked in `docs/promo-video/` (old Gemini sketches, `video/`, screens, sfx, Tele sprites) are on other branches already. Task 30.14e in `tasks.md` and `docs/asset-credits.md` record the generation.
