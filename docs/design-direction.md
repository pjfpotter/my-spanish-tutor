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

An old CRT television with one large eye, in a pink cardigan, broadcasting Castilian Spanish. It has **no mouth**.

- Feelings live in the eye (lids, brow, pupil, gaze, tears), the antennae, the picture (tint, static, glitch) and the world (sky colour, rainbow, darkness).
- Six feelings (joy, sadness, anger, fear, surprise, disgust) are recipes that add together, so any two blend.
- While speaking, the screen and antenna tips glow with the voice loudness, and the caption follows the words.
- **Feelings are baked at build time** per phrase-bank line (a feeling track beside the audio). A rule-based word list is the fallback. There is no runtime language-model call and no open chat.
- Tele speaks only Spanish. English appears only as subtitles in the caption window.
- Voice: the ElevenLabs character voice. The "Dream TV voice" effect (slowed, echo) is an optional setting, not a default requirement.
- The first sketch is procedural canvas code. Whether v1 keeps it or rebuilds Tele as layered SVG via `docs/art-pipeline.md` is open (see conflicts register).
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
