# Spec Delta

## Purpose

Defines how an El Pasillo run takes a student from full help to saying an answer with no help at all, and how the student earns the escape. It keeps the practice gentle for self-conscious students while ending on the skill the speaking test measures.

## ADDED Requirements

### Requirement: A run climbs five stages of fading help
A run SHALL move through five stages in order, with two doors per stage for the first four: (1) read one Spanish chunk shown in full; (2) read the whole answer shown in full; (3) hear the question and see only the first and last letter of each answer word; (4) hear the question and see only the first chunk of the answer; (5) hear the question with no help. A door SHALL show the name of its stage.

#### Scenario: Order of stages
- **WHEN** a student starts a run
- **THEN** the first two doors are stage 1, the next two stage 2, then stage 3, then stage 4, and after that only stage 5 doors

#### Scenario: Stage 3 shows letters only
- **WHEN** a stage 3 door is waiting
- **THEN** each answer word shows only its first and last letter with dots between, and Tele has spoken the question in Spanish

#### Scenario: Stage 4 shows the first chunk only
- **WHEN** a stage 4 door is waiting
- **THEN** only the first chunk of the answer is shown and the rest is hidden

### Requirement: The tutor speaks only Spanish
From stage 3, the question SHALL be spoken aloud in Spanish and SHALL be replayable by the student. English SHALL appear only as a subtitle of the question, and SHALL NOT give away the answer.

#### Scenario: Replay the question
- **WHEN** the student taps to hear the question again at a stage 3, 4 or 5 door
- **THEN** the Spanish question is spoken again and nothing is penalised

#### Scenario: Sound is off
- **WHEN** sound is off or unavailable
- **THEN** the Spanish question text is shown as a fallback so the door can still be played

### Requirement: The escape is earned with no help
The student SHALL escape after clearing three stage 5 doors without using Show me. Stage 5 doors SHALL keep coming until then. A stage 5 door cleared with Show me SHALL NOT count towards the escape.

#### Scenario: Three clean no-help doors
- **WHEN** the student clears three stage 5 doors with no help
- **THEN** they escape and the result screen says so

#### Scenario: Help does not count
- **WHEN** the student presses Show me on a stage 5 door and then clears it
- **THEN** the door lets them through but the escape count stays where it was

#### Scenario: Keeps going until earned
- **WHEN** the student has cleared two clean stage 5 doors and clears a third with help
- **THEN** another stage 5 door follows

#### Scenario: No microphone is not a penalty
- **WHEN** the microphone cannot hear and the student reads a stage 5 door aloud and taps to continue
- **THEN** the door counts towards the escape and nothing is recorded for it

### Requirement: Pressure stays bounded in the open-ended stage
The chase SHALL keep closing faster through the fixed doors of stages 1 to 4 and the first stage 5 doors, and SHALL NOT keep speeding up beyond that point however many stage 5 doors are needed.

#### Scenario: Rate stops rising
- **WHEN** the closing rate is computed for the twentieth door and for the twelfth
- **THEN** the two rates are equal

### Requirement: Only unassisted no-help doors count towards readiness
Each stage 5 door cleared by voice SHALL be recorded as one timed attempt with numbers only, as before, marked assisted if Show me was used so it does not count towards readiness. Doors of stages 1 to 4, and doors passed by tap, SHALL NOT be recorded. No audio and no transcript SHALL be stored and no language model SHALL be called during a run.

#### Scenario: Recording
- **WHEN** a student clears a stage 5 door without Show me
- **THEN** one unassisted attempt for that question is stored with accuracy and response time only

#### Scenario: Assisted door
- **WHEN** a student clears a stage 5 door after pressing Show me
- **THEN** the attempt is stored as assisted

#### Scenario: Lower stages are not recorded
- **WHEN** a student clears a stage 1 to 4 door
- **THEN** nothing is sent to the server

### Requirement: The result names the stage reached and one thing to try
When a run ends, the result screen SHALL say which stage the student reached and, if they were caught, name at most one thing to try next, in an encouraging tone. It SHALL NOT use hearts, lives or any ranking.

#### Scenario: Caught at stage 3
- **WHEN** the student is caught on a stage 3 door
- **THEN** the result says they reached stage 3 and offers one suggestion, and they can go in again immediately

#### Scenario: Escaped
- **WHEN** the student escapes
- **THEN** the result celebrates the no-help doors they cleared and does not mention a fail
