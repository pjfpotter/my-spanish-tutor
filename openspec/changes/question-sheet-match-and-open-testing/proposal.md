## Why

Testing the write phase end to end showed that a course with several questions and one sentence builder (SB) offers that same SB for every question. The seeded "Going out" course has four questions about films, cinema and clothes, and one about free time, but its only sheet is the free-time SB. A student on question 1 can build "I like basketball although it is boring" and be told "this makes sense". The engine already knows how to restrict an SB to one question (`req`, `blocks` and `required` on an interpretation question, used for sheets whose halves answer different questions, such as a present-tense half and a past-tense half), but nothing connects a course question to one of those restrictions. `SheetWrite` passes only a heading to `WriteSheet`, and the server's `saveSheetAnswer` calls `signOff` with no question. Separately, the testing course opens every phase but still gates things inside the phases, so a tester cannot jump to the part they want to try.

## What Changes

- Each course question is matched to the sheet question it answers (by its Spanish text, ignoring case, accents and punctuation). The matched sheet question's `blocks`, `req` and `required` apply on the write screen and in the server's sign-off, so a chunk that belongs to another question cannot be chosen, and a saved answer that holds one is refused.
- A course question that no sheet question matches is shown as "no sentence builder for this question yet". It can never be confirmed, and it never shows another question's sheet. In a testing course the student skips it and memorise and automate practise the model answer, as they already do for any unwritten answer.
- The seed reports which questions of each seeded course are unmatched, so a gap is visible when seeding and not found by a tester.
- In an unlock-all course, the gates inside the open phases are lifted too: the expert-mode switch in automate is available straight away, any memorise lesson of any answer can be opened, and the write screen can move past a question without confirming it.
- `docs/user-testing.md` and `docs/technical-documentation.md` describe the open testing course and how to stand up a separate testing deployment (a preview deployment on its own Neon branch, seeded with the testing course).
- A contrast word such as "aunque" no longer excuses a reason that contradicts the opinion: "I love basketball although it is expensive" still works, "although it is boring" does not. Reasons that say how the activity feels are marked, and the upload instructions ask for that mark. See design D5.

## Capabilities

### New Capabilities
- `contrast-reasons`: what a contrast connector may introduce after an opinion.
- `question-sheet-match`: how a course question is matched to a sheet question, what the match restricts on the write screen and on the server, and what a question with no match does.

### Modified Capabilities
- `course-unlock-testing`: an unlock-all course also opens the gates inside the phases (expert mode, memorise lessons, skipping an unmatched or unwritten question). Defined in the unarchived change `course-unlock-testing-mode`, so the delta is stated here as a new requirement on that capability name.

## Impact

- **Code:** `lib/sheets/question-match.ts` (new, pure), `lib/progress/writing-store.ts` (load the match, pass it to `signOff`, refuse unmatched), `app/phases/write/SheetWrite.tsx` and `app/components/sheets/WriteSheet.tsx` (pass the question, show the unmatched notice, skip), `app/phases/automate/Automate.tsx` and its page (expert switch), `app/components/memorise/MemoriseLadder.tsx` and its page (open any lesson), `scripts/seed.mjs` (report unmatched questions), `lib/course/seed.ts`.
- **Database:** none. The match is computed on load from the question text and the stored interpretation, so existing courses are covered with no migration or backfill.
- **Data:** the seeded "Going out" course has one matched question (free time) and four unmatched. This is honest: there is no going-out sheet yet. In the real-class course `TELE8`, those four cannot be written until a going-out sheet is uploaded.
- **Docs:** `docs/user-testing.md`, `docs/technical-documentation.md`.
- **Out of scope:** upload-time validation that every question matches (belongs to `upload-sentence-builder-pipeline`), a teacher control to remap a question by hand, authoring a going-out sentence builder, and any change to the polarity or pair rules.
