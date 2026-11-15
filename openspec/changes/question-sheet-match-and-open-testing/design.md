# Design

## Context

See `proposal.md` for why. What the code does today:

- **A course has one sheet and one interpretation** (`courses.sheet`, `courses.interpretation`), and five questions with no link to either. The interpretation has its own `questions` list; each entry has `es`, `en` and optionally `req`, `blocks` and `required`. The seeded free-time interpretation has exactly one, "¿Qué haces en tu tiempo libre?".
- **The engine already supports per-question limits.** `clash`, `slotFits`, `isReady`, `fragment`, `activeLines` and `signOff` all take an optional `Question` and apply `req` (variant), `blocks` (which sheet blocks) and `required`. `WriteSheet` already accepts a `question` prop and passes it to all of them.
- **The write path never passes it.** `SheetWrite` gives `WriteSheet` a `heading` only. `saveSheetAnswer` calls `signOff(B, a)` with no question and `fromSelection(B, selection)` which does not look at one. So every course question sees every chunk.
- **The seeded course is "Going out"** (films, cinema, clothes, party, free time) with a free-time sheet standing in for a teacher upload (`seed.ts`: "Stands in for a teacher's upload"). Only question 5 matches the sheet.
- **Aunque and polarity.** The polarity rule lets "aunque" flip the reason: "I like X although it is boring" passes. `engine.test.ts` and `signoff.test.ts` assert it, and the teacher's own calibration answers (`docs/content/free-time/calibration.md`: "…lo hago con mi hermana aunque a veces es aburrido") use it.
- **The testing course** (`PRBA7K3M`, `unlock_all`) opens the four phases. Inside them: automate's expert switch is `disabled={!allAtTop}` (`Automate.tsx`), memorise lessons are strictly sequential per answer (`nextFor` returns `lessonsOf(...)[stage]`), and write has no way past an unconfirmed question.

## Goals / Non-Goals

**Goals:**
- A student can only build an answer to a question from what the sheet says belongs to that question, on screen and on the server.
- A question with no sheet is visibly unanswerable from another sheet, not silently answered by it.
- A tester can reach any part of a phase in an unlock-all course.

**Non-Goals:**
- Writing a going-out sentence builder.
- Changing polarity, pair-block or oddness rules.
- Upload-time validation or a teacher control for mapping. Those belong to `upload-sentence-builder-pipeline`.

## Decisions

### D1. Match by question text, computed on load, no column
`matchSheetQuestion(interpretation, spanish)` in `lib/sheets/question-match.ts` returns the index of the interpretation question whose `es` equals the course question's Spanish under `norm` (the engine's lower-case, accent-stripped, punctuation-stripped form), or `null`. `loadWritingCourse` attaches `sheetQuestion: number | null` to each question.

*Why:* it needs no migration, covers every existing course, and cannot drift because both texts are already stored. *Alternative:* a `questions.sheet_question` column. Rejected for now: a migration, a backfill and a place for stale values, for a mapping that is exactly the text today. A teacher remap control would need the column; that is the point to add it, and the loader's `sheetQuestion` field is where it would plug in.

### D2. The question is passed everywhere the engine is used
`WriteSheet` gets `question={B.questions[q.sheetQuestion]}`. `saveSheetAnswer` resolves the same question from the course it loaded and passes it to `signOff`. `signOff` already runs `clash` per chosen chunk with the question, so a chunk from another block is returned as `clash` ("That part is for another question.") and a confirm is refused. `fromSelection` stays unchanged: it checks chunks exist, not whether they suit a question, and `signOff` is the one place that does.

### D3. An unmatched question is a hard stop for writing, a soft stop for testing
`WriteSheet` is not mounted for an unmatched question. `SheetWrite` shows a notice ("This question has no sentence builder yet") with the question text, and in an unlock-all course a "Skip this question" button that moves on. `saveSheetAnswer` returns `{ ok: false, error: 'This question has no sentence builder yet.' }` before reading the selection, for every course, so a crafted request cannot store an answer against it.

In a gated course nothing skips it, so `answersConfirmed` never reaches the total and write stays incomplete. That is the intended signal: the course is missing content. *Alternative:* count unmatched questions as confirmed so the gated order continues. Rejected: it would let a course ship with a question that has no way to be answered and hide the gap.

The real-class seed `TELE8` has four unmatched questions today. That is the truth about the content and is reported at seed time (D4), not hidden.

### D4. The seed lists unmatched questions
`scripts/seed.mjs` calls `unmatchedQuestions(course)` after seeding each course and prints position and text. It does not fail the seed. A hard failure would block seeding a course that is deliberately incomplete during testing.

### D5. A contrast word allows a cost or a benefit, not a contradicting feeling
Testing showed "I like basketball although it is boring" passing. The polarity rule let "aunque" reverse the reason's polarity without limit, and the earlier tests asserted exactly that. The rule from the writing-mode design is that a contrast can set a practical cost against an opinion ("I love basketball even though it is tiring", "...although it is expensive") but not a feeling that contradicts it ("...although it is boring").

A reason chunk can carry `affect: true` (it says how the activity feels). In `polOK`, after a connector with `flip`, an `affect` reason is refused whatever its polarity. In the free-time sheet the feeling reasons are fun, relaxing, exciting, boring, "me hace reír" and "me relaja"; cost ("es caro"), price ("es barato") and health ("es bueno para la salud") are not marked, so they still work after "aunque". After "porque" nothing changes.

*Why a chunk flag and not a pair block:* it is the same judgement for every activity, it is data the upload can draft (the model's instructions now ask for it, and the prompt version is bumped so old drafts are read again), and it needs no per-pair verdicts. *Limit:* the teacher's own calibration answers include "aunque a veces es aburrido", where "a veces" softens it. That hedge cannot be built on this sheet, so nothing the teacher models is lost.

### D6. In-phase gates open from the same flag, read once
The page for each phase already reads `courseUnlockAll`. It passes `unlockAll` as a prop to `Automate` (expert switch enabled), to `MemoriseLadder` (every lesson of every answer openable: `nextFor` is unchanged, a new `openLesson(ai, lessonIndex)` is used only when `unlockAll`), and to `SheetWrite` (skip button). The prop is a plain boolean from the server component, never read from the client, a cookie or an address. A gated course passes `false` and the code paths are untouched.

*Why not change `nextFor` / `stepState`:* they are pure rules the real class depends on and have tests. Opening a lesson out of order is a UI affordance on top of them.

### D7. A testing deployment is a Vercel preview on its own Neon branch
The repo already has a Neon branch policy (`neon.ts`, `docs/database-migrations.md`). The documented way to stand up a testing deployment is: create a Neon branch, point a Vercel preview's `DATABASE_URL` at it, run the migrations and the seed there, and share `PRBA7K3M`. Nothing in code distinguishes the deployments; the course flag does. This task is documentation only. No cloud resources are created by this change.

## Risks / Trade-offs

- **Match by text is brittle if a teacher edits one copy of the question** → the question then shows as unmatched, which is visible (D3, D4), not silent. A later remap control fixes it.
- **The seeded real course shows four unanswerable questions** → intended and reported; the proper fix is a going-out sheet, which is content.
- **Opening lessons out of order lets a tester record progress that a real student could not** → only in an unlock-all course, which already breaks the order by design, and its data is test data.
- **A student on the real class code gets the open behaviour** → same risk as the existing unlock; the flag is server-side and course-level only.

## Migration Plan

No database change. Ship the code, re-run the seed against the testing deployment so the report prints. Existing profiles on gated courses see no change except that unmatched questions now stop being answerable from the wrong sheet. Roll back by reverting the commit.

## Open Questions

- Should "aunque" with a negative reason also be restricted (D5)? Needs the owner's decision; default is to leave it.
- Should a gated course with an unmatched question show something kinder to a student than a stop, such as telling them to ask their teacher? Default: yes, one sentence, no jargon.
