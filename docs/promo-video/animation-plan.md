# Promo video "Blank": animation plan

## The look

The real world is drawn in blue ballpoint on spiral-bound lined paper, from `scribble-style-prompt.txt`. The app is full-colour Windows 98 dreamcore. The cut from sketch to app is the visual story: the grey worry world gets coloured in when the app arrives.

Style rules, taken from the supplied images:
- Blue biro on lined paper: red margin, faint blue rules, coffee stains, spiral binding.
- No text and no doodles added to the page.
- Dolores: short curly hair, star tights, striped polo, jumper tied round the waist.
- Dolores's sibling is on the sofa and at the dinner table.

App palette and fonts: `docs/design-direction.md`. Tele has **one eye and no mouth**, so there is no lip sync. When Tele speaks, the screen and antenna tips glow with the voice loudness.

## How it gets rendered

Recommended: **Remotion** (React, renders to MP4, runs on Windows).

| Technique | What it does | Where |
|---|---|---|
| Line boil | Redraws the same sketch at 8 to 12 fps with a slightly different wobble. An SVG `feTurbulence` plus `feDisplacementMap` filter, re-seeded every 2 to 3 frames, gives the hand-drawn shimmer. | Every sketch shot |
| Cut-out moves | A character on a transparent layer slides, nods or shakes over a still background. | Dolores, teacher |
| Frame swap | Two to four poses of the same character, flipped at 6 to 8 fps. | Eyes wide, mouth open, grin |
| Ink reveal | A mask wipes the drawing on as if being drawn. | Opening and title card |
| Paper layer | Texture, slight camera shake and page curl on the cuts, with stepped (not smooth) motion. | Whole video |
| Colour bleed | The sketch fills with colour as the app arrives. | Shot 14 |
| Phone composite | Playwright screenshots in `screens/`, scaled into the phone held in the sketch. | Shots 14 to 17 |

Alternatives:
- **raea skill** is installed. I haven't checked whether it runs on Windows. It is built for 3D and footage, so it is probably overkill for this look.
- **Image-to-video AI** can animate a single sketch, but it drifts in style and in who the character is. Use it, if at all, for one shot.

## Assets so far

| Folder | Contents |
|---|---|
| `Gemini_Generated_Image_*.jpg` (4) | Sofa, Dolores at the bus stop, dinner table, messy bedroom |
| `screens/` | 28 captures. Phone (Pixel 5 at 3x): welcome, demo hub, hear, memorise, round, tutor feelings, rewards, teacher view. Desktop: welcome, tutor. `30-` and `31-` are Tele on its own, neutral and in six feelings. |
| `assets/tele/` | The 12 Tele sprites (TV, screen, jacket, hands, door, mushroom, clouds) for compositing |
| `assets/sfx/` | 24 app sounds: taps, correct and miss, combo, personal best, Tele's wordless reactions |
| `assets/icons/` | App icons |

The Tele sprites are Gemini-generated and need attribution (`docs/asset-credits.md`).

## Source images still needed

Same prompt as before, with the standing Dolores image as the character reference. Ask for plain white or paper backgrounds on the character poses, so they cut out cleanly.

| Shot | Image needed | Status |
|---|---|---|
| 1 | Classroom, wide: about 30 pupils from behind and the side, teacher at the front, Dolores standing at the front | **Missing** |
| 2 | Teacher's face and mouth, close-up, mid-question | **Missing** |
| 3 | Dolores's face, close-up, eyes wide | **Missing** (the bus-stop face is too small) |
| 6 | Teacher's hand giving Dolores a worksheet | **Missing** |
| 7 to 8 | A school bag, open, packed with chaos | The bedroom image can stand in |
| 9 | Dolores reading a sheet silently | The sofa image can stand in |
| 10 | A flashcard with Spanish and English both on the front | **Missing** (simple) |
| 11 | Phone with a maths app, confetti | Compose from a phone sketch plus a colour app screenshot |
| 12 | Teacher buried in answer sheets | **Missing** (optional, first to cut) |
| 13 | Dolores deflated | The bus-stop image can stand in |
| 16 | Dolores speaking into a headset | The sofa image has the headset sibling, but a Dolores version is better |
| 18 to 19 | Same classroom as shot 1, with Dolores answering and the teacher dropping their pen | **Missing**, but reuse the shot 1 background |

Character poses for Dolores (isolated, on white): neutral, eyes wide, mouth open speaking, grin.

## Decisions to make

1. **Format:** 16:9 for a presentation, or 9:16 for social. The sketches are mostly landscape and the app screens are portrait.
2. **Whether the siblings appear in the video.** The sketches are drawn from real family photos. Your asset rules say no recognisable children inside the app. For a public video that is your call.
