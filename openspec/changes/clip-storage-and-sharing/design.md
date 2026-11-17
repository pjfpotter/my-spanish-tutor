# Design

## Context

See `proposal.md` for why. Observed today: a clip's slot is `sha1(JSON({text, speed})).slice(0,12)` (`lib/audio/manifest.ts`), so sharing across courses already works at the key level. `scripts/build-audio.mjs` plans a course's clips, builds missing or stale ones (ElevenLabs for the base speed, ffmpeg and a stretcher for other speeds, through the cost router), writes `<slot>.mp3` and `<slot>.json` to `public/audio/clips`, prunes files the planned course does not use, and regenerates `lib/audio/built.ts`. The app imports `built.ts` (`BUILT_CLIPS`) into the client bundle and into `lib/course/status.ts` for the publish check, and `/api/clips` returns it whole. About 705 clips, 6.9 MB. A clip's `source` hash covers voice, model, tag and stretch, which marks it stale.

## Goals / Non-Goals

**Goals:** clips shared and stored outside git; the list is data; students learn only what their course needs; adding a course needs no commit; publish checks real data; nothing a student can see or request exposes another teacher's text.

**Non-Goals:** building audio inside a web request (needs ffmpeg and a stretcher; the build stays a script on the developer's machine in v1, with only its destination changed), garbage collection, history rewriting, a per-teacher store, any change to timelines, voice, or animation.

## Decisions

### D1. Vercel Blob (private), served through the app
Store `clips/<slot>.mp3` and `clips/<slot>.json` in a private Vercel Blob store, read by a route handler `/api/clips/<slot>` that streams the object with `Cache-Control: public, max-age=31536000, immutable` and a `v` query that is the first 8 characters of the clip's source hash. The CDN caches the response after the first play, so storage is read about once per clip.
- **Alternative: public Blob URLs handed to the client.** Fewer moving parts and no function in the path, but every clip (and its timeline, which contains the text) is world-readable by URL and the client would hold storage URLs. Private plus the proxy keeps access in one place and lets the route refuse a clip the caller has no need for later.
- **Alternative: the database (bytea).** About 7 MB total, no extra service, but large reads through Postgres and no CDN-friendly path. Rejected.
- **Alternative: keep files in `public/` but gitignored and uploaded at deploy time.** Still ties clips to deploys. Rejected.

### D2. A `clips` table
`clips(slot text primary key, text text not null, speed numeric not null, voice_id text, model text, source_hash text not null, bytes integer, built_at timestamptz)`. It replaces `built.ts`. `findClip(text, speed)` becomes a lookup in an index the server hands to the client (D3), or, on the server, a table read.

### D3. Who is told what
`/api/clips` returns the index for the caller's course: the clips for its questions, key words, chunks and model-answer bits (the same plan `planClips` already computes from the course) plus the shared set (phrase bank, cheeky pool, tutor lines, lab and demo lines). The course comes from the student's profile cookie, as for the rest of the app; a request with no profile gets the shared set only. The client keeps `findClip`/`findBitClip` over the returned index.
- **Alternative: compute slots in the browser** (`crypto.subtle` sha1) and fetch by hash with no index. Fewer calls, but the app would try clips that do not exist, and `findBitClip` relies on a forgiving text match the hash cannot give. Rejected.
- The index for a course is cheap (a few hundred rows) and cacheable per course version.

### D4. Build and publish
`build-audio` gets a storage-backed `ClipStore` (the interface already exists: `read`, `readMp3`, `write`). It reads existing rows from the table to decide what is missing or stale, writes the object and then the row (object first, so a row never points at nothing), and prints built, reused and spent. The prune step is deleted: a shared store must never remove a clip because one course did not plan it. Publish's check reads the table through the same plan.
- The build needs the storage token and `DATABASE_URL`; without them it refuses to run for real and the dry run still estimates. Dry run changes nothing.
- **Failure ordering:** if the object write fails, no row is written; if the row write fails after the object, the next run finds the row missing, rewrites the same bytes and adds the row. Idempotent.

### D5. One-time copy and removal
A script `scripts/migrate-clips.mjs` reads `public/audio/clips`, uploads each pair to storage and inserts each row, skipping slots already present (re-runnable). After it succeeds and production serves from storage (verified on a preview deployment first), a second commit deletes `public/audio/clips`, `lib/audio/built.ts`, `lib/audio/stopgap-clips.json`, `scripts/stopgap-clips.mjs` and rewrites the clips test to a table-based check. Local development and e2e tests use a filesystem store behind the same interface, and the PGlite database, so no network is needed.
- Clip text already in git history stays there; no history rewrite.

### D6. Tests
Replace `built.test.ts`'s "every planned clip is built" and "no unused clips" with: the plan for the committed seed course is fully present in a test table and store; the serve route returns bytes and headers for a known clip and 404s for an unknown one; the index for course A holds nothing only course B uses; a rebuilt clip changes its version in the URL; the build skips existing clips and deletes none; publish is blocked by a missing row. The migration script is tested against a temporary directory and the PGlite database.

## Risks / Trade-offs

- **A new service and secret.** Blob adds a token and a point of failure. Mitigation: the CDN cache, the audio-missing fallback (text and subtitles still work), and the build refusing to proceed without the token.
- **A function in the audio path.** Cold starts on the first play of a clip. Mitigation: immutable caching, and the ladder already preloads clips it will play.
- **Index per course adds a request.** It is one small call, cached per course version.
- **Shared store, shared mistakes.** A bad clip is bad for every course. A rebuild replaces it everywhere; the version in the URL makes that visible to devices.
- **Teacher text still in history.** Documented, not fixed.
- **Ordering with the builders change.** `course-builder-per-question` changes which course content plans clips (per builder); the plan function stays the single source for both changes, so they do not conflict, but both touch `lib/course/status.ts`.
