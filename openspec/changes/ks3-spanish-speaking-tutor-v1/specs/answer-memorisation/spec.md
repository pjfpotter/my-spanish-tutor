# Spec Delta

## Purpose

Takes each student from a confirmed answer they cannot fully translate to saying it aloud, with nothing on screen, on hearing the test question in Spanish. Memory is built through short lessons of spoken attempts in which the help on screen fades as the student succeeds and returns when they slip.

## ADDED Requirements

### Requirement: Prompted recall
The student SHALL say their Spanish answer aloud in response to a prompt. The final prompt SHALL be the test question spoken in Spanish with nothing else on screen. The English meaning SHALL be an earlier level of help, not the finish.

#### Scenario: Attempt
- **WHEN** a student says their answer to a prompt
- **THEN** the app shows which bits were said within two seconds of the end of speech

#### Scenario: The question is the cue
- **WHEN** a student is asked for a whole answer at any level of help
- **THEN** the tutor asks the test question in Spanish first

### Requirement: Scaffold fading
Help SHALL come in five levels, most first: listen and repeat (words, English and the tutor's voice), first letters, empty blocks, English only, and just the question. Help SHALL reduce as the student succeeds and SHALL return when they slip. The level SHALL NOT be shown to the student as a meter or a number; they see the words go.

#### Scenario: Support reduces
- **WHEN** a student says three screens cleanly at the first attempt in a row
- **THEN** the remaining spoken screens of the lesson give one level less help, and a single bit that a longer remaining screen covers is skipped

#### Scenario: Support returns
- **WHEN** a student slips twice on the same screen
- **THEN** the remaining screens of the lesson give one level more help and the lesson is offered again later, with nothing described as failed

### Requirement: Chunk-level practice
Practice SHALL be able to focus on a single chunk or sentence from an answer when the student keeps missing it.

#### Scenario: Stuck sentence
- **WHEN** a student misses the same sentence repeatedly
- **THEN** the app isolates that sentence for short repeated attempts before returning to the full answer

#### Scenario: One bit slips
- **WHEN** a student misses a bit on a screen for the first time
- **THEN** the next screens ask for that bit alone with more help, then with its neighbour, then the same screen again, and these added screens do not lengthen the progress bar

### Requirement: Memorisation mastery
An answer SHALL count as memorised only after reaching the accuracy threshold at least three times across at least two separate sessions, with thresholds configurable.

#### Scenario: Not yet memorised
- **WHEN** a student reaches the threshold on three attempts in one session
- **THEN** the answer stays in progress until a later session confirms it

### Requirement: Encouraging feedback
Feedback SHALL focus on what the student got right, name at most one thing to fix per attempt, and never describe the student as failing.

#### Scenario: Low score
- **WHEN** an attempt scores low
- **THEN** the tutor highlights the strongest part and names a single next step

### Requirement: Scaffolding beyond fading words
Support SHALL come from several kinds, not only from words fading out: the English meaning, chunk-by-chunk reveal, the first word of each chunk, a gapped script, and listening to the answer then repeating it. The kind of support SHALL be chosen from the student's recent results and cause tags, and the support SHALL step down one kind at a time.

#### Scenario: No pictures
- **WHEN** support is chosen for any chunk
- **THEN** it never includes a picture or icon, because sentence builders are deliberately text-only and no pictures can be sourced when a course is created

### Requirement: Chunked memorising
Answers SHALL be learned in chunks: each chunk is practised alone, then in pairs, then as the full answer, with chunk colours matching those used in automatisation and writing.

#### Scenario: Building up
- **WHEN** a student has mastered the first two chunks
- **THEN** the next task combines them before adding the third

### Requirement: Mixed task types in memorising
A memorise session SHALL mix task types from the practice-session-feel list (match pairs, sentence scramble, fill the gap, tap what you hear, say it aloud) with rising cognitive load, ending with spoken recall. The spoken task SHALL remain required for mastery.

#### Scenario: Session mix
- **WHEN** a memorise session runs
- **THEN** it uses at least three task types and includes at least one spoken recall

### Requirement: Skipping known answers
A student SHALL be able to try an answer's final spoken recall first and, if they reach the accuracy threshold without help, move that answer forward without completing the earlier tasks. Mastery rules still apply.

#### Scenario: Already knows it
- **WHEN** a student recalls an answer accurately without support on first try
- **THEN** the earlier tasks for that answer are skipped

### Requirement: One screen
A memorise task SHALL fit one screen with no scrolling (see student-flow-principles).

#### Scenario: Phone viewport
- **WHEN** a memorise task is shown on a small phone
- **THEN** all of it is visible without scrolling

### Requirement: Lessons with a visible end
Memorising SHALL be done in short lessons with a progress bar, not an open practice loop. Each answer SHALL have, in order: listen and repeat; first letters (one lesson per sentence of a long answer, building bit on bit: 1, 2, 1 and 2, 3, 1 to 3); from memory (the whole answer, fading to the question alone, said twice with a tap task between); and a next-day check. The app SHALL choose the next lesson: a next-day check that is due, then the answer in progress, then the shortest answer not started. A student MAY pick another answer.

#### Scenario: What the student sees
- **WHEN** a student opens memorising
- **THEN** they see their answers, a few steps for each, and one button to start the recommended lesson

#### Scenario: One thing per screen
- **WHEN** a lesson screen is shown
- **THEN** it has one instruction, the tutor, one card and one main control

### Requirement: Next-day check
The last step for an answer SHALL open no sooner than the day after the answer was first said from the question alone, and SHALL start cold with no warm-up.

#### Scenario: Not the same day
- **WHEN** a student says an answer from the question alone for the first time
- **THEN** the next-day check for that answer stays closed until the following day

#### Scenario: It slipped overnight
- **WHEN** a student cannot say the answer in the next-day check
- **THEN** the answer goes back to the from-memory lesson and nothing is described as failed

### Requirement: Keep going after a fudged bit
A student who skips or mangles one bit of three or more and says the rest SHALL pass the screen, SHALL be praised for carrying on, and SHALL then be asked only for the bit they missed. Such an attempt SHALL NOT count as a clean recall for mastery.

#### Scenario: Carried on
- **WHEN** a student misses the middle bit of a four-bit answer and says the last two
- **THEN** the screen passes, the missed bit is named, and the next screen asks for that bit alone

### Requirement: Support when part of a long sentence will not come
When a student has said some bits of a longer screen and stops making progress, the app SHALL make the next action obvious rather than only waiting: it SHALL point at the next bit to say and offer that bit's help directly.

#### Scenario: Stuck part way
- **WHEN** a student has lit two of five bits and adds nothing for the pause period
- **THEN** the next unsaid bit is marked as the one to say, with a hint for that bit and a way to hear it

### Requirement: Return to a missed bit
When a student reaches the end of a screen with a bit missing, the app SHALL direct them back to that bit in place before the screen ends, where the recogniser allows it.

#### Scenario: Back to the gap
- **WHEN** a student finishes the last bit with an earlier bit unsaid
- **THEN** that bit is marked and the student is invited to say just it, and saying it completes the screen
