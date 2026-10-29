# Spec Delta

## Purpose

Gives each student a lively Spanish-speaking tutor character whose mouth tracks the voice convincingly, that never speaks English, and that students can make their own.

## ADDED Requirements

### Requirement: Spanish-only tutor
The tutor SHALL speak only Spanish. English SHALL appear only as subtitles beneath the Spanish line, and a student SHALL be able to hide subtitles.

#### Scenario: Tutor greets
- **WHEN** the tutor greets a student
- **THEN** a Spanish line is spoken and its English subtitle is shown

### Requirement: Stock phrase banks
Tutor lines SHALL come from a stored bank keyed to situations such as correct, wrong, streak, nervous and days-to-test, written at the course's level. Lines SHALL be generated once per persona and reused.

#### Scenario: Correct answer
- **WHEN** a student answers correctly
- **THEN** the tutor says a line from the correct bank, avoiding the line used last time

### Requirement: Persona selection
A student SHALL choose from built-in tutor characters, and the chosen character's phrase bank SHALL reflect the student's interest tags without adding any new vocabulary outside the course level.

#### Scenario: Football tag
- **WHEN** a student with a football tag selects a persona
- **THEN** the persona's lines include football-flavoured phrases within the course vocabulary

### Requirement: Lip-sync quality
The avatar's jaw SHALL open in proportion to the loudness of the audio, and lip shapes SHALL change only for closed lips, rounded lips and teeth-on-lip sounds. The mouth SHALL lead the audio by about 30 ms and shapes shorter than about 70 ms SHALL be dropped.

#### Scenario: Closed-lip sounds
- **WHEN** the tutor says a word beginning with m, b or p
- **THEN** the lips close just before the sound is heard

### Requirement: Speed independence
Lip-sync SHALL stay aligned when audio plays at slower speeds.

#### Scenario: Half speed
- **WHEN** a clip plays at half speed
- **THEN** mouth movement still matches the sounds

### Requirement: Own drawing as tutor
A student SHALL be able to supply their own drawing, mark where the mouth is, and see it speak using the same mouth system. The drawing SHALL remain on the device.

#### Scenario: Drawing speaks
- **WHEN** a student places the mouth on their drawing and plays a line
- **THEN** the drawing's mouth moves in time with the audio

### Requirement: Reduced motion
When the device requests reduced motion, the avatar SHALL limit head movement while keeping the mouth synchronised to audio.

#### Scenario: Reduced motion on
- **WHEN** reduced motion is requested
- **THEN** head bobbing is disabled and the mouth still moves with the speech

### Requirement: Third-party characters excluded
The app SHALL NOT ship or generate likenesses of copyrighted characters. Students SHALL be offered original characters and their own drawings only.

#### Scenario: Persona list
- **WHEN** the persona list is shown
- **THEN** every entry is an original character
