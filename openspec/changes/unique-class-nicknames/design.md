# Design

## Context

See proposal.md. Observed in code:

- `lib/profile/profile.ts` holds `ADJECTIVES` and `NOUNS` (12 each), `nicknameOptions(count, random)` and `isNicknameShape(s)`, which accepts only a listed "Adjective Noun". `createProfile` validates the shape and inserts; it does not look at other profiles.
- `app/welcome/page.tsx` generates six options on the server when the page renders, before any class code is known, and passes them to `WelcomeForm`. The form's first step posts the class code to `/api/join`, which returns only the course title and test date.
- `/api/profile` creates the profile and returns the recovery code. No database constraint makes nicknames unique, and `profiles` has no unique index on (course, nickname).
- `OverviewView.tsx` keys each student row by `s.nickname`.
- `docs/dpia.md` says the nickname is "picked from a generated list". Many unit tests call `createProfile(db, { nickname: nicknameOptions(1)[0] })` more than once in the same course.
- The end-to-end `signUp` helper posts straight to `/api/profile` with `nicknameOptions(1)[0]`, chosen in the test process, so it never sees which names are taken.

## Goals / Non-Goals

**Goals:** a huge nickname space; names unique within a class when joining through the app; the overview safe with the duplicates that already exist; an end-to-end suite that cannot collide.

**Non-Goals:** a database constraint, renaming existing students, free text, showing anything new to teachers.

## Decisions

1. **Compose from slots, not a bigger flat list.** 40 adjectives by 40 nouns gives 1,600 two-part names; one extra distinct adjective in front gives 40 by 39 by 40, which is 62,400 three-part names. `generateNickname(random)` picks the pattern (about one in four is three-part) and the words. Alternative: add digits or syllable-built nonsense words. Rejected: digits look like codes, and made-up syllables risk accidental rude words that a closed, reviewable word list does not.
2. **The shape check is the closed vocabulary.** `isNicknameShape` splits on spaces and accepts one or two distinct listed adjectives then one listed noun. Every old name still passes. A nickname that is not in the lists cannot be typed in, so there is still no free text anywhere.
3. **Options are class-aware and come from `/api/join`.** The join route already knows the course, so it reads the taken nicknames and returns six untaken options with the course. The welcome page no longer generates anything (so no `force-dynamic` list). Alternative: a separate options route. Rejected: one fewer request, and it keeps "options only after the class is found".
4. **`takenNicknames(db, courseId)` and the check live in the route, not in `createProfile`.** Many unit tests make several profiles in one course with random nicknames; making the data layer strict would make them flaky for no benefit. The route is where a student chooses, so it checks, returns 409 `That nickname was just taken. Pick another.` and includes fresh options so the form can swap them in. Alternative: a unique index on (course, nickname). Rejected: existing classes already hold duplicates, so the migration would fail to apply, and a partial index cannot say "only new rows".
5. **The narrow race stays harmless.** Two students submitting the same name in the same instant could both be created. That is rare, and the overview no longer breaks on it (decision 6), so a unique lock is not worth its cost.
6. **Overview rows are keyed by position as well as nickname.** `key={`${i}-${s.nickname}`}`. The rows are a static list per render, so a positional key is safe.
7. **Tests.** The `signUp` helper asks `/api/join` for the class's options and posts the first, retrying on 409, so the suite follows the app's own rule and cannot collide. `owner.spec.ts` keeps `toHaveCount(1)`, which is now a true guarantee of the sign-up path, and a new test proves a taken nickname is refused.
8. **School-safe by construction and by test.** Lists are hand-written friendly words; a test checks every two-part name, with and without its space, against a blocklist, and that all words are letters only.

## Risks / Trade-offs

- [A generated name reads badly or rudely] → closed lists, a blocklist test over the whole two-part space, and three-part names reuse the same words.
- [Longer three-part names are harder to read in the overview] → at most a quarter of names are three-part, and the table cell wraps.
- [Existing duplicates remain] → left alone on purpose; the overview handles them.
- [A student sees "just taken"] → they get fresh options in place, no restart.

## Migration Plan

No schema or data change. Deploy as normal; rollback by revert. Old nicknames stay valid.

## Open Questions

- Should a teacher be able to see that two students share a nickname from before this change? Not needed now.
