# Spec Delta

## Purpose

Gives each student a lively Spanish-speaking tutor character with no mouth, whose feelings show in its eye, antennae, picture and world, that never speaks English, and whose look was designed with the first test user.

## ADDED Requirements

### Requirement: Spanish-only tutor
The tutor SHALL speak only Spanish. English SHALL appear only as subtitles beneath the Spanish line, and a student SHALL be able to hide subtitles.

#### Scenario: Tutor greets
- **WHEN** the tutor greets a student
- **THEN** a Spanish line is spoken and its English subtitle is shown

### Requirement: Stock phrase bank
Tutor lines SHALL come from a stored bank keyed to situations such as correct, wrong, streak, nervous and days-to-test, written at the course's level. Lines SHALL be generated once for the character and reused, and each line SHALL carry a feeling.

#### Scenario: Correct answer
- **WHEN** a student answers correctly
- **THEN** the tutor says a line from the correct bank, avoiding the line used last time

### Requirement: Single original character
Version one SHALL offer one original character, with no persona picker. The character SHALL NOT be a likeness of a copyrighted character.

#### Scenario: Character shown
- **WHEN** a student opens the app
- **THEN** the same original character is shown, and no choice of tutor is offered

### Requirement: Mouthless feeling-driven character
The character SHALL have no mouth. Its feelings (joy, sadness, anger, fear, surprise, disgust) SHALL be shown through its eye, antennae, picture and surrounding world, and any two feelings SHALL be able to blend.

#### Scenario: Sad line
- **WHEN** the tutor says a line whose feeling is sadness
- **THEN** the eye, antennae, picture and world change to show sadness and no mouth is drawn

#### Scenario: Blended feeling
- **WHEN** a line carries two feelings
- **THEN** the character shows a blend of both

### Requirement: Voice-driven response
While the character speaks, its screen and antenna tips SHALL glow in proportion to the loudness of the audio, and the caption SHALL highlight the word being spoken. Both SHALL stay aligned when the audio plays at slower speeds.

#### Scenario: Half speed
- **WHEN** a clip plays at half speed
- **THEN** the glow and the highlighted word still match the sounds

### Requirement: Baked feelings
Each line's feelings SHALL come from a feeling track stored with the clip when it was generated. The app MUST NOT call a language model to choose feelings or to chat with the character at runtime, and MUST NOT send student text to one.

#### Scenario: Line played
- **WHEN** a stored line is played
- **THEN** the character's feelings follow the stored track and no language model call is made

### Requirement: Poke for a line
A student SHALL be able to tap the character to hear a stock line from the phrase bank. This SHALL NOT earn coins or progress.

#### Scenario: Poke
- **WHEN** a student taps the character
- **THEN** a stock Spanish line plays with its subtitle and no coins are awarded

### Requirement: Reduced motion and calm switch
When the device requests reduced motion, or the student turns on the calm switch, the character SHALL stop idle movement, glitches and camcorder effects while the caption continues to follow the voice.

#### Scenario: Calm on
- **WHEN** reduced motion is requested or the calm switch is on
- **THEN** idle motion and effects stop and the caption still follows the speech

### Requirement: Third-party characters excluded
The app SHALL NOT ship or generate likenesses of copyrighted characters. Only original characters SHALL be offered.

#### Scenario: Character check
- **WHEN** the character is shown
- **THEN** it is an original character
