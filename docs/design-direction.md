# Design direction

| | |
|---|---|
| **Status** | Proposed. Decisions and open items are tracked in `docs/design-conflicts.md`. |
| **Date** | 2026-11-01 |
| **Designed with** | Dolores, the first test user. This is deliberately one teen's taste, not a generic teen aesthetic. |
| **Sources** | `docs/design/bicho-boards/` (world and screens), `docs/design/tele-sketch.html` (the character), `docs/art-pipeline.md` (workflow and accessibility floor) |

## Intent

The app should feel like a weird little sandbox, not a list of gated tasks, and that feeling is the engagement hook. The gated learning path stays and must never be diluted.

- **Play is a reward for practice, or happens inside practice. It is never a way to spend a whole session.**
- Coins come only from practice. Time spent poking around the desktop earns nothing and has no timer.
- It is allowed to alienate most adults. Version one is for one teen. A theme switcher for a wider range of teens is a later version.

## World

A Windows 98-style desktop pasted over a lost world: painted sky, an endless playground, a candy-coloured room full of CRTs. Everything is oversaturated and low-res, as if shot on a camcorder.

- **One level of weirdness in v1:** "Odd" (the sun has eyes, the clock lies). Cozy and Haunted are parked, and the dial is not built.
- Uncanny but never scary: no jump scares, no gore, no sudden sound.
- Locked phases are shown in the world's own terms (static, "señal débil"), not as a blocked screen.

## Character: Tele

A 1970s television with one realistic eye, rabbit-ear antennae and turning dials, in a striped turtleneck and a patchwork corduroy jacket, standing in a painted room (checkerboard floor, drifting clouds, a lone door, a mushroom with an eye), broadcasting Castilian Spanish. It has **no mouth**. Redesigned by the owner on 12 Nov 2026; the source package is `docs/design/tele-react/`.

- Feelings live in the eye (lids, brow, pupil, gaze, tears), the antennae, the picture (tint, static, glitch) and the world (sky colour, rainbow, darkness).
- Six feelings (joy, sadness, anger, fear, surprise, disgust) are recipes that add together, so any two blend.
- While speaking, the screen and antenna tips glow with the voice loudness, and the caption follows the words.
- **Feelings are baked at build time** per phrase-bank line (a feeling track beside the audio). A rule-based word list is the fallback. There is no runtime language-model call and no open chat.
- Tele speaks only Spanish. English appears only as subtitles in the caption window.
- Voice: the ElevenLabs character voice. The "Dream TV voice" effect (slowed, echo) is an optional setting, not a default requirement.
- v1 keeps canvas drawing (decided at M1): the eye and effects are procedural and the television, body, door, mushroom and clouds are WebP sprites in `public/tele/`. `lib/tele/draw.ts` is the port. The jacket is on by default and can be turned off.
- The stage is 400 by 360 units. Calm mode and reduced motion stop clouds, glances, breathing and glitches.
- Original character only. No copyrighted characters.

## Colour tokens

From `h-bicho-brand.dc.html`. Define as CSS custom properties in one token file.

| Token | Hex | Use |
|---|---|---|
| `win-grey` | `#C0C0C0` | Window chrome, buttons |
| `title-navy` | `#000080` to `#0A5CC0` | Title bars (gradient) |
| `ink-navy` | `#0B2A4A` | Outlines, text on light |
| `cream` | `#F4F4D0` | Text on navy |
| `hyper-pink` | `#FF1FA9` | Decorative accent only |
| `soft-pink` | `#FF5FA8` | Logo ".exe", accents on navy |
| `lemon` | `#FFEB00` | Decorative accent only |
| `toxic-cyan` | `#00E5E5` | Decorative accent only |
| `candy-sky` | `#0B63FF` | Backdrop |
| `sky` | `#4FA9F0` to `#9AD6FF` to `#DDF3FF` | Sky gradient |
| `grass` | `#8FDB4A`, `#5BBB2E` | Hills |

Contrast, computed against WCAG relative luminance (text needs 4.5:1):

| Pair | Ratio | Text? |
|---|---|---|
| cream on navy | 12.95 | Yes |
| navy on sky | 9.30 | Yes |
| white on title bar end (`#0A5CC0`) | 6.35 | Yes |
| soft-pink on navy | 5.16 | Yes (large and short labels) |
| hyper-pink on white | 3.49 | **No** |
| lemon on white | 1.23 | **No** |
| cyan on win-grey | 1.16 | **No** |

Pink, lemon and cyan are decoration and outlines only. They never carry meaning alone and never sit behind reading text.

## Type

| Face | Use |
|---|---|
| Atkinson Hyperlegible | **All reading text**, including captions and prompts |
| Fredoka | Logo and big shouts only |
| Pixelify Sans | Window titles, numbers, short UI labels |
| VT323 | Status strips and the countdown stamp |

Stylised faces are for titles and short labels. The chromatic-fringe text shadow on title bars is allowed on titles only, never on body text.

## Materials

- **Bevel:** grey windows and buttons with a classic 3D edge.
- **Cut-out:** white scissor edge and hard shadow for collage pieces.
- **Camcorder:** channel split, scanlines and grain.
- **Photo eyes:** real eyes, no mouths.

The camcorder overlay and grain sit **around** the task: on the home desktop, empty states and transitions. They do not sit over question, caption, prompt or feedback surfaces.

## Layout and screens (v1)

Phone first, with a pinned Tele and caption window at the top on narrow screens.

- **Home (Examen.exe):** days to the test, readiness, the five Pregunta files. Tele idles and reacts. Poking Tele plays a stock Spanish line from the phrase bank.
- **Phase windows:** one window per phase. Locked phases look like static.
- **Tutor window:** the question in Spanish with an English subtitle, what the student said with a percentage, one thing to fix, and Oír / Lento / Siguiente / Hablar buttons.
- **Rewards:** coins, rank, and desktop things bought with coins (wallpapers, objects). Unlocks are deterministic. There are no random packs.

Parked screens: the pet care menu, Juegos.exe, Apuntes, Garabatos.

## Gamification inside the gated phases

| Phase | Mechanic (existing spec) | How it shows |
|---|---|---|
| Write | Chunk tags give a level, one upgrade suggested at a time | Each feature used lights up on the answer "file". Confirming saves it. |
| Understand | 3 successes across 2 separate sessions | Each question is a channel. Tele's picture clears from static as mastery rises and only locks after the second day. |
| Memorise | Accuracy % and scaffold fading | Words dim out of the prompt as the student improves. The score is their own personal best. |
| Automate | Response-time rank, shrinking window | The animal rank ladder (Caracol up to Gato) and a shrinking window. |
| All | Effort coins, streak with a freeze | Tele reacts with a baked feeling. Coins unlock desktop things. |

Rules that do not change: no hearts or lives, no public ranking, no real-money payments, effort earns coins, scores come from rules, one thing to fix per attempt.

## Accessibility floor (never a theme)

- WCAG AA contrast, 4.5:1 for text.
- No meaning carried by colour or blur alone.
- `prefers-reduced-motion` respected, plus a learner-controlled calm switch that turns off camcorder effects, glitches and idle motion.
- Visible keyboard focus. Generous tap targets with predictable patterns.
- The accessibility settings are a separate layer from the visual tokens.

## Performance

It must stay light on an old school Chromebook. Targets are set at milestone M1 by measuring on one, but the shape is: static wallpaper images, effects only on the home screen, capped animation frame rate for Tele, and a stated asset size budget. Photo wallpapers must be compressed.

## Assets

- Photos: see `docs/design/bicho-boards/h-bicho-photos.dc.html` for the slots and what is still missing. Every photo gets an entry in `docs/asset-credits.md` before it ships. No brand logos, no recognisable people, no children.
- Do not use the word or trade dress of a commercial virtual-pet toy.
- Illustration workflow: `docs/art-pipeline.md`.

## Tele's written voice (phrase bank)

Source: the dreamcore page on the Aesthetics Wiki, read 2026-11-02. It describes the aim as making the viewer "both simultaneously comforted and unsettled", through familiar, hazy places with a few strange details (CRT TVs, clouds, eyes, empty rooms). It separates dreamcore from weirdcore, which is about confusion and dread. Tele follows the dreamcore side.

- Comforting first, strange second. The strangeness is small and kind: a light left on, a signal, a room that remembers you, being seen. Nothing frightening.
- No jokes and no irony. Tele means what it says.
- Short present-tense Castilian Spanish at Year 8 level. English only as subtitles.
- At most one thing to fix, and never blame. "No pasa nada" before "otra vez".
- Draft bank: `lib/tele/phrase-bank.ts`. Placeholder poke lines in `lib/tele/lines.ts` are replaced by the bank's `poke` lines in task 12.3.

## Practice screens (M9)

Reuses the tokens and materials above. Decisions made while building the one-screen practice layout (tasks 20.x to 22.x):

- **One screen, no scrolling, down to 360 by 640.** A thin top band (Exit on the left, the Sound and Calm switches fixed at the right), a compact Tele (4rem wide) beside a short caption, one line of progress and coins, a white task card, and the feedback panel docked at the bottom. Components: `PracticeShell`, `Caption compact`, `FeedbackPanel` in `app/components/practice/`. Layout is checked at 360 by 640 by `expectFits` in `tests/helpers.ts`.
- **Feedback panel.** Same place every time and instant. Words ("Correct", "Not yet"), a symbol in a box, and a colour (`--fb-right`, `--fb-wrong`) together, so colour is never the only cue. Continue sits on the same row as the heading and takes focus, so Enter carries on. A blank is never called wrong: it says "No answer in time".
- **Chunk kinds.** Opinion, reason, link, when, detail and other each have a pastel fill (`--kind-*`, black text) plus a symbol and a word. Pair tiles in match pairs are plain, because they are not chunk-kind coloured.
- **Sounds and reward animations.** Interface sounds sit in `public/audio/sfx`, are short and soft, and are silenced by the Sound switch and the calm switch. Reduced motion stops the confetti but not the sounds. Tele's wordless reactions use the `tele-*` clips.
- **No pictures anywhere in support.** Sentence builders are deliberately text only, and no picture can be sourced when a course is created.
- **Support follows results and cause tags.** The prompt shows listen then repeat, a gapped script, chunk by chunk, first words, or English only, never weaker than a live cause tag allows. A missed chunk at chunk-by-chunk or less is built back up: the chunk alone, then with its neighbour, then the whole answer.
- **Mix per answer.** Each answer opens with three short warm-ups chosen by the session mixer, then the spoken task. "I know this one" skips straight to saying it.

## Write screen (26.1b)

Built inside `PracticeShell`, so it keeps the one-screen rule down to 360 by 640 and reuses the chunk-kind colours, symbols and words from the practice screens.

- **Empty slots first.** Each question opens on one empty block per category in the question's `template`, coloured by the same kind as the automatise phase. A dashed outline with a coloured underline, the kind symbol and the category name marks an empty block, so colour is never the only cue. Nothing is pre-filled and no level or target is asked for.
- **Tap a block, see only what fits.** The tray opens in place under the row and lists chunks of that block's category from the question's own builder (`topics`), recycled first, none already used in the answer. Each chunk shows its English gloss in small type. Long trays scroll inside their own box; the page never scrolls.
- **Cement.** Joining words (y, pero, también) come from a second tray reached from a block ("Add a joining word after"). They show as white pills and carry no value.
- **Starter is a button, never the default.** "Give me a starter answer" appears only while the answer is empty. If the course has none, the screen says so and the blocks still work.
- **Value, not level.** The meta line shows "Worth N", which grows as detail is added. The whole-test checklist sits in the footer line.
- **One nudge, once.** After an answer works, one optional extra is offered at a time ("Add a contrast if you like. For example: aunque") with a "No thanks" that is not repeated for that answer. It is the cheapest unused feature, recycled chunks first. A stalled answer is offered a shorter version instead of a nudge.
- **The load note comes once per question.** "A longer answer takes more learning. Taking blocks out is fine at any time." appears when the value passes the course's `loadNoteValue`, with a "Got it", and never blocks confirming.
- **Analysis on request.** "Why this value?" opens a short praise session in the same card: up to five highlights, richest first, about a second each, with the feature named in English ("a time phrase!", "+1"), a soft reward sound, a small burst and a running total. It can be cancelled at any moment (the button or Escape) and always ends on the true total. Under reduced motion or calm mode it shows everything at once with no timer, burst or sound. It can be played again.

## Euros (26.1e)

The in-app currency is shown as euros with the euro sign ("€12", "+€3 today", "Spend your euros"). It is a pretend currency: the shop says so, nothing can be bought with money and no wording suggests real money. Code and the database keep the older names (`coins`, `coin_ledger`). An answer's value is paid through learning, so the numbers on the practice screens include it as the answer is practised, memorised and automated.

## Live listening (memorise lab)

A design rule from the first test user, built at `/lab/memorise` and not yet in the memorise phase itself.

- **Whenever the microphone is open, the screen shows it is hearing.** A level meter moves with the voice, and each word lights the moment the recogniser understands it, on listen-and-repeat screens too. A small line shows the last few words heard, so a word that will not light still reads as "heard", not "ignored".
- **Words only ever turn on.** Nothing is shown as wrong while the student is speaking. What is missing is judged at the end, and one bit is named.
- **No Done button when it goes right.** The screen moves on by itself once every bit has been said.
- **A pause is not a failure and there is no clock.** After about three seconds without a new word, "Give me a hint" and "Move on" appear and Tele keeps listening for as long as the student needs. A hint shows the next word; it still has to be said.
- **Keep going.** A skipped or mangled bit does not stop the words after it from counting. A student who reaches the end with one bit missing passes the screen and only tidies that bit.
- **Tele speaks first, then the microphone opens,** so Tele's own voice is never taken for the student's.
- **Speaking and tapping screens look different at a glance, without interrupting.** A quiet badge sits beside the instruction and stays put. Speaking: a round pink badge with a microphone. Tapping: a square cream badge with a mouse pointer on a device with a mouse, or a pointing hand on a touch device (chosen by the device's main pointer in CSS). Shape and picture carry the difference, not the colour, and the badge has a spoken label ("Speaking screen", "Tapping screen"). A first version flashed a large icon over the card when the kind changed; testers found it interrupted the flow and did not read it, so it was removed (12 Nov 2026). Nothing animates or covers the card when the kind changes. The microphone indicator is only ever on speaking screens.
- **The screen stays awake while a lesson listens,** and if the phone locks anyway, listening picks up on the same screen when the student comes back. An error that arrives just after the page is hidden is read as the lock, not as a broken microphone, so the lesson never drops to self-marking for that. The pause clock starts again on return so no hint is pushed at the student.
- **Tester tools have a device report:** timings and recogniser facts to paste into `docs/device-matrix.md` (no audio, no words). Budget in `docs/performance-budget.md`.
- **A stall on a longer screen marks the next bit.** After a pause, with three or more bits on the screen and some already said, the next bit to say gets a pointer (a small arrow and a thick dashed outline, so it is not colour alone). The buttons become Hint, Hear it and Move on, and Hint and Hear it are for that bit only. At the levels where nothing is on screen the marked bit shows as blanks so the student can see where they are. Being pointed to a bit counts as help.
- **Reaching the end with a bit missing does not end the screen.** Once the last bit is said and the student goes quiet, the missed bit is marked, the line says "One bit left. Say the marked bit.", and saying just that bit finishes the screen as helped, not clean. Only words said after being sent back count for it. Move on still gives the "kept going" credit and names the bit to tidy.
- **A repeated word lights only at the student's place.** Matching prefers unbroken runs of words, and a word that occurs more than once only lights near the student's place (the rest of the bit they are on and the next one) unless a run of three words shows they have jumped ahead. This also stops a recogniser that repeats earlier words from lighting a second "me gusta" further on.
- Logic: `lib/speech/live-match.ts`, `lib/speech/pause.ts`, `lib/memorise/ladder.ts`. Microphone: `app/components/useLiveSpeech.ts`.
- Open: this needs the browser's built-in recogniser with interim results, which `docs/device-matrix.md` still lists as unverified on every device. Where it is missing the lab falls back to the student checking their own answer. Some phones cannot share the microphone between the recogniser and the level meter, so the meter is a switch in the lab's tester tools and starts off on phones.
