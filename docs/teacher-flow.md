# Teacher flow (task 23.1)

How a course gets from a teacher's sentence builder to a class of students, step by step, where each step runs, what it costs and what is cached. Checked against the scripts and library code on 13 Nov 2026. Design decisions: D9 (model only at set-up time), D21 (course shape and the teacher flow), owner decision of 9 Nov 2026.

**Version one has no teacher-facing setup page and no teacher accounts.** The developer runs each step with a script on the teacher's behalf. The class code is what students use; the **owner link** is the only credential a teacher holds. A teacher-facing setup page, photo scan and edit screening are stretch (23.4, 23.6) and would call the same server functions.

## The steps

| # | Step | Who and where | Command or code | Paid calls | What is cached or stored |
|---|---|---|---|---|---|
| 1 | **Collect the course.** Sentence builders, four or five questions (core or extension), test date, class title | Teacher gives them to the developer | Written as a `Course` object in `lib/course/seed.ts` and checked by `validateCourse` in `lib/course/schema.ts` | None | The course file in git |
| 2 | **Draft model answers** (optional, or write them by hand) | Developer, once per course | `setUpCourse` in `lib/coach/setup.ts`. One call to a small model through the cost router (service `course-setup`, cap £2 per 30 days, at most 5 calls an hour). Code keeps an answer only if every word is in the chunk bank and the rubric finds a justified opinion. **No script runs it yet:** it is built and unit tested, and the seed course uses hand-written model answers | 1 model call per course, plus one retry for a question left with no kept answer | Kept answers are written into the course file. Nothing is called again unless the file changes |
| 3 | **Seed the database** | Developer | `npm run seed` runs `scripts/seed.mjs`, which calls `seedCourse` in `lib/course/seed-db.ts` | None | Course row, chunks by Spanish text, questions by position. Safe to run again: it updates in place, so student progress is never orphaned |
| 4 | **Receive the owner link** | Developer passes it to the teacher | The first seed prints the owner token once and stores only its hash. If it is lost there is no regenerate yet (23.4) | None | Hash of the token |
| 5 | **Build the audio** | Developer | `npm run build-audio` (dry run, lists missing clips and the cost), then `npm run build-audio -- --yes` | Text-to-speech through the cost router (service `elevenlabs-tts`, cap £3 per 30 days). About £0.65 for a full build in the current voice | Clips in `public/audio/clips`, one per text and speed, with a source hash. A rerun with nothing changed pays nothing. Students never trigger a build |
| 6 | **Share the class code** | Teacher | The teacher gives students the class code | None | Nothing |
| 7 | **Students join and practise** | Students | `/welcome`, then the four phases | Only speech recognition when a device cannot recognise speech in the browser (`/api/transcribe`, cost router, capped) | Numbers only. No audio, no names, no free text |
| 8 | **Watch the class** | Teacher | The owner link opens `/owner/[token]`: counts by step, hotspots by question and chunk, common causes, nicknames and cost per student | None | Read from the stored attempts and the cost log |
| 9 | **Report cost** | Developer or teacher | `npm run cost-report -- <class code>` prints the same figure as the overview, straight from the cost log | None | Read only |

## Local or server

Steps 1 to 5 run on the developer's machine against the production database (`DATABASE_URL` in `.env`). That keeps API keys off the server and keeps paid calls out of any route a student can reach. Everything a student triggers runs on the server (see `docs/api-map.md`). A teacher-facing page would have to move steps 2, 3 and 5 onto the server behind the owner token, with the same cost router in front, which is why it is held for the owner to decide (23.4).

## Moving a course along (task 23.3)

`npm run course -- status|review|publish|share <class code>`. A course is **draft**, **set up** (every core question has model answers), **reviewed** (someone signed it off), **published** (ready for students) or **shared** (the class code has been handed out). Status is worked out from the course itself: a sign-off stores a fingerprint of the text it was given for, so editing a question or answer lapses review and publish by themselves. Publishing blocks and names every missing item. Publishing a course whose text has not changed does nothing and calls nothing; after an edit, only the paid step whose output is missing runs again. The overview shows the status.

## Pricing and limits (task 23.7)

- `npm run price-course -- <class code or course file>` prices a course before loading it: clips are stored by text and speed, so phrases shared with a course already built cost nothing and only new clips are priced.
- The audio build records its spend against a course (`npm run build-audio -- --yes --course=CODE`), so `npm run cost-report` and the overview show a course's own cost.
- A teacher can load **3 new courses per 30 days**. This number is a placeholder: the owner chooses it in `lib/course/limits.ts`. The refusal says why and when they can load another. There are no teacher accounts, so a teacher is a label the developer gives a course; a course with no label is not limited.

## What is not built

- A script for step 2 (the function and its tests exist).
- Regenerating a lost owner link, and a teacher-facing page (23.4, on hold).
- Wiring `publish` to the real set-up call and audio build. It reports what is missing and which command to run.
- Photo scan and edit screening: task 23.6. Coursework dashboard: parked (23.5).
