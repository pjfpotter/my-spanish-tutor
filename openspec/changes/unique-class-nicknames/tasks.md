# Tasks

## 1. The generator (pure logic)

- [x] 1.1 In `lib/profile/profile.ts` replace the 12 by 12 lists with 40 adjectives and 40 nouns (the old 24 words kept), add `generateNickname(random)` for two- and three-part names, `isNicknameShape` accepting one or two distinct listed adjectives then a listed noun, and `nicknameOptions(count, random, taken)` that skips taken names and returns distinct ones. Verify with unit tests: shapes, old names still accepted, free text and wrong order refused, no duplicates in one set of options, taken names never offered even when most of the two-part space is taken.
- [x] 1.2 Add a school-safety and size test: at least 1,500 two-part and 50,000 three-part possible names, every word letters only, and no two-part name (with or without its space) contains a blocklisted run of letters. Verify the test passes and fails if a blocked word is added to a list.

## 2. Server and sign-up

- [x] 2.1 Add `takenNicknames(db, courseId)` and have `/api/join` return six untaken `nicknames` with the course. Verify with a test against the in-process database that a class with students never gets one of their nicknames offered, and that a bad code still gets 404 and no options.
- [x] 2.2 Make `/api/profile` refuse a nickname already in the class with status 409 and a message, and return fresh `nicknames`; a name used in another class is accepted. Verify with a route test: create, then the same nickname again in the same class gives 409 with options, and in another class gives 200.
- [x] 2.3 Update `app/welcome/page.tsx` to stop generating options and `WelcomeForm.tsx` to use the options from the join step and to swap in fresh ones on a 409. Verify with `tests/identity.spec.ts` (six radios after the class is found) and the journey spec still passing.

## 3. The overview

- [x] 3.1 Key the overview's student rows by position and nickname. Verify with an overview test that two students with the same nickname both appear and both rows render, and that every row's key is different (the server renderer does not warn about repeated keys, only the browser does, so the key helper is what is tested).

## 4. The end-to-end suite

- [x] 4.1 Change the `signUp` helper in `tests/helpers.ts` to take the first option from `/api/join` and retry on 409, and add an e2e that a second sign-up with a taken nickname is refused. Verify `tests/owner.spec.ts` still asserts exactly one row for the signed-up student and passes, and passes in the full run.
- [x] 4.2 Add a line to `docs/dpia.md` that nicknames are unique within a class and made from a closed list, and tick this change in `ks3-spanish-speaking-tutor-v1/tasks.md`. Verify by reading the diff.

## 5. Check

- [ ] 5.1 Run `npm run typecheck`, `npm test` and the sign-up and owner e2e specs (`identity`, `journey`, `owner`). Verify all green. The full e2e run is left for before release.
