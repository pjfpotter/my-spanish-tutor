# Proposal

## Why

The new writing flow (a re-typeset sentence builder above, an answer flashcard below) was prototyped and tested by the owner on seven real Year 8 and Year 9 sentence builders (`docs/design/writing-sheet-prototype/`). Two things came out of it.

1. **Reading a Word sheet is solvable.** A deterministic reader extracts the structure of all seven sheets. Its first run on a held-out sheet read 5 chunks out of about 50 because it assumed Spanish is bold, so the reader must use brackets, italics, bold and a language check together. After that fix it reads all seven.
2. **Knowing what the chunks mean is the real problem.** The prototype's meaning layer (which chunks are negative, what agrees with what, which lists pair with which, which pieces need which) was hand-written for four sheets. A blind read of 84 random answers found roughly one in four with a problem: half-built sentences ("Me gusta mi dormitorio porque es."), a continuation attached to the wrong sentence, pairs that cannot both be true, teacher slips reaching the student ("marrónes", "el pared", glosses like "I go to Spain" for "fui a España") and English subtitles with Spanish left in them. On the three held-out sheets, a layout-order draft with no interpretation produced answers such as "Se llama y. Y liso." Hand-writing a meaning layer per sheet cannot serve every MFL teacher in the UK.

The owner's decisions: upload and go with no teacher review stage; a language-model call at upload time to judge meaning conflicts and to **correct** teacher errors, not just flag them; and no reliance on model sentences from lessons.

## What Changes

- A teacher uploads a sentence builder (Word first) and the course is ready with no human step. The upload runs four stages: read the document, have a model draft the interpretation, verify the draft with automatic checks and repair it against the failures, and fall back to a safe draft if it still fails.
- The interpretation is data in a fixed schema (roles, tags, dependencies, agreement, polarity, sentence frames, questions). A model may only annotate chunks the reader found and make bounded corrections; it never adds chunks and never returns free text for students.
- Model-judged pair verdicts (fits, odd, clash) replace hand-written fit rules. A pair is blocked only when two independent passes agree. The standard is the exam marking rule: credit anything that is grammatical and could be true.
- Teacher errors (spelling, gender and number, missing or wrong English) are corrected at upload. The originals are kept.
- The writing screen changes as tested: the card shows the real Spanish sentence with English beneath and chips as editing handles; extras sit behind "Add more"; the sheet dims what the active slot cannot take; multi-sentence sheets are separate sentence frames that are complete or absent; clothes-style lists take several items; "Check it" stays on screen.
- The permitted uses of a language model gain upload-time interpretation, correction and pair judging, all through the cost router and cached by document content. The practice loop stays model-free.

## Capabilities

### New Capabilities
- `sheet-ingestion`: reading uploaded sentence builders, drafting and verifying their interpretation, correcting teacher errors, falling back safely, and the safety and cost rules for doing that with untrusted documents.
- `writing-sheet-flow`: the writing screen built on that interpretation (sentence on the card, frames, active-slot dimming, add-more, lists) and the judging standard for sign-off.

### Modified Capabilities
<!-- None archived: openspec/specs/ is empty, so there is nothing to modify. The unarchived v1 change defines `answer-writing-coach`, `course-content` and `teacher-course-setup`. This change supersedes parts of them (see design.md, "Relationship to the v1 change") and states its rules on its own terms, as `course-unlock-testing-mode` does. -->

## Impact

- **Code:** new `lib/sheets/` (reader, interpretation schema and validator, verification gate, model stages); `lib/coach/` gains a data-driven engine in place of hand-written fit rules; `app/phases/write/` is rebuilt on it; the cost router gains an `ingest` call class; `lib/course/` stores the interpretation.
- **Database:** a migration for the stored interpretation, corrections (with originals), pair verdicts and the document content hash and prompt version they came from.
- **Rules and docs:** `CLAUDE.md` and the v1 spec change the permitted uses of a language model; `docs/dpia.md`, `docs/ARD.md` and `docs/technical-documentation.md` follow. This lands on the branch for this change only.
- **Cost:** one-off model calls per uploaded sheet, cached by content hash. An early estimate for judging every allowed pair on five sheets is about half a million tokens in total, to be replaced by figures from the cost log.
- **Out of scope:** photo, PDF and Google Docs input (stretch, same pipeline after the reader); a teacher review or approval screen; model sentences from lessons; the memorise phase for multi-sentence answers; sound; changes to scoring.
