# My Spanish Tutor

Phone-first web app (Next.js, TypeScript, Neon Postgres, Vercel) that helps UK Year 8 students (age 12 to 13) revise for a KS3 Spanish speaking test. Read `docs/PRD.md` for what we are building and `docs/ARD.md` for how. Requirements with acceptance scenarios live in `openspec/changes/ks3-spanish-speaking-tutor-v1/`.

## Workflow

- Use the OpenSpec skills for planning and implementation. Implement only when asked to apply a change.
- Work through `tasks.md` in order. The speech and device spike comes first.

## Skills

- **frontend-design** (`.claude/skills/frontend-design`): invoke it before designing or building any student-facing screen, component or visual theme, and before restyling existing UI. Skip it for logic, API, database and build-script work.
  - The design brief for that skill is this file plus the PRD. The product constraints below win over the skill's general defaults.
  - Write the skill's design plan (palette, type, layout) into `docs/design-direction.md` the first time, then reuse it so screens stay consistent.

## Product rules that are not obvious from the code

- The tutor never speaks English. Tutor audio is Spanish; English appears only as subtitles.
- No student accounts and no personal data: no names, emails or audio recordings are stored. Interests are fixed tags, never free text. A student's own drawing stays on their device.
- The practice loop makes no language-model calls. Language models are only for drafting answers, persona phrase banks and optional photo import. Every paid call goes through the cost router.
- Scores come from rules, not a model. A word counts as matched if the recogniser understood it. Never penalise a recognition failure or noise.
- No hearts or lives, no public ranking of students, no real-money payments. Reward effort and improvement, not only correct answers.
- No copyrighted characters. Original personas or the student's own drawing only.
- Tone is cheeky but passable at school, encouraging, and names at most one thing to fix per attempt.

## UI context for design work

- Audience: 12 to 13 year olds who dislike speaking tests and feel self-conscious speaking aloud. Engagement is the main risk.
- Primary device is a phone. The app must also work on an old school Chromebook with a headset. Keep it light and fast.
- Respect reduced motion, keep keyboard focus visible, and support light and dark themes.
- The tutor's mouth animation is a validated design: jaw driven by audio loudness, lip shapes only for closed, rounded and teeth-on-lip sounds, mouth leads audio by 30 ms, mouth speed 32, shapes under 70 ms dropped. Do not change these values without re-testing.

## Prototype-only items

- The edge-tts Spanish voice is for prototyping only and must not ship. Choose a licensed production voice before launch.
