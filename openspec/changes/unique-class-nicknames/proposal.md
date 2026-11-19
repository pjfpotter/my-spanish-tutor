# Proposal

## Why

Nicknames come from a fixed list of 12 adjectives and 12 nouns: only 144 names. A class of 30 has a 96% chance of at least one pair with the same nickname, and the teacher overview cannot tell those two students apart. The overview's table rows are also keyed by nickname, so duplicates give duplicate React keys. The same collision made `tests/owner.spec.ts` fail in a full end-to-end run: with about 60 to 85 students in one throwaway course, the test student's nickname matched another's roughly 35 to 50 percent of the time.

## What Changes

- **Procedurally generated nicknames from a much bigger closed vocabulary.** 40 adjectives and 40 nouns, in two-part ("Sleepy Llama") or three-part ("Sleepy Cosmic Llama") names: about 64,000 names instead of 144. Still picked from a list, never typed.
- **Unique within a class.** The options offered to a joining student exclude nicknames already in that class, and sign-up refuses a nickname that was taken in the meantime, offering fresh options.
- **Options come after the class code.** They are offered when the class is found, not when the page loads, because only then is the class known.
- **The teacher overview can show duplicates safely.** Existing classes already contain duplicate nicknames, so rows are keyed by position as well.
- **The end-to-end sign-up helper takes the server's options.** And the owner overview test now asserts a guarantee the app really gives.
- **Out of scope:** renaming existing students, a database uniqueness constraint (existing classes already hold duplicates and it would fail to apply), letting students type a nickname, any change to what the teacher overview shows.

## Capabilities

### New Capabilities
- `class-nicknames`: how nicknames are generated, offered and kept unique within a class, and what a student can and cannot pick.

### Modified Capabilities
<!-- None in openspec/specs/. -->

## Impact

- **Code:** `lib/profile/profile.ts` (generator, shape check, taken names), `app/api/join/route.ts` (returns options), `app/api/profile/route.ts` (refuses a taken name), `app/welcome/page.tsx` and `WelcomeForm.tsx` (options after the code), `app/owner/[token]/OverviewView.tsx` (row keys), `tests/helpers.ts`, `tests/owner.spec.ts`, `tests/identity.spec.ts`.
- **Data and privacy:** no schema change and no new data. Nicknames are still made up from a closed list; the DPIA wording ("picked from a generated list") stays true, and a line is added that they are unique within a class.
- **Existing data:** old nicknames ("Sleepy Llama") remain valid, and existing duplicates are left alone.
