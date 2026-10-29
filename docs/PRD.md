# Product Requirements Document: My Spanish Tutor

| | |
|---|---|
| **Version** | 1.0 (bootcamp submission) |
| **Date** | 29 October 2026 |
| **Author** | [your name] |
| **Status** | Approved for build; lip-sync prototype validated |
| **Related** | `docs/ARD.md`, `openspec/changes/ks3-spanish-speaking-tutor-v1/` |

---

## 1. Summary

My Spanish Tutor is a phone-first web app that helps Year 8 students (age 12 to 13) revise for their KS3 Spanish speaking test. It walks a student through four steps: write an answer they can realistically say, learn to understand the test questions by ear, memorise their own answer by speaking it, and finally answer questions automatically under time pressure. A Spanish-only animated tutor, quick low-stakes feedback and game-style rewards make a task most students dislike feel manageable.

It is built as a homework tool, not a classroom tool, and is designed so that one department head can adopt it for a whole year group.

## 2. Problem

### 2.1 The situation

A typical UK comprehensive teaches Spanish with a chunking approach: the GCSE specification is broken into "sentence builders" taught over two weeks and four lessons. About three times a year, students take a speaking test: five questions, four from the current topic and one recycled from earlier. Students write their answers in advance, mostly from the sentence builder, and have about a week to revise. The teaching assumption is that much of this is already half-learned in class, and that common chunks (for example *porque es divertido*) recur across all five years.

To succeed, a student must do all of the following under pressure:

1. Write an answer they can memorise and that earns a good mark.
2. Recognise and understand the question when they *hear* it.
3. Recall their scripted answer.
4. Say it clearly enough to be understood.
5. Manage stress, blanking and asking for repetition.
6. Plan their own revision time.

### 2.2 What goes wrong

- Most students dislike speaking tests, and self-conscious teenagers feel awkward speaking aloud when revising.
- Most revise silently in their heads, or re-read the list. Memorisation skills are generally weak.
- Common homework games (for example Blooket) test reading, not listening or speaking, so they are false practice for a speaking test.
- Students have little sense of the deadline and rarely plan sessions.
- Self-expression in the sentence builder is limited, which is a further turn-off for this age group.
- Anxiety is often the biggest barrier to success in languages.

### 2.3 Why now

The author is a former teacher at the target school with five years of experience of these tests, has a Year 8 child who is the first test user, and has a working lip-sync prototype for the tutor character. Real validation with real students is available within days.

## 3. Users and customers

### 3.1 Primary user: the Year 8 student

Age 12 to 13, typically on a smartphone, revising at home, with low engagement in Spanish and low confidence speaking aloud. Needs: quick wins, privacy while practising, and feeling progress.

### 3.2 Buyer: the class teacher or head of department (HoD)

Judged on end-of-Year-11 results, so embedding good habits at KS3 pays off at KS4. Needs: evidence that students practise the right skill (listening and speaking), minimal set-up, and no extra marking. Schools are cautious about smartphones in lessons, which is why the product is designed for homework.

### 3.3 Not a user: parents as purchasers

The author judged that students will not download this unprompted nor ask parents to pay. Parents are a secondary audience for the privacy notice only.

### 3.4 Device context

Phones are the primary device because nearly every household has one. Old school Chromebooks with cheap headsets, or the built-in microphone in a noisy room, must also work, but this is secondary because the product is not a classwork tool.

## 4. Goals and success measures

| Goal | Measure | Target for v1 |
|---|---|---|
| Students want to use it | Test users choose to open the app on days without a prompt | At least half of test students return on 3 or more separate days |
| Students feel progress | Readiness meter and response-time trend visible; self-report "I feel more ready" | Majority of test students agree |
| Practice matches the test | Share of practice time spent hearing and speaking Spanish | Over 80% of session time |
| Speaking gets faster | Median response time from question end to speech start | Falls across sessions for most students |
| Cost is viable at scale | Measured cost per student per test cycle, from real usage logs | Reported with a breakdown; no language-model calls in practice loops |
| Privacy by design | Personal identifiers and audio recordings stored | None |
| Impresses the bootcamp audience | Demo shows education, creativity and technical skill together | Clear demo of four phases, tutor lip-sync and the cost figure |

## 5. Scope

### 5.1 In scope for v1

A single vertical slice for one course at a time: a sentence builder, five test questions and a simplified mark scheme, authored by the developer, with students joining by class code. Four learning phases, shallow speech feedback, a Spanish-only animated tutor, diagnostics, a test-date planner, rewards, cost controls and a read-only teacher overview.

### 5.2 Out of scope for v1

Student and teacher accounts; payments; native apps; numeric grades; phoneme-level pronunciation scoring; a full teacher dashboard; open-ended chat with a language model; live content from third-party worksheets; free-text personal profiles; meme and reggaeton remixes (stretch only).

### 5.3 Stretch goals (cut first)

Photo import of a student's own sentence builder; meme and reggaeton-style remix of a confirmed answer; student-drawn tutor characters beyond the basic overlay.

## 6. User journey

1. **Join.** Student enters a class code, reads a short privacy notice, picks a nickname and a few interest tags, and receives a recovery code.
2. **Starting point.** A quick mood check-in ("Spanish is not my favourite" is an allowed answer) and a short test-teach-test baseline on the five questions.
3. **Plan.** The app shows days to the test, a readiness meter, and a short daily plan based on the minutes the student has.
4. **Write.** The tutor coaches the student to draft an answer to each question using only sentence-builder chunks, pitched at their ability and time, with light personal touches, and encourages aiming one level higher. The student confirms each answer.
5. **Understand.** The student hears each question in varied voices and speeds and chooses its meaning. A question is mastered only after repeated success across separate sessions.
6. **Memorise.** The student sees the English meaning, says their answer aloud, and gets a quick percentage with highlighted words.
7. **Automate.** The student hears a question with no text and answers within a shrinking time window. Speed is measured and rewarded. They are marked test-ready when accuracy and speed hold across sessions.
8. **Celebrate.** Coins, ranks, stickers and collectibles reward effort and improvement throughout.

## 7. Functional requirements

Priorities use MoSCoW (Must, Should, Could). Each requirement maps to a capability in the OpenSpec change, where acceptance scenarios are written out.

### 7.1 Course content (`course-content`)

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | A course has one sentence builder (chunks with English gloss, category and feature tags), exactly five questions with English subtitles, a test date and a mark scheme | Must |
| FR-2 | The mark scheme has three levels, survival, good and showing off, defined by countable features; no numeric grade is shown | Must |
| FR-3 | Students join with a class code only | Must |
| FR-4 | Recycled chunks are tagged and offered first when suggesting upgrades | Should |
| FR-5 | A photo of a sentence builder can be turned into an editable draft of chunks | Could |

### 7.2 Identity and privacy (`student-identity-privacy`)

| ID | Requirement | Priority |
|---|---|---|
| FR-6 | Anonymous profile; no real name, email, phone or school ID is requested or stored | Must |
| FR-7 | Recovery code restores progress on another device | Should |
| FR-8 | Interests are chosen from a fixed tag list; no free-text interests | Must |
| FR-9 | Student recordings are processed and discarded, never stored | Must |
| FR-10 | One-action delete-everything | Must |
| FR-11 | Plain-language privacy notice before joining | Must |
| FR-12 | Custom tutor drawings stay on the device | Should |

### 7.3 Writing phase (`answer-writing-coach`)

| ID | Requirement | Priority |
|---|---|---|
| FR-13 | The coach asks confidence and available minutes, then targets answer level and length | Must |
| FR-14 | Drafts use only sentence-builder chunks plus a small allowed word list | Must |
| FR-15 | The level of a draft is computed by rules from tagged features and the features are shown | Must |
| FR-16 | One concrete upgrade is suggested at a time (justification, second tense, idiom) | Should |
| FR-17 | Light personalisation from interest tags within course vocabulary | Should |
| FR-18 | The student confirms each answer before memorisation begins | Must |
| FR-19 | Ready-made model answers when drafting is unavailable | Must |

### 7.4 Listening, memorising, automating (`question-comprehension`, `answer-memorisation`, `response-automatisation`)

| ID | Requirement | Priority |
|---|---|---|
| FR-20 | Hear a question and choose its meaning; text hidden by default | Must |
| FR-21 | Mastery needs repeated success across at least two separate sessions (default 3 correct) | Must |
| FR-22 | Voices rotate and speed rises with success; replay, slow and reveal are allowed but assisted attempts do not count | Must |
| FR-23 | Memorisation shows English prompts, the student speaks, and gets an accuracy percentage quickly | Must |
| FR-24 | Prompt support fades as accuracy rises; stuck sentences can be isolated | Should |
| FR-25 | Automatisation plays a question with no text and measures time from question end to speech start | Must |
| FR-26 | The response window adapts; blanks get a first-words hint and are not counted as wrong | Should |
| FR-27 | Saying a Spanish phrase to ask for repetition replays the question and is rewarded | Should |
| FR-28 | A student is marked test-ready when accuracy and speed hold across separate sessions | Must |

### 7.5 Feedback and diagnostics (`spoken-answer-feedback`, `learning-diagnostics`)

| ID | Requirement | Priority |
|---|---|---|
| FR-29 | Speech capture on current phone browsers and Chromebooks, with clear permission handling | Must |
| FR-30 | A word counts as matched if the recogniser understood it; accent differences do not reduce the score | Must |
| FR-31 | A table of known English-speaker confusions (for example *me*/*mi*, final *o*, silent *h*, *j*, *ll*, *v*/*b*) produces one-line tips | Should |
| FR-32 | Missed words are broken into syllables with slow audio | Should |
| FR-33 | Low recognition confidence or noise does not penalise the attempt | Must |
| FR-34 | Every attempt is stored as an event with outcome, timing and cause tags | Must |
| FR-35 | Comprehension probes distinguish too fast, word not known, sound-spelling gap, and thrown by context | Should |
| FR-36 | Recall failures are tagged as not known well enough, stress-related, or a chunk hotspot | Should |
| FR-37 | One-tap mood check-in shapes tone and difficulty | Should |

### 7.6 Planning, tutor, rewards (`revision-planner`, `tutor-avatar`, `engagement-rewards`)

| ID | Requirement | Priority |
|---|---|---|
| FR-38 | Home screen shows days to the test, the current phase and a readiness meter that names its next action | Must |
| FR-39 | Personal session plan redistributes when sessions are missed; late starters get a shortened plan | Should |
| FR-40 | Opt-in daily reminder only | Could |
| FR-41 | The tutor speaks only Spanish; English appears only as subtitles | Must |
| FR-42 | Tutor lines come from a stored phrase bank generated once per persona | Must |
| FR-43 | The tutor's mouth tracks the voice convincingly at any playback speed | Must |
| FR-44 | Three original personas flavoured by interest tags; no copyrighted characters | Should |
| FR-45 | A student can use their own drawing as the tutor, stored on their device | Could |
| FR-46 | Coins for effort and improvement, not only for correct answers | Must |
| FR-47 | A response-time rank that rises as average speed improves | Should |
| FR-48 | Collectibles, stickers and streak freezes using in-app coins only | Should |
| FR-49 | No lives or hearts, no public ranking of students | Must |
| FR-50 | Hand-curated cheeky phrase pool that the course owner can switch off | Could |

### 7.7 Operations (`usage-cost-control`, `teacher-overview`, `speech-audio-assets`)

| ID | Requirement | Priority |
|---|---|---|
| FR-51 | Question audio is pre-generated in two or more voices at three speeds and reused | Must |
| FR-52 | Each task uses the cheapest adequate tool; practice loops never call a language model | Must |
| FR-53 | Hard spend caps, per-profile rate limits and graceful fallback | Must |
| FR-54 | Cost per student per test cycle is reported by tier | Must |
| FR-55 | A read-only class overview behind an unguessable owner link shows phase counts, readiness and hotspots | Should |
| FR-56 | The overview can show clearly labelled sample data | Should |

## 8. Non-functional requirements

| Area | Requirement |
|---|---|
| **Privacy and safeguarding** | Complies with UK GDPR and the ICO Age Appropriate Design Code in spirit: data minimisation, high-privacy defaults, no profiling for advertising, no real-money transactions, no stored audio. A data-protection impact assessment and a student-readable privacy notice are deliverables. |
| **Cost** | Live practice loops use cached assets, rules and browser speech recognition only. All paid calls are metered and capped. About £30 total build budget. |
| **Performance** | Accuracy percentage returned within about two seconds of the end of speech on a mid-range phone. Audio and mouth animation stay in sync (mouth leads audio by about 30 ms). |
| **Compatibility** | Current Android Chrome and iOS Safari; Chromebook Chrome; works with a headset or built-in microphone. |
| **Accessibility** | Subtitles for all tutor speech; reduced-motion respected; readable contrast in light and dark themes; touch targets suitable for phones. |
| **Reliability** | Every external dependency has a fallback: missing audio shows text, drafting failure shows model answers, recognition failure allows retry without penalty. |
| **Tone** | Cheeky but passable at school; encouraging; names at most one thing to fix per attempt. |

## 9. Business model

This is a feature of a wider language-learning product, not a standalone company, so the model describes how it would be sold.

- **Customer:** the school or department, not the student. A head of department can adopt it for a year group in one step by sharing one class code.
- **Hypothesis:** an annual per-school licence, with a free pilot term in which the cost-per-student report and teacher overview provide evidence of use.
- **Why it can be sold:** it targets practice that existing classroom games do not (listening and speaking), it is designed to be habit-forming, and per-student marginal cost is near zero because audio is generated once and shared.
- **Unit economics:** to be evidenced by the measured cost per student per test cycle from user testing. Prices will be set after that measurement, not before.
- **Extension:** more courses (topics and years) are content, not engineering, because each course is a sentence builder plus five questions plus a mark scheme.

## 10. Competitive landscape

| Product | What it does well | Gap for this use case |
|---|---|---|
| Blooket, Kahoot, Quizlet | Game modes, collectible rewards, class energy | Mostly reading and tapping; little listening or speaking practice for a scripted speaking test |
| Duolingo | Streaks, short sessions, mascot, an animated video-call character in a paid tier | General language learning, not tied to a school's sentence builders or a test date |
| Times Tables Rock Stars | Speed-based status, coins for avatar upgrades, teacher-set focus | Maths only; its model of rewarding response speed is borrowed here |
| Memrise | Native speaker clips and learner mnemonics | Not tied to a school test |
| Speak and similar | Spoken conversation practice with an AI tutor | Open-ended and costly per student; not scripted around a specific test |

The unmet need is a scripted, test-specific, listening-and-speaking trainer aimed at under-14s with very low per-student cost.

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Browser speech recognition is unreliable for teen learners or in noisy rooms | Early device spike; fallback recogniser; no penalty for recognition failure |
| Scoring feels unfair and students lose trust | Score words as matched when understood; show uncertainty honestly |
| Scope too large for two weeks | Build the vertical slice first; stretch items are isolated and can be cut |
| Language model produces Spanish outside the sentence builder | Validate every word against the allowed set; fall back to model answers |
| Student data concerns | No accounts, no audio storage, fixed tags, delete-everything |
| Students do not return without coercion | Mood check-in, quick wins, rewards for effort, tutor with personality; test with real students |
| Unofficial prototype voice cannot ship | Production voice chosen by listening test before launch |

## 12. Validation plan

1. Device matrix for speech capture on Android, iPhone and Chromebook (days 1 and 2).
2. A scripted end-to-end run of all four phases on the seeded course.
3. User testing with the author's Year 8 child and up to five classmates, with parental consent: do they return unprompted, do the scores feel fair, does the tutor lip-sync look right, do they feel progress?
4. Cost per student measured from the real usage log.

## 13. Timeline (two weeks, solo)

| Days | Focus |
|---|---|
| 1 to 2 | Setup; speech and device spike; seed course; identity and class join |
| 3 to 4 | Audio pipeline; lip-sync port; speech feedback |
| 5 to 6 | Question comprehension phase |
| 7 to 8 | Answer writing coach |
| 9 to 10 | Memorisation and automatisation |
| 11 | Diagnostics, mood check-in, planner |
| 12 | Tutor personas, rewards, cost report, teacher overview |
| 13 | User testing and fixes |
| 14 | Demo preparation |

## 14. Open questions

- Which production voices to use (to be decided by a listening test).
- Which fallback speech recogniser to use (to be decided by the device spike).
- Rank thresholds for response time (to be tuned from test data).
- Whether the department will allow the cheeky phrase pool to be enabled.

## Appendix A. Evidence from the prototype

A lip-sync prototype compared three models of mouth movement on one Spanish clip. The "jaw by sound, lips by shape" model, with the mouth leading the audio by 30 ms, mouth speed 32 and shapes shorter than 70 ms dropped, was judged to track the voice correctly. An earlier attempt with one mouth shape per phoneme had failed because transitions between mouth shapes are not regular in time.
