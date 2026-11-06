# Design

## Context

See `proposal.md` for why. What the code does today:

- **The gate is one pure function**, `phaseStates(progress)` in `lib/phases/gate.ts`. Four places call it: `loadHome()` (the desktop), `app/phases/[phase]/page.tsx` (the redirect for a typed address), `app/phases/memorise/page.tsx` and `app/phases/automate/page.tsx`. Nothing else decides whether a phase is open.
- **A profile belongs to one course** (`profiles.course_id`), chosen at joining by class code (`findCourseByCode`). `Profile` is built in three places (`createProfile`, `getProfile`, `restoreProfile`) and does not carry any course settings.
- **`defaultCourse()` is the oldest course** (`order by created_at`). It is used only for a signed-out device and for the days-to-test figure. `TELE8` is older than any course added later, so a second course does not displace it.
- **`seedCourse()` finds a course by class code and updates it in place**, creates it if missing, and prints a one-time owner token on creation only. The same seed data (`SEED_COURSE`) can be written under a different code.
- **Memorise and automate assume confirmed answers.** `loadMemoriseItems` joins `answers` on `confirmed_at is not null`, so with none it returns `[]`. Memorise then reports "all done" (0 of 0) and automate reads `items[0]` of an empty list. Unlocking alone would give testers a broken or empty screen.
- **Attempts and mastery are keyed by question id**, not by answer id (`attempts.item_id`, `mastery.item_id`). Practising a model answer instead of the student's own therefore records against the same ids with no change to the stores.
- `openspec/specs/` is empty: the v1 change has not been archived. A delta cannot modify requirements that exist only in another unarchived change, which is why the spec is a new capability.

## Goals / Non-Goals

**Goals:**
- A tester who joins the testing course can open every phase and run a timed round within a 15 to 20 minute session.
- The real class cannot be unlocked by anything a student can do.
- The unlock is read in one place, so the desktop, the redirects and the phase pages cannot disagree.

**Non-Goals:**
- Pre-filling a tester's progress, mastery or written answers in the database.
- Any per-profile or per-device unlock, toggle, address value or cookie.
- Changing mastery thresholds, time windows or scoring for any course.
- A teacher-facing control to flip the flag. It is set by the seed, which only the owner runs.

## Decisions

### D1. The flag lives on the course, not the profile
A new column `courses.unlock_all boolean not null default false`. A student's unlock is whatever their course says. Alternatives:
- *A flag on the profile.* Needs something to set it, and whatever sets it is something a student might find. Rejected.
- *An environment variable (preview only).* Cannot be used on the real site, and would unlock every student of a preview, including real ones. Rejected in the earlier discussion.
- *Derive it from the class code in code* (for example `code === 'TESTING'`). Hides the rule in a string comparison and leaves nothing in the database to inspect. Rejected.

`default false` means every existing course, and any course created without thinking about it, stays gated. The flag is only ever written by the seed.

### D2. `phaseStates(progress, opts?)` takes the flag; one helper reads it
`phaseStates` gains an optional second argument `{ unlockAll?: boolean }`. When true it returns every phase open, with `done` still computed from progress (so ticks and the readiness meter stay honest). A single helper, `courseUnlockAll(db, courseId)`, reads the column. The four call sites pass its result. This keeps the gate a pure function that is easy to unit test, and puts the database read in one named place.

Alternative: put `unlockAll` on `Progress` so callers change nothing. Rejected: `Progress` describes the student, and `loadProgress` is also used by the planner and readiness meter, which should not change.

`Profile` is left alone. Adding the flag there means touching three constructors for a value used in four places that already have the `courseId`.

### D3. The testing course is the same content under a second code
`scripts/seed.mjs` seeds `SEED_COURSE` as today, then seeds a copy with `classCode: 'TESTING'`, a title that says it is for testing, and `unlockAll: true`. The `Course` type and `validateCourse` gain an optional `unlockAll`, and `seedCourse` writes it (insert and update, so re-seeding keeps the flag and cannot silently drop it). Chunks, questions, key words, calibration and model answers are the same objects, so testers see the real content. The testing code was a placeholder `TESTING` at design time; the applied code is `PRBA7K3M` (8 characters, no look-alike characters, not a word a student would try). It is a constant, so it can be changed in one place.

Alternatives: copy the real course's rows with SQL (drifts the moment content changes); one course with a per-profile toggle (D1). Both rejected.

Audio is keyed by a hash of the text and speed (`lib/audio/manifest.ts`: "identical text is built once for every course"), so the testing course needs no new clips.

### D4. Practising without written answers: model answers stand in, read-only
In `loadMemoriseItems`, when the course is an unlock-all course and a question has no confirmed answer, the item uses the course's model answer for that question (the `rock_solid` level, the first one `modelAnswersFor` returns). The item still carries the question id, so attempts and mastery record against the same ids. The model answer is never written to `answers`, so `answersConfirmed` stays truthful and the real writing phase still behaves correctly if the tester goes back to it.

Found while applying: `recordRecall` also refused any attempt without a confirmed answer ("Confirm this answer first."), so showing the fallback alone would have let testers see the screen but not record anything. A single helper, `practiceAnswerText` (own confirmed answer, else the model answer in an unlock-all course, else null), is therefore used by the loader's per-question rule, `recordRecall` and the automate recorder. A gated course still gets null and the same refusal as before.

For a gated course nothing changes: no fallback, and `[]` still cannot happen there because memorise is locked until five answers exist. The existing empty-list behaviour is also made safe on its own (memorise says there is nothing to practise yet and links to the writing step; automate does the same instead of reading `items[0]`), so a course that ever reaches that state fails politely rather than crashing.

Alternatives: seed fake answers for each tester (writes data that looks like a student's and has to be cleaned up; rejected); skip the phases when empty (testers could not do task 4; rejected).

### D5. A visible label, no new states
The desktop shows a small text label in the `fases.exe` window when the course is an unlock-all course. It is plain text with an icon-free border, not colour alone, and uses the existing tokens. It is driven by one extra boolean in `HomeData`. No new route, cookie or storage.

### D6. What is tested
- Unit: `phaseStates` with and without the flag (all open; `done` still reflects progress; default unchanged); `loadMemoriseItems` fallback and "own answer wins"; seed writes and preserves the flag; migration leaves existing rows `false`.
- End to end: join `TESTING`, see four open phases, open memorise and run an automate round with no written answers; join `TELE8` and confirm memorise and automate stay locked and their addresses redirect; a gated student adding `?unlock=1` or similar changes nothing.
- The existing journey spec keeps running against `TELE8`, which is the regression guard that the real course is untouched.

## Risks / Trade-offs

- **A real student guesses or is told the testing code** and skips the gates → the label makes it visible, the code is not published, the placeholder should be replaced with a less guessable one, and nothing is lost (progress records normally). The cost of a mistake is a student who sees every step early, not a data or privacy problem.
- **Tester data mixes with real data** (tester attempts count in cost and activity reports) → testers use throwaway profiles in a separate course, so the real class overview is unaffected; the cost report counts spend across courses by design and is not changed here.
- **A change to gate behaviour might leak into the real course** → default `false`, the explicit `TELE8` end-to-end check, and the single read site.
- **Model-answer practice is not the student's own answer**, so what testers experience in memorise is slightly different from a real student's → acceptable for testing; noted in `docs/user-testing.md` so findings are read with that in mind.
- **Days-to-test on the desktop uses `defaultCourse()`** (the oldest course), not the profile's own course. For the testing course this shows `TELE8`'s date, which has the same content. Not changed here; recorded so it is not mistaken for a bug in this change.

## Migration Plan

1. Add `db/migrations/0011_course_unlock_all.sql`: `alter table courses add column unlock_all boolean not null default false;`. Additive, no data rewrite. It applies automatically on the next Vercel build (see `docs/database-migrations.md`).
2. Deploy. Existing courses read `false`, so behaviour is unchanged.
3. Run `npm run seed` against production to create the testing course. Keep the owner token it prints once.
4. Rollback: stop giving out the testing code. The column is harmless if left in place; dropping it later is a new migration. The testing course can be removed with the delete controls on its profiles, or by a one-line SQL delete of the course, which cascades.

## Open Questions

- The final testing class code (placeholder `TESTING`). Can be decided at seed time without changing anything else.
