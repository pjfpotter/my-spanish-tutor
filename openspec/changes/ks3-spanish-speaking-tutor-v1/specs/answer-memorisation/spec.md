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
