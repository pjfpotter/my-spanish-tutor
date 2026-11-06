# Writing builder prototype: handoff to the spec

> **Archived record (added 6 Nov 2026).** This handoff came from a prototype session on branch `claude/ecstatic-ramanujan-tkj170`. Its decisions were built into the app (`lib/coach/rubric.ts`, `lib/coach/model-answers.ts`), and `rubric.md`, `calibration.md` and `sentence-builder.md` are now in `docs/content/free-time/`. Kept here as the record of why the writing phase works the way it does. The "another branch" and published-artifact references below are as they were at the time.

| | |
|---|---|
| **Status** | Prototype finished. Decisions below are agreed with the owner unless marked *open*. |
| **Purpose** | Test approaches for the writing phase before changing the spec and the main repo. |
| **Prototype file** | `docs/design/answer-builder-prototype.html` (opens in a browser, no build, no network except fonts). |
| **Published copy** | Private artifact, owner only: https://claude.ai/artifact/7je9sJTgHmdN64xB3jHgWy |
| **Scope** | One question, *¿Qué haces en tu tiempo libre?*, one sentence builder, one rubric. No audio, no storage, no model calls, no student data. |
| **Source material** | The teacher's calibration sheet (nine model answers), `5_4_Que_haces_en_tu_tiempo_libre_SB_2.docx`, and `rubric.md`. `rubric.md`, `calibration.md` and `sentence-builder.md` live on another branch, not this one. |

Use this file as the input to an OpenSpec update of `ks3-spanish-speaking-tutor-v1` (answer-writing-coach, course-content, design D8 and D9, ARD-8, tasks 7.x, PRD FR-2).

## 1. Summary

The writing phase should not be a free-form builder with a live score. It should be: **pick a target, get a model answer that works, tap any chunk to swap it for another chunk from the sentence builder.** The level comes from counting features in the chunks, and the three levels are renamed **Good enough, Really good, Amazing**.

## 2. Decisions

| # | Decision | Replaces or changes | Why |
|---|---|---|---|
| D1 | Student picks one of three targets: Good enough, Really good, Amazing. Each card shows how the student might feel, a time guess and a sample answer. | Five rungs (survival, opinion, detail, range, showing off) were tried and dropped. | Five rungs plus counts overwhelmed the page. Three levels match the spec and the teacher's models. |
| D2 | Level names: **Good enough, Really good, Amazing**. | "survival, good, showing off" in the spec, tasks and PRD FR-2. | "Survival" reads as negative. For some students the first level is a real achievement. |
| D3 | The answer autofills from a **model answer template** for the chosen level. A few templates per level. "Try another model" cycles them. | Spec: the coach drafts the answer with a model at runtime. | Free building was too restrictive and too hard to reach the upper levels. Templates always work and can be checked by the rubric engine. |
| D4 | Tap any chunk to see **only the chunks that fit** in that slot. The sheet offers swaps from the sentence builder and nothing else. | New. | Gives freedom without letting students make nonsense. Fit is by rule (see section 6). |
| D5 | Switching target keeps the student's swaps where the slot still makes sense. | Replaces the spec's "aim higher: one upgrade at a time". | Simpler. The student moves up a level without starting again. |
| D6 | **Personalisation is parked.** No interest packs, no add-a-word box, no model word lookup. | Spec requirement "Light personalisation" and interest tags. | Packs felt clunky and did not give real freedom. Revisit later. |
| D7 | The level is shown as a three-step meter plus a named list of features. No numbers. | Matches spec "no numeric grade". | |
| D8 | A **justified opinion is needed somewhere in the test, not in every answer.** | `rubric.md` first draft required one per answer. | Teacher's rule. A good answer without *porque* can still be Really good. |
| D9 | **Amazing needs 4 extras including 2 tricky ones** (not 5). | `rubric.md` first draft said 5. | With 5, two of the teacher's three Amazing models scored Really good. |
| D10 | The English subtitle is built from the sentence builder's own glosses. | New. | Keeps English as subtitles only and needs no translation step. |

Time guesses on the cards are **about 5, about 10 and 15 or more minutes a day**. The owner says keep them for now, but they really depend on the learner.

## 3. Rubric as prototyped

Frame (the **justified opinion**): starter, then activity, then *porque*, *ya que* or *dado que*, then a reason. Repeating the frame adds nothing. It counts across the whole test, not per answer.

Seven extras, each counted once however often it appears:

| # | Extra | What counts | Tricky |
|---|---|---|---|
| E1 | Contrast | *sin embargo* or *aunque* | |
| E2 | When or how often | *todos los días*, *los fines de semana*, *los sábados*, *por la tarde*, *una vez a la semana*, *a veces*, *de vez en cuando* | |
| E3 | *Lo hago* / *lo hacemos* | with or without *con* + person | yes |
| E4 | Plan or wish | *me gustaría* or *voy a* + infinitive | yes |
| E5 | Closing line | *Tengo mucho tiempo libre. ¡Qué guay!* or *No tengo mucho tiempo libre por los deberes. ¡Qué rollo!* | yes |
| E6 | Reason beyond *es* + adjective | *es bueno para la salud*, *me hace reír*, *me relaja* | |
| E7 | Second "because" word | *ya que* or *dado que* as well as *porque* | |

Levels: **Good enough** is the floor, so any on-topic attempt starts here. **Really good** needs at least 1 extra. **Amazing** needs at least 4 extras including at least 2 tricky ones (E3, E4, E5).

Rules: chunks, not perfection (accents and slips never lower the level). Words outside the sentence builder are not features. Feedback names one thing at a time.

*Open:* the rubric lists E3, E4 and E5 as tricky. Teacher's note: *verb + infinitive* is scored highly in the exam spec and is a stumbling block, and students avoid *lo hago* and *lo hacemos* "like the plague".

## 4. Evidence: the teacher's nine models

Each numbered item in the teacher's three columns is a **separate model answer**, not one three-part answer. Scoring the nine with the rules above:

| Model | Extras found | Tricky | First draft of rubric | Current rules |
|---|---|---|---|---|
| Good enough 1 to 3 | none | 0 | Good enough | Good enough |
| Really good 1 | E6 | 0 | Really good | Really good |
| Really good 2 | E1, E2, E6 | 0 | Really good | Really good |
| Really good 3 | E1, E2, E3 | 1 | **Good enough** (no *porque*) | Really good |
| Amazing 1 | E2, E4, E5, E6 | 2 | **Really good** | Amazing |
| Amazing 2 | E1, E2, E3, E4, E5, E6 | 3 | Amazing | Amazing |
| Amazing 3 | E1, E2, E3, E4 | 2 | **Really good** | Amazing |

First draft: 6 of 9 match the teacher. Current rules: 9 of 9. The worked table in the first `rubric.md` only agreed because it scored each column as one answer.

**Watch:** Amazing 1 and Amazing 3 have exactly 4 extras. Changing the one "better reason" in Amazing 1 drops it to Really good. Decide whether that is acceptable or whether those templates should carry a spare extra.

## 5. Chunk and template data

Chunks come from the sentence builder only. Each chunk has a kind and, where needed, tags.

| Kind | Source | Tags used |
|---|---|---|
| starter | *me gusta, me encanta, me chifla, prefiero, suelo, no me gusta, odio, me gustaría, voy a* | polarity (positive, negative, neutral), tricky (*me gustaría*, *voy a*) |
| activity | 15 infinitive phrases | none |
| justifier | *porque, ya que, dado que* | |
| reason | 9 phrases | polarity, "better reason" (E6) |
| frequency | 7 phrases | E2 |
| *lo hago* | *lo hago, lo hacemos* | E3, tricky |
| people | *con mis amigos*, best friend (m/f), family, brother, sister, cousins | |
| closing line | 2 fixed lines | E5, tricky |
| contrast | *sin embargo*, *aunque* | E1 |

Gendered people options are offered as separate choices (*mi hermano*, *mi hermana*). The teacher's models also use *pero* and *y* as glue. Neither is in the sentence builder.

A template is a list of sentences. Each sentence is a list of slots (kind, key, allowed set) and fixed glue. Each template carries default chunks. The prototype keeps the teacher's nine as the templates, three per level.

Teacher wording changed to fit the builder: "Sábado," became *Los sábados*, *mis amigas* became *mis amigos*, *reir* became *reír*.

## 6. Rules the prototype enforces

- A swap can only use another chunk from the same slot set. Starters swap within opinion, negative or future (*me gustaría / voy a*) sets. Contrast slots do not swap across kinds (*sin embargo* starts a sentence, *aunque* joins clauses).
- Reasons must match the starter: positive starters take positive reasons, negative starters take negative reasons, neutral starters (*suelo*, *voy a*) take either. After *aunque* the reason is the **opposite** polarity (*prefiero escuchar música… aunque a veces es aburrido*).
- If a swap breaks a dependent chunk, the code repairs it and tells the student in one line.
- Activities, frequency phrases and people are not repeated within an answer.
- A swap that would lower the level is still allowed, and its tile says **lowers level**.
- Level is computed from rendered chunk properties, never from the Spanish text.

## 7. What was tried and dropped

| Tried | Why dropped |
|---|---|
| Five rungs with a live panel | Overwhelming, and too hard to reach rung three. |
| Free building tile by tile from a state machine | Restrictive. The upper levels were almost unreachable. |
| Interest packs, glossary tab, course-list tab, faked word lookup | Clunky. Did not feel like freedom. Interest tags are parked. |
| Opinion-strength boosters on a film question | Parked, but the finding stands: *muy* always fits, while *bastante* and *un poco* depend on how strong the opinion is. If a future sentence builder has boosters, tag them with strength and tag openers with strength. |

## 8. Proposed spec changes

These are drafts for the repo chat to refine. Names follow the spec's existing style.

**answer-writing-coach**

- *Modified* "Level and time targeting": the student chooses Good enough, Really good or Amazing, with cues for confidence and time. The first card is a positive framing, not a failure level.
- *Modified* "Answers built from the sentence builder": every chunk, including swaps, comes from the builder. Any other word is rejected.
- *Modified* "Rubric tiering by rules": level is the highest rule met. Good enough is the floor, Really good needs at least 1 extra, Amazing needs at least 4 extras including 2 tricky ones. A justified opinion is tracked across the test, not per answer. The counted features are shown by name, never as a number.
- *Replaced* "Aim higher suggestions": the student switches target and keeps compatible swaps.
- *Added* "Model answers and swaps": each level has several model answers. Tapping a chunk shows only chunks that fit. A swap that lowers the level is flagged.
- *Removed or deferred* "Light personalisation".
- *Modified* "Draft failure handling": model answers are now the main path, not a fallback.

**course-content**

- *Modified* "Simplified mark scheme": the three level names, the frame and seven extras as feature tags, and the thresholds.
- *Added* "Model answer templates": each question has several templates per level, authored as slots, and each template must reach its own level under the rubric.
- *Modified* chunk feature tags: add the extras E1 to E7. The existing tag set (opinion, justification, connective, sequencer, adjective, tense, idiom) has no tag for *lo hago* (E3).

**design.md D8, D9 and ARD-8, ADR-9**

- D8 stays (rubric from tagged chunks). Add the new tags and the threshold rule.
- D9 says a model drafts answers at runtime. *Open suggestion:* use the model **offline** to draft templates from the chunk bank, then accept a template only if the rubric engine puts it on its level. That keeps the practice loop free of model calls and removes runtime cost.

**tasks.md 7.x**

- 7.1: unit tests should cover all nine of the teacher's models (not three samples), with expected levels.
- 7.3 and 7.4: replace the draft request and the upgrade suggestions with template selection, swaps and level switching.
- 7.6: "features light up as they are used" still fits, using the named features list.

**PRD FR-2** and any other mention of "survival, good, showing off": rename.

## 9. Not prototyped

Confirmation gate, memorising and speaking phases, saving answers, five questions in one course, **more than one sentence builder in a single test** (for example a house question and a bedroom question). Cross-answer tracking of justified opinions and tenses across the whole test. Production audio and the character.

## 10. Open questions

1. Does the writing coach call a model at runtime at all, or only offline to author templates?
2. Should templates sitting exactly on a threshold (Amazing 1, Amazing 3) get a spare extra?
3. How should the whole-test rules be shown to a student (a justified opinion somewhere, about 5 opinions in total, three tenses)? The brief had "about 5 opinions"; the teacher's note says "two justified opinions and three tenses across the whole task".
4. Who authors templates when the sentence builder changes, the developer or the teacher?
5. Are the time guesses right once real students try them?
6. Where do *pero* and *y* sit? They are used in the teacher's models but are not in the sentence builder.

## 11. Teacher's notes worth keeping

- In a five-question speaking test at KS3, **one or two Amazing answers are enough for top marks.**
- Verb plus infinitive is scored highly and is a stumbling block. In a real class, students avoided *lo hago* and *lo hacemos*.
- Good enough answers would get a GCSE grade 4 pass if accurate and consistent, with three tenses and two justified opinions across the whole picture task and conversation.
- Amazing answers risk trying to memorise too much in too little time.
