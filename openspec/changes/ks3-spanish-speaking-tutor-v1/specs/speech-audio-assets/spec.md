# Spec Delta

## Purpose

Provides natural Spanish audio and clip timelines (word times, loudness and feelings) for questions and tutor lines, generated once and reused, so listening practice is varied and cheap.

## ADDED Requirements

### Requirement: Question audio variants
Each test question SHALL have pre-generated audio in at least two distinct voices and at three speeds (slow, normal, fast), generated before any student uses the course.

#### Scenario: Variants available
- **WHEN** a course is published
- **THEN** every question has audio for each voice and speed

### Requirement: Character voice
The tutor's lines SHALL be spoken in the licensed character voice chosen for production. An unofficial or prototype voice MUST NOT ship.

#### Scenario: Production build
- **WHEN** the production audio is built
- **THEN** every tutor line uses the licensed character voice

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

### Requirement: Clip timelines
Every clip spoken by the tutor SHALL have a timeline created when the clip is generated, containing word times, a downsampled loudness envelope and a feeling track, and it SHALL stay aligned with the audio when played at any supported speed.

#### Scenario: Slow playback
- **WHEN** a clip plays at half speed
- **THEN** word highlighting and loudness response remain aligned with the sounds

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
