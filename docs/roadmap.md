# Roadmap

What we learned from testing El Pasillo with a student, what shipped for the coursework deadline, and what comes next, in the order we would build it.

## Shipped (16 Nov 2026)

From the first test of El Pasillo:

| Finding | What we did |
|---|---|
| **Too easy: any noise stopped the clock.** | Only words that match the door's answer slow the monster now. Noise, coughs and humming do not. The closing speed is higher and rises with each door. |
| **Camera shake and glitch should get dramatic faster.** | One fear curve drives shake, glitch, flicker and heartbeat. It starts building at two thirds of the way, not the last half, and is far stronger when close. |
| **The look over the shoulder should happen on its own.** | A dice roll each moment turns the student round. The chance rises as the monster closes in. The Look behind button still works. Reduced motion turns the forced look off. |
| **Automate was disliked, El Pasillo was loved.** | El Pasillo is now the fourth step. Clearing top-rung doors is stored as timed attempts (numbers only), so "test ready" and the teacher overview keep working. |

Also: the demo now uses real voice recognition on the real screens and explains the journey for non-teachers, and the first-impression screens say what is happening, why and what to do next.

## Next, in order

1. **Scaffolding ladder inside El Pasillo.** Move each run through: read the Spanish chunk, read the whole answer, hear the question and see only first and last letters, hear the question and see only the first chunk, then no help at all. Survive enough no-help doors and you escape.
2. **Ghost-whisper pronunciation aid.** Tap a word you keep getting wrong and hear it whispered in a glitchy, haunted version of the browser voice (the student said "kwee air oh" for *quiero*). Limited supply: each whisper costs time, so it stays a rescue and not a crutch. Needs testing on Chromebook voices, which differ between devices.
3. **A scarier monster and more menacing sound.** Take cues from analogue horror and Backrooms-style entities: a wrong, too-tall figure at the end of the corridor; sound that thins, detunes and swells as the gap closes. More weirdness in the world.
4. **Roughly double the graphic assets.** More rooms, more surreal doors, more objects. Needs a sourcing and licensing pass first ([`docs/asset-credits.md`](asset-credits.md)).
5. **The heavenscape escape.** Survive enough no-help doors and you break out into a calm dreamcore sky as the reward for mastery.
6. **Test simulation mode.** The real endpoint for a student: five questions, in order, spoken by Tele, no help, scored at the end like the real test. Needs its own flow design (task 26.2).
7. **High scores and a class table, without breaking data protection.** The shape that fits our rules: scores tied to the made-up nickname, shown only inside the student's own class, ranked on improvement and effort and not raw points, no free text, no cross-class or public table, off by default for a teacher to switch on. Needs a DPIA update before any build.

## Also parked

Photo import of a sentence builder, remix of a confirmed answer, interest-tag flavoured phrase banks and a student-drawn tutor are tracked as stretch tasks in `openspec/changes/ks3-spanish-speaking-tutor-v1/tasks.md` (17.1 to 17.3). The promo video is being remade.
