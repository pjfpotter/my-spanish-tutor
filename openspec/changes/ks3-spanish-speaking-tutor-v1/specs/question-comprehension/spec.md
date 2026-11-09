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

### Requirement: Varied speeds
Practice SHALL vary the speed of a question and increase it as the student succeeds, never playing the same clip of the same question back to back unless the student asks to replay it. Version one has one voice; rotating voices is deferred until a second voice is chosen.

#### Scenario: Progressive speed
- **WHEN** a student answers a question correctly at normal speed
- **THEN** the next presentation of that question uses a faster speed

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

### Requirement: Skip by proof
A student who proves in the starting-point check that they understand a question SHALL skip it in this phase (see learning-diagnostics, Skipping by proof), and SHALL be able to try a question first to skip it at any time.

#### Scenario: Known question
- **WHEN** a student answers a question correctly at the first attempt in the first session
- **THEN** they are offered the choice to move on from that question

### Requirement: Resist shallow matching
Choice options SHALL not be answerable by sentence length or a single cognate alone: distractors SHALL be similar in length and share cognates where the course allows.

#### Scenario: Cognate trap
- **WHEN** a question contains a cognate
- **THEN** at least one wrong option also contains a cognate

### Requirement: Mixed task types in comprehension
The phase SHALL mix at least two task types (hear and choose the meaning, and one of tap what you hear or match pairs) with rising difficulty.

#### Scenario: Variety
- **WHEN** a comprehension session runs
- **THEN** it uses at least two task types

### Requirement: Spoken translation is undecided
Version one SHALL NOT require spoken English translation of a question. Hearing a question and saying its English meaning is stronger evidence of understanding than multiple choice, but it needs English speech recognition and sends a student's English voice to the recogniser. It SHALL be decided after weighing data-protection impact (no recording stored, same handling as Spanish), recogniser accuracy for short English answers on school devices, and effort.

#### Scenario: Comprehension check
- **WHEN** a student is checked on a question's meaning in version one
- **THEN** they choose from options and are not asked to speak English
