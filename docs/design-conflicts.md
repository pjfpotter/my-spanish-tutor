# Design conflicts register

How the dreamcore design (Tele, Bicho.exe boards, art pipeline notes) collides with the existing spec, and what was decided. Decisions made 2026-11-01. Nothing in `openspec/`, `PRD.md`, `ARD.md` or `CLAUDE.md` has been changed yet; the "Spec follow-up" column lists the edits to make.

Status key: **Decided** (user said so), **Assumed** (proposed default, awaiting confirmation), **Parked** (not in v1), **Open**.

| ID | Conflict | Decision | Status | Spec follow-up |
|---|---|---|---|---|
| A | Tele and Bicho are mouthless, but FR-43, the tutor-avatar lip-sync requirements, D7 and tasks 4.3 to 4.5 assume a validated mouth. | Tele stays mouthless. Keep word times, loudness envelope and syllabification. Drop viseme targets and the 30 ms mouth lead. A pronunciation mouth diagram is a later idea. | **Assumed** | Rewrite `tutor-avatar`; simplify `speech-audio-assets`; D7; tasks 4.3 to 4.5 (keep syllabification for 5.4); PRD FR-43 and Appendix A; CLAUDE.md validated-mouth rule |
| B | Two characters (Tele, Bicho) vs one persona set (FR-44) and the "start with one character" rule. | Tele is the one v1 character. Bicho is parked. | **Assumed** | FR-44; task 12.1 becomes one character; 12.4 interest-flavoured banks deferred |
| C | The pet care menu is free-form; the spec has four gated phases (task 6.3). | Gated learning stays. The pet wrapper (Comer, Jugar, Dormir, Limpiar, Crecer) is parked. | **Decided** | None to spec; keep 6.3 as is |
| D1 | Random packs with server odds vs "rare from speed, not luck". | No random packs. Coins buy deterministic desktop things. | **Assumed** | D12; `engagement-rewards` Collectibles; task 13.3 |
| D2 | Pet meters that could decay; Dormir rewards absence. | Parked with the pet. If it returns, meters only fill and a nap is the visual for the streak freeze. | **Parked** | None |
| D3 | Evolution tied to written answer level rewards answers a student cannot yet say. | Parked with the pet. If it returns, evolve on spoken success. | **Parked** | None |
| E | Games (Parejas, Arma la frase, Lluvia de palabras) are reading and tapping, the "false practice" the PRD criticises, and could farm coins. | Parked. Gamification is instead built into the four gated phases (see `design-direction.md`). | **Decided** | None |
| F1 | Apuntes (free-text notes) vs "no free-text" rules; device-only storage; shared Chromebooks; delete-everything and recovery. | Parked. | **Decided** | If revived: notes never leave the device, are wiped by delete-everything, and are not carried by the recovery code |
| F2 | Garabatos (doodle pad) could replace practice with doodling. | Parked. If revived, only as a fidget corner inside practice screens, to be considered for its anxiety benefit. | **Decided** | None |
| F3 | Tele's Talk tab and "feelings from Claude" are runtime model calls and open chat. | Not in v1. Feelings are baked at build time; rule-based word list as fallback. Poking Tele uses stored phrase-bank lines. | **Decided** | Confirm no runtime model use in `tutor-avatar`; task 14.3 stays |
| G1 | ElevenLabs is not on the voice audition list; budget (about £30) and licence unknown. | ElevenLabs character voice is the choice. Confirm plan, licence terms for school and under-18 use, and whether word timestamps are available. | **Decided**, licence check **Open** | D6; task 4.1 becomes the ElevenLabs licence and cost check; 4.2 uses ElevenLabs; 4.4 uses its timestamps if available |
| G2 | "Dream TV voice" effect could affect listening practice. | The user considers a slower, more enunciated character voice an advantage. Effect is an optional setting, not a requirement. | **Decided** | None |
| H1 | Light and dark themes required by CLAUDE.md and the PRD NFR vs a fixed-colour Win98 look. | One dreamcore theme. Replace with the accessibility floor: AA contrast, reduced motion, calm switch. | **Assumed** | PRD Accessibility NFR; CLAUDE.md UI context |
| H2 | Weirdness dial (Cozy, Odd, Haunted) is effectively a theme switcher. | One level only (Odd). No dial and no theme switching in v1. A switcher is a later version. | **Decided** | None |
| H3 | Always-on camcorder overlay over reading surfaces. | Effects stay around the task, not on question, caption or feedback surfaces. | **Decided** | None |
| H4 | Contrast: hyper-pink, lemon and cyan fail as text. | Decorative only. See the contrast table in `design-direction.md`. | **Decided** | None |
| H5 | Photo collage, grain and canvas animation on an old Chromebook. | Set a performance budget at milestone M1 and test on a Chromebook. | **Open** | New task in M1 |
| I | Many watching eyes might make self-conscious students uneasy. | Not a concern for this design. Still worth asking the 2 or 3 extra testers. | **Decided** | None |
| J | Photo provenance; virtual-pet toy trade dress; Windows-style chrome. | Log every photo in `docs/asset-credits.md` before it ships. Avoid the toy's name and trade dress. No brand logos or recognisable people. | **Decided** | New task: create `docs/asset-credits.md` when the first photo is added |
| K | Scope against a two-week, £30 plan. | Build in milestones M0 to M7, aesthetic early, frills last. | **Decided** | `tasks.md` reordering |
| L | Tele is canvas code; the art pipeline prefers layered SVG from Recraft. | v1 keeps the canvas drawing, ported into `lib/tele/`. Layered SVG is a later option. | **Decided** (2026-11-01) | Recorded in design.md D7 |

## Build sequence

```
M0  Finish the speech spike (2.2, 2.3)
M1  Tele on the desktop            <- first Dolores check
      one dreamcore token set, AA text pairs, calm switch
      Tele component, caption window, one ElevenLabs line
      desktop home: five files, countdown stub
      run on an old Chromebook (performance budget)
M2  Hear it (loop 1)
      seed course (3.1, 3.2), minimal anonymous profile
      audio pipeline (4.2) with simplified timeline (4.4)
      comprehension phase (6.x) with channel tuning
      spoken feedback core (5.1, 5.2), event log (10.1), coin ledger (13.1)
M3  Write it
      model answers and rubric first (7.5, 7.1, 7.2), then the one model draft (7.3)
M4  Say it
      memorisation (8.x), feedback tips (5.3 to 5.5)
M5  Own it
      automatisation (9.x), rank (13.2), readiness (11.1)
M6  Before anyone but Dolores
      delete-everything, privacy notice, class join (3.3, 3.5, 3.6)
M7  Cost report, minimal teacher view, scripted end-to-end run, user testing (14 to 16)
```

Frills, only if time: Bicho pet, games, Apuntes and Garabatos, wallpaper shop beyond two or three items, Haunted level, theme switcher, photo import, cheeky pool, interest-flavoured banks, own-drawing tutor, pronunciation mouth diagram.

## Next step

Confirm the three **Assumed** items (A, B, H1), then revise the OpenSpec change with `/opsx:update` using the "Spec follow-up" column.
