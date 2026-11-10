# Spec Delta

## Purpose

Gets each student to recall and say their own confirmed answer from an English prompt, building memory through repeated spoken attempts with immediate, simple feedback.

## ADDED Requirements

### Requirement: Prompted recall
The student SHALL be shown the English meaning of a question or sentence and SHALL say their Spanish answer aloud.

#### Scenario: Attempt
- **WHEN** a student says their answer to an English prompt
- **THEN** the app returns an accuracy percentage within two seconds of the end of speech

### Requirement: Scaffold fading
Prompts SHALL start with strong support, such as the first words or a gapped script, and SHALL reduce support as the student's recent accuracy rises.

#### Scenario: Support reduces
- **WHEN** a student scores above the configured threshold on consecutive attempts
- **THEN** the next prompt gives less of the script

### Requirement: Chunk-level practice
Practice SHALL be able to focus on a single chunk or sentence from an answer when the student keeps missing it.

#### Scenario: Stuck sentence
- **WHEN** a student misses the same sentence repeatedly
- **THEN** the app isolates that sentence for short repeated attempts before returning to the full answer

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
