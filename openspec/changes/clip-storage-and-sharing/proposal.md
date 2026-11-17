## Why

Built audio clips live in git: the audio and timelines in `public/audio/clips`, and the list of which clips exist in `lib/audio/built.ts`. That worked for one developer and a few courses. It does not work for a product with many teachers: every new course means a commit of audio files and a redeploy to serve them; a fresh clone cannot tell which clips a private course needs (the "no unused clips" test fails for the testing course); the built list holds every teacher's chunk text in a public repository; and `/api/clips` sends that whole list to every student. Clips are already shared by content, because a clip's slot is a hash of its text and speed, so "me gusta" is built once for every course. The stopgap (committed clips plus `lib/audio/stopgap-clips.json`) gets the testing course live for its deadline and is replaced by this change.

## What Changes

- Clip audio and timelines move from `public/audio` into private object storage (Vercel Blob), keyed by the clip's slot (the same content hash as today), shared by every course and teacher.
- The list of built clips moves from `lib/audio/built.ts` into a database table (`clips`: slot, text, speed, voice and model, source hash, size, built at), with nothing about any course or student. `built.ts`, `public/audio/clips`, `stopgap-clips.json` and `scripts/stopgap-clips.mjs` are removed.
- Clips are served by the app (`/api/clips/<slot>`) from storage with long-lived cache headers and a version in the URL, so the CDN holds them after the first play and a rebuilt clip is not served stale.
- A student's device is told only the clips its own course needs, plus the app's shared tutor lines. `/api/clips` stops returning every clip of every teacher. **BREAKING** for the clip index format.
- The audio build writes to storage and the table instead of to disk and to `built.ts`. It builds only clips missing from the table (or stale for the current voice and model), reports how many were reused from other courses, and never deletes a clip another course may use (the current prune step goes).
- Publishing a course checks the table, not a committed list: a course cannot publish while a clip it needs is missing. No commit or redeploy is needed to add a course.
- The existing 705 clips are copied into storage and the table once, then deleted from the repository.
- `docs/technical-documentation.md` and the audio spec describe the new flow.

## Capabilities

### New Capabilities
- `clip-storage`: where built clips live, how they are keyed, shared and served, how the list of built clips is kept and read, who is told which clips, how a missing or stale clip is handled, and what the build and publish steps do with them.

### Modified Capabilities
- `speech-audio-assets`: "Audio reuse" and "Fallback when audio is missing" now refer to the shared store and table rather than committed files. Defined in the unarchived change `ks3-spanish-speaking-tutor-v1`, so the delta is stated here as new requirements under the new capability name, as earlier changes did.
- `teacher-course-setup`: "Draft, review and publish" blocks publishing on the table's list of built clips. Same treatment.

## Impact

- **Code:** `lib/audio/build.ts` and `manifest.ts` (a storage-backed `ClipStore`), `lib/tele/clips.ts` (index from the server, not an import), `app/api/clips/route.ts` and a new `app/api/clips/[slot]` route, every client that calls `findClip`, `findBitClip` or `clipUrls` (`Desktop.tsx`, `MemoriseLadder.tsx`, `useDemoLine.ts`, `app/lab/tele`), `lib/course/status.ts` (publish check), `lib/audio/built.test.ts` (replaced by a table-based check), `scripts/build-audio.mjs`, `scripts/price-course.mjs`.
- **Database:** one new table `clips`. No student data.
- **Infrastructure:** a Vercel Blob store connected to the project, with its token as an environment variable (a secret; never printed or committed).
- **Cost:** storage for about 700 small clips (about 7 MB) is negligible. Speech cost falls as courses overlap, and the build report shows reuse.
- **Privacy:** teacher chunk text leaves the repository going forward. Clip text already committed stays in git history; this change does not rewrite history, and says so in the docs.
- **Out of scope:** running the audio build inside a teacher-facing publish step (version one keeps the build on the developer's machine because it needs ffmpeg and a stretcher; only its destination changes), garbage-collecting unused clips, changing the voice, the mouth animation or the clip timeline format, and a separate store per teacher.
