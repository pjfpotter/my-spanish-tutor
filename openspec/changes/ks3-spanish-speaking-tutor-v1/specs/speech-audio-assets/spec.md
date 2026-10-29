# Spec Delta

## Purpose

Provides natural Spanish audio and mouth-movement timelines for questions and tutor lines, generated once and reused, so listening practice is varied and cheap.

## ADDED Requirements

### Requirement: Question audio variants
Each test question SHALL have pre-generated audio in at least two distinct voices and at three speeds (slow, normal, fast), generated before any student uses the course.

#### Scenario: Variants available
- **WHEN** a course is published
- **THEN** every question has audio for each voice and speed

### Requirement: Natural slow speech
Slow audio SHALL be produced by synthesising at a slower speaking rate and not by time-stretching normal audio.

#### Scenario: Slow clip
- **WHEN** the slow variant of a question is played
- **THEN** pitch and rhythm sound natural rather than stretched

### Requirement: Audio reuse
Audio for identical text, voice and speed SHALL be generated at most once and reused for all students and courses.

#### Scenario: Repeated text
- **WHEN** two courses contain the same question text
- **THEN** one stored clip serves both

### Requirement: Mouth timelines
Every clip spoken by an avatar SHALL have a mouth timeline created when the clip is generated, containing timed mouth shapes that stay in sync with the audio when played at any supported speed.

#### Scenario: Slow playback
- **WHEN** a clip plays at half speed
- **THEN** mouth shapes remain aligned with the sounds

### Requirement: Spanish-only tutor audio
The app SHALL NOT produce or play English speech for the tutor. English SHALL appear only as subtitles.

#### Scenario: Tutor lines
- **WHEN** the tutor speaks any line
- **THEN** the audio is Spanish and the English translation is shown as text

### Requirement: Fallback when audio is missing
If a clip cannot be loaded, the app SHALL show the Spanish text with its English subtitle and let the student continue.

#### Scenario: Missing clip
- **WHEN** the audio for a question fails to load
- **THEN** the question is shown as text and the failure is recorded
