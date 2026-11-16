# Image prompts for the promo storyboard (16 Nov 2026)

For `STORYBOARD.md`. Run each in Gemini, in the same chat as the existing Dolores sketch so the character stays consistent. Attach the standing Dolores image (one of the `Gemini_Generated_Image_*.jpg` files) as the character reference on every prompt that shows her.

**Always prepend the style block** (from `scribble-style-prompt.txt`):

> Loose, scribbly blue ballpoint pen sketch on a page of lined school exercise book paper. Sketchy ink outlines, rough cross-hatching, overlapping doodle-like lines. Spiral-bound notebook page with a faint red margin, blue horizontal lines and subtle coffee stains. No added text, no margin doodles, no extra icons. Portrait orientation, 9:16.

**Dolores:** short curly hair, star tights, striped polo, jumper tied round her waist.

For character poses, add: "plain white background, character only, no lines behind her", so they cut out cleanly.

| Beat | File name | Prompt (after the style block) |
|---|---|---|
| 1 | `01-desk-drawing.jpg` | Dolores at a bedroom desk, drawing in a sketchbook, a textbook open and ignored beside her, a fridge-calendar page pinned on the wall behind her with a circled date (no readable writing). |
| 2a | `02a-flashcards.jpg` | Close-up of Dolores's head resting on her arm over a pile of plain flashcards, bored, half-asleep. |
| 2b | `02b-talking-to-wall.jpg` | Dolores standing facing her bedroom wall, mouth open mid-word, then looking embarrassed. A small speech bubble with a single question mark above her. |
| 2c | `02c-lost-notes.jpg` | A school bag spilling open onto a messy bedroom floor, loose papers everywhere, Dolores peering in, looking lost. |
| 3 | `03-calendar-facedown.jpg` | Dolores's hand turning a wall calendar face down, then Dolores asleep with her head on a sketchbook. |
| 4a | `04a-nightmare-corridor.jpg` | A long school corridor in dramatic one-point perspective, lockers on both sides, darker and heavier ink than the other drawings, the far end disappearing into scribbled black. |
| 4b | `04b-monster-teacher.jpg` | A weird, tall, original monster teacher, thin and stretched, tiny glasses, too many long fingers, no recognisable features of any real person, chasing small Dolores down the corridor. Scribbled speech bubbles of illegible squiggles fly from its mouth. |
| 7a | `07a-test-day-classroom.jpg` | A classroom, about 30 pupils seen from behind and the side, a friendly ordinary teacher at the front with a notepad, Dolores standing at the front looking calm and confident. |
| 7b | `07b-teacher-pen-drop.jpg` | The same classroom, the teacher's pen falling from their hand in surprise as Dolores answers, Dolores grinning. |
| poses | `pose-neutral.png`, `pose-eyes-wide.png`, `pose-speaking.png`, `pose-grin.png` | Dolores, full figure, plain white background, four poses: neutral, eyes wide in alarm, mouth open speaking, a big grin. |

## Notes

- **Colour bleed (beat 5):** I will build this in HyperFrames from `04a` and the app footage, so you do not need a coloured version of anything.
- **The monster teacher** is deliberately not a real person or a recognisable teacher. If Gemini produces something that looks like a real individual, re-roll.
- **Family photos:** the first four Gemini images were drawn from real family photos. Check that nobody recognisable who should not be public ends up in the video. Dolores and her sibling should be invented characters.
- **Credits:** add the new images to `docs/asset-credits.md`, as for the existing Gemini sprites.
