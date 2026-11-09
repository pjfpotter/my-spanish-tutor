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
- **WHEN** the tutor speaks after a correct answer (see Tutor rhythm)
- **THEN** it says a line from the correct bank, avoiding the line used last time

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

### Requirement: Tutor rhythm
The tutor SHALL NOT comment after every answer. It SHALL speak at meaningful moments only: the start of a section, a combo (default every five correct answers), a mistake review, a new personal best and the end of a section, plus when the student pokes it. Between those moments it SHALL react with a wordless reaction state only (idle, correct, wrong, skipped).

#### Scenario: Ordinary correct answers
- **WHEN** a student answers three items correctly in a row
- **THEN** the tutor reacts with a wordless reaction and does not speak

#### Scenario: Combo
- **WHEN** a student reaches five correct in a row
- **THEN** the tutor speaks a line

### Requirement: Never blocks progress
A tutor line SHALL never delay the feedback panel or the Continue control. The student SHALL be able to continue while a line plays, and continuing SHALL cut the line off. The English subtitle SHALL be visible on the practice screen without scrolling while a line plays.

#### Scenario: Continue during a line
- **WHEN** a student taps Continue while the tutor is speaking
- **THEN** the next item starts and the line stops

### Requirement: Fast response
The tutor's reaction to an answer SHALL start within 300 ms of the answer, and a spoken line SHALL start within 600 ms.

#### Scenario: Quick reaction
- **WHEN** an answer is checked
- **THEN** the reaction starts within 300 ms

### Requirement: Compact placement
In practice screens the tutor SHALL be compact, placed so that it never pushes the prompt, the answer or the feedback below the fold. It MAY be full size on the desktop and celebration screens.

#### Scenario: Practice screen
- **WHEN** a practice screen is shown on a small phone
- **THEN** the tutor takes no more than a small fixed area

### Requirement: Reaction library
The tutor SHALL have several variants of each reaction state and of each reaction's wordless sound or motion, so that repeated use does not feel the same, because a single character repeats faster than a cast.

#### Scenario: Repeated reaction
- **WHEN** the same reaction state occurs twice in a row
- **THEN** a different variant plays
