# Proposal

## Why

Year 8 students sit a KS3 Spanish speaking test about three times a year, with one week to revise answers they have already written and half-learned in class. Most dislike speaking aloud, revise silently by re-reading, and use homework apps (Blooket, flashcards) that never test listening or speaking, so the practice does not match the test. There is no tool that walks a student from "write an answer I can say" through "understand the question when I hear it" to "answer it without thinking". The author taught at the target school and has a first test user, so a small, real validation loop is possible now.

## What Changes

Build My Spanish Tutor v1 from scratch: a phone-first, installable web app (also usable on old school Chromebooks with a headset) that is a homework tool for one KS3 speaking test at a time.

- A course is one sentence builder plus its five test questions and a simplified mark scheme, authored by the developer (photo import of a student's own sentence builder is a stretch goal).
- A student joins with a class code, with no account, name or email.
- Four gated learning phases per course: write a personalised answer, learn to understand the questions by ear, memorise the written answer by speaking it, then automate question-to-answer recall under time pressure.
- Speaking feedback is deliberately shallow: a transcript-versus-script accuracy percentage, a small table of known English-speaker confusions, and a syllable breakdown for missed words.
- The tutor never speaks English. All tutor lines are Spanish audio with English subtitles, drawn from a cached phrase bank, voiced once with a licensed character voice and carrying a baked feeling track.
- The tutor is one original, mouthless character (Tele, an old television with one large eye) living in a single dreamcore desktop world designed with the first test user. Feelings show in its eye, antennae, picture and world. Play is a reward for practice or happens inside practice, and never replaces it.
- Diagnostics record why an error happened (speed, vocabulary, sound-spelling, context, stress, chunk hotspot) using short probes and simple rules, plus a placement check that lets a student skip what they already know. The mood check-in is removed and parked.
- A revision planner anchors everything to the test date with a countdown and a readiness meter. It does not assign session plans or timings; students get a plain-English nudge that several short sessions work best.
- Every practice screen fits one phone screen, has a way out, and shows only English interface text. Feedback is instant, with sound, animation, varied praise, combos and mistake re-queuing, and the tutor speaks at meaningful moments, not after every answer. Sessions mix task types (match pairs, sentence scramble, fill the gap, tap what you hear, say it). Automatisation is a ladder of one, two, three, then all chunks, with coloured chunks appearing as they are said, hints after a short pause, and a text-free expert mode.
- A course can have one or more sentence builders, four or five questions, and core or extension questions. The teacher flow from plan to class code is specified, run by the developer in version one.
- A demo mode lets anyone try every key feature without joining a class.
- Engagement uses ideas from Times Tables Rock Stars, Blooket, Duolingo, Kahoot and Quizlet: a response-time rank, coins, fixed-price desktop unlocks, stickers, streaks with freezes, and no punitive hearts, random draws or public ranking.
- A cost-routing layer sends every task to the cheapest tool that can do it, logs cost per student, and enforces spend caps.
- A read-only teacher overview built from real student data shows what a department head would see.

Out of scope for v1: student or teacher accounts, payments, native apps, real grades, phoneme-level pronunciation scoring, a full teacher dashboard, memes and reggaeton generation, free-text personal profiles, a virtual-pet wrapper, Blooket-style mini-games (each needs an approved written proposal first; ordinary task types are in scope), a teacher coursework dashboard, a notes tab and doodle pad, a student-drawn tutor, theme switching, and any runtime chat with a language model.

## Capabilities

### New Capabilities
- `course-content`: Sentence builders, test questions, simplified mark scheme, class codes and the course lifecycle, including optional photo import.
- `student-identity-privacy`: Anonymous device profile, class join, two clear sign-up actions, minimal data, no stored audio, delete-everything. Interests are parked.
- `speech-audio-assets`: Cached multi-voice, multi-speed Spanish audio and clip timelines (word times, loudness, feelings) for questions and tutor lines.
- `answer-writing-coach`: Model answers written once at sentence-builder upload, built by filling empty sentence-builder slots with fitting chunks (with an optional starter answer), valued by rules from editable calibration data in the in-app currency, with no named levels, with no model call in the writing stage and no grades shown.
- `question-comprehension`: Listening-to-understand practice with mastery across separate sessions.
- `answer-memorisation`: Recall of the student's own answer from an English prompt, spoken aloud, with accuracy feedback.
- `response-automatisation`: Timed question-to-answer practice with response-time measurement.
- `spoken-answer-feedback`: Speech capture, transcript comparison, confusion hints and syllable help.
- `learning-diagnostics`: Error-cause tagging, probes, chunk hotspots and the placement check. Mood check-in is parked.
- `revision-planner`: Test date, countdown, readiness meter and suggested sessions.
- `tutor-avatar`: Spanish-only mouthless character, stock phrase bank, subtitles, feeling-driven animation and a calm switch.
- `engagement-rewards`: Coins, ranks, desktop unlocks, stickers, streaks, progress shown in the world and the opt-in cheeky content pool.
- `usage-cost-control`: Task routing to the cheapest adequate tool, caching, spend caps and cost reporting.
- `teacher-overview`: Read-only class summary from real data.

- `student-flow-principles`: Never hold a capable student back, always a way out, no dead ends, one screen, English-only interface, little and often.
- `practice-session-feel`: Instant feedback panel, sound, varied praise, combos, mistake re-queue, mixed task types, approval rule for game modes.
- `teacher-course-setup`: Teacher flow from planning a test to a class code, multiple sentence builders, four or five questions, core and extension questions.
- `demo-mode`: A guided, isolated tour of every key feature for visitors and video.

### Modified Capabilities

None. The project has no existing specs.

## Impact

- New Next.js (TypeScript) application deployed on Vercel, with Neon Postgres and object storage for cached audio.
- External services behind swappable interfaces: browser speech recognition with server-side fallback, text-to-speech used offline at content build time (ElevenLabs character voice), and a small language model for drafting and phrase-bank generation.
- The earlier lip-sync prototype is retired for v1 because the character has no mouth. Word times and the loudness envelope it relied on are kept (see design.md).
- Design references live in `docs/design-direction.md`, `docs/design-conflicts.md` and `docs/design/`.
- Budget constraint of about £30 across all paid services (including the character voice and design tooling) for the build and user testing; two-week solo schedule.
- Data protection obligations (UK GDPR, ICO Children's Code) shape the data model from the start.

## Success criteria (for the project evaluation and presentation)

1. Is it more engaging than what exists now (Blooket, flashcards, worksheets)?
2. Would a high-ability student who currently does not revise (Dolores) actually revise with it?
3. Would that student aim higher with it?
4. Is it simple, fast and reliable for a class teacher, and does it make sense to them?
5. Does it save the teacher work rather than create it?
6. Business question: is it cost-effective as a cheap subscription? Likely no for KS3 alone, because a teacher runs about two such tests a year and nobody is held to the results. The case would need Key Stage 4 external speaking-exam preparation, which reuses the same machinery. Recorded as an honest finding, not a goal of version one.

Each criterion needs a way to be answered from user testing or the cost log; see tasks group 25.

