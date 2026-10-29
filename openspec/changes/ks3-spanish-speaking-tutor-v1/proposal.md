# Proposal

## Why

Year 8 students sit a KS3 Spanish speaking test about three times a year, with one week to revise answers they have already written and half-learned in class. Most dislike speaking aloud, revise silently by re-reading, and use homework apps (Blooket, flashcards) that never test listening or speaking, so the practice does not match the test. There is no tool that walks a student from "write an answer I can say" through "understand the question when I hear it" to "answer it without thinking". The author taught at the target school and has a first test user, so a small, real validation loop is possible now.

## What Changes

Build My Spanish Tutor v1 from scratch: a phone-first, installable web app (also usable on old school Chromebooks with a headset) that is a homework tool for one KS3 speaking test at a time.

- A course is one sentence builder plus its five test questions and a simplified mark scheme, authored by the developer (photo import of a student's own sentence builder is a stretch goal).
- A student joins with a class code, with no account, name or email.
- Four learning phases per course: write a personalised answer, learn to understand the questions by ear, memorise the written answer by speaking it, then automate question-to-answer recall under time pressure.
- Speaking feedback is deliberately shallow: a transcript-versus-script accuracy percentage, a small table of known English-speaker confusions, and a syllable breakdown for missed words.
- The tutor never speaks English. All tutor lines are Spanish audio with English subtitles, drawn from a cached per-persona phrase bank, voiced and lip-synced once.
- Diagnostics record why an error happened (speed, vocabulary, sound-spelling, context, stress, chunk hotspot) using short probes and simple rules, plus a one-tap mood check-in.
- A revision planner anchors everything to the test date with a countdown and a readiness meter.
- Engagement uses ideas from Times Tables Rock Stars, Blooket, Duolingo, Kahoot and Quizlet: a response-time rank, coins, collectible avatar items, stickers, streaks with freezes, and no punitive hearts or public ranking.
- A cost-routing layer sends every task to the cheapest tool that can do it, logs cost per student, and enforces spend caps.
- A read-only teacher overview built from real student data shows what a department head would see.

Out of scope for v1: student or teacher accounts, payments, native apps, real grades, phoneme-level pronunciation scoring, a full teacher dashboard, memes and reggaeton generation, and free-text personal profiles.

## Capabilities

### New Capabilities
- `course-content`: Sentence builders, test questions, simplified mark scheme, class codes and the course lifecycle, including optional photo import.
- `student-identity-privacy`: Anonymous device profile, class join, minimal data, interests as fixed tags, no stored audio, delete-everything.
- `speech-audio-assets`: Cached multi-voice, multi-speed Spanish audio and mouth timelines for questions and tutor lines.
- `answer-writing-coach`: Level- and time-aware drafting of answers constrained to the sentence builder, rubric-tiered as survival, good or showing off.
- `question-comprehension`: Listening-to-understand practice with mastery across separate sessions.
- `answer-memorisation`: Recall of the student's own answer from an English prompt, spoken aloud, with accuracy feedback.
- `response-automatisation`: Timed question-to-answer practice with response-time measurement.
- `spoken-answer-feedback`: Speech capture, transcript comparison, confusion hints and syllable help.
- `learning-diagnostics`: Error-cause tagging, probes, chunk hotspots and mood check-ins.
- `revision-planner`: Test date, countdown, readiness meter and suggested sessions.
- `tutor-avatar`: Spanish-only tutor personas, stock phrase banks, subtitles, lip-sync and on-device custom drawings.
- `engagement-rewards`: Coins, ranks, collectibles, stickers, streaks and the opt-in cheeky content pool.
- `usage-cost-control`: Task routing to the cheapest adequate tool, caching, spend caps and cost reporting.
- `teacher-overview`: Read-only class summary from real data.

### Modified Capabilities

None. The project has no existing specs.

## Impact

- New Next.js (TypeScript) application deployed on Vercel, with Neon Postgres and object storage for cached audio.
- External services behind swappable interfaces: browser speech recognition with server-side fallback, text-to-speech used offline at content build time, and a small language model for drafting and persona generation.
- Prototype lip-sync parameters are already validated (see design.md) and carried into the product.
- Budget constraint of about £30 across all paid services for the build and user testing; two-week solo schedule.
- Data protection obligations (UK GDPR, ICO Children's Code) shape the data model from the start.
