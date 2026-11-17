## 1. Storage and table

- [ ] 1.1 Connect a Vercel Blob store (private) to the project and add its token as an environment variable for production, preview and local development; document it in `docs/technical-documentation.md`. Owner action for the token; never print or commit it.
- [ ] 1.2 Add migration 0022: table `clips` (design D2) and test it on the dev database.
- [ ] 1.3 A `ClipStore` backed by Blob and the table, and a filesystem-and-PGlite one for local development and tests, behind the existing interface in `lib/audio/build.ts`. Tests for both: write order (object then row), idempotent re-run, read of a missing clip.

## 2. Serving and index

- [ ] 2.1 New route `/api/clips/[slot]`: stream the object, immutable cache headers, version query, 404 for an unknown slot. Tests.
- [ ] 2.2 `/api/clips` returns the index for the caller's course plus the shared set, from the table (design D3). A test that course A's index holds nothing only course B uses.
- [ ] 2.3 Rework `lib/tele/clips.ts` and its callers (`Desktop.tsx`, `MemoriseLadder.tsx`, `useDemoLine.ts`, `app/lab/tele`) to read the index from the server and build URLs with the version. Keep the audio-missing fallback and add a test that a failed fetch shows the subtitle and makes no speech call.

## 3. Build and publish

- [ ] 3.1 `scripts/build-audio.mjs`: use the storage-backed store, decide missing or stale from the table, report built, reused and spent, remove the prune step and the `built.ts` writer, and refuse a real run without the token and database.
- [ ] 3.2 `lib/course/status.ts`: the publish check reads the table instead of `built.ts`. Update `status.test.ts`.
- [ ] 3.3 `scripts/price-course.mjs`: count a clip as reused when it is in the table.

## 4. Move the existing clips

- [ ] 4.1 `scripts/migrate-clips.mjs` (design D5), re-runnable, tested on a temporary directory.
- [ ] 4.2 Run it against a preview deployment's Blob store and database; check one course of each kind plays its audio. Then run it for production.
- [ ] 4.3 Remove `public/audio/clips`, `lib/audio/built.ts`, `lib/audio/stopgap-clips.json` and `scripts/stopgap-clips.mjs`, and replace `built.test.ts` with the table-based checks (design D6).

## 5. Verify and document

- [ ] 5.1 Unit suite, `tsc`, and the e2e specs that play audio pass in a clean checkout with no local data.
- [ ] 5.2 Production check by hand: join a course, play a question and a chunk, confirm no `/audio/clips` files are requested and clips are served with the cache headers.
- [ ] 5.3 Update `docs/technical-documentation.md` (where clips live, how to build, how to move) and the audio capability notes; add this change to `ks3-spanish-speaking-tutor-v1/tasks.md` and mark the stopgap in task 29.9 as replaced.
