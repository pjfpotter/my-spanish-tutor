# Proposal

## Why

The user-testing plan (`docs/user-testing.md`, task 16.2) has each child hear a question (task 3) and play a timed round (task 4) in a 15 to 20 minute session. A fresh profile cannot reach either: memorisation stays locked until all five answers are confirmed and all five questions are mastered across two sessions, and the timed round (automate) stays locked until all five answers are memorised. The plan cannot be run as written. Real classes must keep the gated order, so the fix has to be something a tester opts into by joining a different course, not a switch that real students can reach.

## What Changes

- A course can be flagged as an **unlock-all course**. Every student who joins it sees all four phases open from the start. The gated order is unchanged for every other course, including the real class (`TELE8`).
- A second course is seeded with its own class code (placeholder `TESTING`) and the flag on, carrying the same content as the real course so testers see the same questions, chunks and model answers.
- Memorise and automate work for a tester who has not written any answers: in an unlock-all course they practise the course's model answers in place of the student's own confirmed answers. Today those screens break or show nothing with no confirmed answers.
- The desktop shows a plain "Testing course: every step is open" label, so a tester (or a real student who joined the wrong code) can tell.
- `docs/user-testing.md` says which code to use for which task.
- No new personal data, no new stored audio, and no change to how scores, rewards or the privacy rules work. The flag belongs to the course, never to a student.

## Capabilities

### New Capabilities
- `course-unlock-testing`: a course-level testing flag that opens every phase, how a tester joins such a course, what memorise and automate practise when the student has written nothing, and the guarantee that the flag never applies to a course that did not set it.

### Modified Capabilities
<!-- None. The gated order is defined in the unarchived change `ks3-spanish-speaking-tutor-v1` (question-comprehension, answer-writing-coach, response-automatisation, engagement-rewards), and `openspec/specs/` is empty, so there are no archived requirements to modify. The new capability states the exception on its own terms and leaves those requirements as they are. -->

## Impact

- **Database:** one migration adds `courses.unlock_all boolean not null default false`. Existing courses are unaffected. Migrations now run automatically on every Vercel build.
- **Code:** `lib/phases/gate.ts` (`phaseStates` takes the course flag), `lib/server/session.ts` (the profile record carries the flag), `lib/server/home.ts`, `app/phases/[phase]/page.tsx`, `app/phases/memorise/page.tsx`, `app/phases/automate/page.tsx`, `lib/memorise/store.ts` (model-answer fallback), `app/components/Desktop.tsx` (label), `lib/course/schema.ts` and `lib/course/seed-db.ts` (the flag), `lib/course/seed.ts` and `scripts/seed.mjs` (the second course).
- **Docs:** `docs/user-testing.md`, and a short note in `docs/technical-documentation.md`.
- **Operations:** the seed run must be repeated against production after the migration; the new course's owner token is shown once on first creation.
- **Out of scope:** an on-screen toggle, a URL parameter or any per-student unlock (students could find them); resetting or deleting tester profiles beyond the existing delete-everything control; changing thresholds or mastery rules for the real class.
