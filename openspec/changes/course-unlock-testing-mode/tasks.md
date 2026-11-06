# Tasks

Verification follows the project rule: every task is verified by automated tests (unit tests, or Playwright on headless Chromium). Run the fast unit suite while building and the end-to-end suite once at the end of group 4. Checks that need a real device or a real person are marked "Optional manual check" and never block ticking a task.

## 1. Data: the flag, its migration and the seed

- [x] 1.1 Add `db/migrations/0011_course_unlock_all.sql` (`alter table courses add column unlock_all boolean not null default false`); verify a test applies all migrations to a fresh test database and that a course inserted without the column reads `unlock_all = false`
- [x] 1.2 Add an optional `unlockAll` to the `Course` type and `validateCourse` in `lib/course/schema.ts`, and make `seedCourse` in `lib/course/seed-db.ts` write it on both insert and update; verify `seed-db.test.ts` covers create with the flag, re-seed keeping it, and a course seeded without it staying `false`
- [x] 1.3 Add a testing course to `lib/course/seed.ts` that reuses the real course's chunks, questions, calibration and model answers under a new class code (placeholder `TESTING`), a title that says it is for testing, and `unlockAll: true`; make `scripts/seed.mjs` seed both courses. Verify a test seeds both into the test database, that the two share identical question and chunk text, and that `TELE8` still has `unlock_all = false`
- [x] 1.4 Add `courseUnlockAll(db, courseId)` (one named read of the flag) and cover it with a unit test for a flagged course, an unflagged course and an unknown id (false)

## 2. The gate: one rule, one read

- [x] 2.1 Change `phaseStates(progress, opts?)` in `lib/phases/gate.ts` to open every phase when `opts.unlockAll` is true, leaving `done` computed from progress, and unchanged behaviour when it is absent or false; verify `gate.test.ts` covers all four phases open for empty progress, `done` still false until earned, and the default path identical to before
- [x] 2.2 Pass the course flag from the four call sites: `lib/server/home.ts`, `app/phases/[phase]/page.tsx`, `app/phases/memorise/page.tsx` and `app/phases/automate/page.tsx`; verify with a test that no other file calls `phaseStates` without the flag (a grep-style guard in the test suite) and that a profile in an unlock-all course gets open states from `loadHome`
- [x] 2.3 Add `unlockAll` to `HomeData` and show a plain text label in the `fases.exe` window of `app/components/Desktop.tsx` only when it is true, using existing tokens and not relying on colour alone; verify a component or Playwright check shows the label for the testing course, shows nothing for `TELE8`, and passes the accessibility check the project already uses

## 3. Practising without written answers

- [x] 3.1 In `lib/memorise/store.ts`, when the course is an unlock-all course and a question has no confirmed answer, use the course's model answer for that question (`rock_solid`, first from `modelAnswersFor`) without writing to `answers`; verify unit tests cover the fallback, "own confirmed answer wins", a gated course returning no fallback, and `loadProgress().answersConfirmed` staying 0 afterwards
- [x] 3.2 Make the empty case safe for any course: memorise shows a short message and a link to the writing step instead of "all done" at 0 of 0, and automate does the same instead of reading `items[0]` of an empty list; verify component tests render both with no items without throwing
- [x] 3.3 Check that attempts from fallback answers record against the question ids and count towards mastery, coins and streak exactly as normal; verify a unit test logs a fallback attempt and reads it back through `loadMastery`

## 4. Guarantees and end-to-end checks

- [x] 4.1 Add a Playwright spec that joins `TESTING`, sees all four phases open, opens memorise and starts a timed round with no written answers, with the fake microphone the other specs use; verify it passes headless
- [x] 4.2 In the same spec, join `TELE8` and verify memorise and automate are locked on the desktop and that their addresses redirect to `/`, then repeat with `?unlock=1` and with a header named like an unlock and verify nothing changes
- [x] 4.3 Verify the existing `tests/journey.spec.ts` still passes unmodified against `TELE8`, and that delete-everything works for a `TESTING` profile (profile and attempts gone)
- [x] 4.4 Run the fast unit suite and then the full end-to-end suite once; verify both pass before moving to documentation

## 5. Documentation and roll-out

- [x] 5.1 Update `docs/user-testing.md`: which code to use for which task (`TELE8` for join and the notice, `TESTING` for hearing a question and the timed round), that testers practise model answers rather than their own, and that tester profiles are throwaway; verify every code and path in the doc exists in the repo
- [x] 5.2 Add a short section to `docs/technical-documentation.md` on the unlock-all flag, the single read site and how to add another testing course; verify the file and function names it mentions exist
- [x] 5.3 Replace the placeholder `TESTING` with a code that is not easily guessed before it is given to anyone outside the project; verify `normaliseClassCode` accepts it (4 to 8 letters or digits) and the tests use the final value

## Workflow follow-up

- Merge to `main`; the build applies migration 0011 to production by itself (see `docs/database-migrations.md`).
- Run `npm run seed` against production to create the testing course and keep the one-time owner token it prints.
- Open the live site, join the testing code and check all four steps are open; join `TELE8` and check memorise is still locked.
- Archive this change after the project's review requirements are satisfied.
