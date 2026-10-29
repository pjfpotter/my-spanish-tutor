# Spec Delta

## Purpose

Trains students to understand each test question when they hear it, and keeps them on it until they succeed repeatedly across separate sessions, not just once.

## ADDED Requirements

### Requirement: Hear then choose
In this phase the student SHALL hear a question and select its meaning from options, with the Spanish text hidden by default.

#### Scenario: Correct choice
- **WHEN** a student hears a question and picks the matching meaning
- **THEN** the response is recorded as correct with the voice and speed used

### Requirement: Mastery across sessions
A question SHALL count as mastered only after it is answered correctly at least three times across at least two separate sessions, with the thresholds configurable. A student SHALL NOT advance to the next phase until all five questions are mastered.

#### Scenario: Single-session success
- **WHEN** a student answers a question correctly three times in one session
- **THEN** it is not yet mastered and is scheduled for a later session

### Requirement: Varied voices and speeds
Practice SHALL rotate voices and increase speed as the student succeeds, never repeating the same clip back to back.

#### Scenario: Progressive speed
- **WHEN** a student answers a question correctly at normal speed
- **THEN** the next presentation of that question uses a different voice or a faster speed

### Requirement: Replay and reveal
A student SHALL be able to replay a clip, slow it down, and reveal the Spanish text and English subtitle, and each use SHALL be recorded.

#### Scenario: Reveal used
- **WHEN** a student reveals the text
- **THEN** the attempt is marked as assisted and does not count toward mastery

### Requirement: Spaced return
Questions not yet mastered SHALL return at increasing intervals within a session, with recently missed questions returning sooner.

#### Scenario: Missed question
- **WHEN** a student chooses the wrong meaning
- **THEN** the question returns again within the same session after a short gap
