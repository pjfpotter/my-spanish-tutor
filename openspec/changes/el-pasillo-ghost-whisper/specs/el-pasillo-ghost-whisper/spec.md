# Spec Delta

## Purpose

Defines the ghost whisper: a limited-supply pronunciation rescue in El Pasillo where Tele whispers one word the student has not yet said clearly, in a haunted voice made from the course's own audio.

## ADDED Requirements

### Requirement: A student can ask for a ghost whisper of a word they have not said
A door SHALL offer a Whisper button while the student's microphone is listening and at least one word of the door has not been understood. Tapping it SHALL play the ghost whisper of the first word not yet understood. The button SHALL NOT appear when every word is understood, when no ghost audio exists for the word, or when sound is off.

#### Scenario: Whisper the word that was missed
- **WHEN** the student says "kwee air oh" for *quiero* and the recogniser does not match it
- **THEN** Whisper is available, and tapping it plays *quiero* as a ghost whisper

#### Scenario: Nothing to whisper
- **WHEN** every word of the door has been understood
- **THEN** the Whisper button is not shown

#### Scenario: The answer is not revealed in writing
- **WHEN** a ghost whisper plays at a no-help door
- **THEN** the door's plaque still shows no answer word, and no English is spoken or shown beyond the existing question subtitle

### Requirement: The ghost whisper is Tele's own voice made haunted
The whisper SHALL be made from the same voice as the rest of Tele's audio, cut from a built slow clip of a course chunk that contains the word. It SHALL be a whisper with a light glitch, SHALL be Spanish only, and SHALL be slower than normal speech. It SHALL NOT use the browser's speech voice and SHALL NOT make any language-model or paid call.

#### Scenario: Same word, same file
- **WHEN** the word appears in several chunks
- **THEN** one ghost file exists for it and every door that needs it uses that file

#### Scenario: Missing ghost audio
- **WHEN** a word has no ghost file
- **THEN** the Whisper button is not offered for that word and the door plays normally

#### Scenario: Haunting is optional
- **WHEN** the device has no Web Audio support or it fails to start
- **THEN** the plain ghost whisper still plays and the door still works

### Requirement: Whispers are a limited supply that costs time
Each run SHALL give a small fixed number of whispers. Each whisper used SHALL cost chase time, SHALL be shown to the student before they spend it, and SHALL mark the door as assisted so it does not count towards the escape or towards being test ready. When the supply is used up the button SHALL say so and SHALL NOT play.

#### Scenario: Supply runs out
- **WHEN** the student has used every whisper in the run
- **THEN** Whisper shows none left and tapping it plays nothing and costs nothing

#### Scenario: A whisper is help
- **WHEN** the student uses a whisper at a no-help door and then clears it
- **THEN** the door opens, does not count towards the three clean doors, and is recorded as assisted

#### Scenario: Cost is visible first
- **WHEN** a door offers Whisper
- **THEN** the button shows how many whispers are left and that using one lets the monster closer

### Requirement: A recognition failure is never penalised
Offering the whisper SHALL NOT cost the student anything. Only using it does. A student whose microphone cannot hear SHALL NOT be forced to use a whisper and SHALL keep the existing way to pass the door.

#### Scenario: Noise or no speech
- **WHEN** the recogniser hears only noise
- **THEN** the student is not charged for the miss, and a whisper is only spent when they tap Whisper

### Requirement: Ghost words are built ahead of time from existing clips
Ghost audio SHALL be built by the audio build step, not at play time. It SHALL need no paid call and SHALL be rebuilt only when the source word, voice or ghost recipe changes. A dry run SHALL list what would be built and what would be removed. Ghost files SHALL be fetched only when a whisper is tapped.

#### Scenario: Nothing changed
- **WHEN** the build is run again with no changes to clips or recipe
- **THEN** no ghost file is rebuilt

#### Scenario: Recipe changed
- **WHEN** the ghost recipe version changes
- **THEN** every ghost file is marked stale and rebuilt, and clips are not

#### Scenario: Word cut is exact
- **WHEN** a clip has stored word end times
- **THEN** the word is cut from its start to its end with a short padding and fade at each edge, and for older clips without end times it is cut to the start of the next word or the clip's end
