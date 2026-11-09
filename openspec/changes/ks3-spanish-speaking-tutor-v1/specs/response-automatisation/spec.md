# Spec Delta

## Purpose

Builds the automatic link between hearing a Spanish question and saying the memorised answer, using timed practice and a visible response-speed measure.

## ADDED Requirements

### Requirement: Hear and answer
The student SHALL hear a question with the question text hidden and say the matching answer aloud within a response window. The answer's chunks are shown as the student says them correctly (see Chunks appear as you speak).

#### Scenario: Answer in time
- **WHEN** a student starts speaking within the window after a question ends
- **THEN** the attempt is scored for accuracy and its response time is recorded

### Requirement: Response time measurement
The app SHALL measure the time from the end of the question audio to the start of the student's speech and SHALL store it with each attempt.

#### Scenario: Recorded latency
- **WHEN** a student begins speaking 2.3 seconds after the question ends
- **THEN** the attempt records a response time of about 2.3 seconds

### Requirement: Adaptive window
The response window SHALL shorten as the student's recent response times improve and lengthen when they struggle, within fixed limits.

#### Scenario: Improving student
- **WHEN** a student answers quickly and accurately several times
- **THEN** the next windows are shorter

### Requirement: Blanking support
When a student does not start speaking within the window, the tutor SHALL offer a first-words hint and the attempt SHALL be recorded as a blank, not a wrong answer.

#### Scenario: Blank
- **WHEN** the window ends in silence
- **THEN** a hint is offered and the attempt is tagged as a blank

### Requirement: Asking for repetition
The student SHALL be able to say a short Spanish phrase such as "¿Puede repetir, por favor?" to hear the question again, and using it SHALL be rewarded and not penalised.

#### Scenario: Repeat request
- **WHEN** a student says the repetition phrase
- **THEN** the question plays again and the attempt is marked as a good test technique

### Requirement: Mixed order
Questions SHALL be presented in shuffled order with speeds varied, and the recycled question SHALL appear alongside current ones.

#### Scenario: Shuffled round
- **WHEN** a round of five questions starts
- **THEN** the order differs from the previous round

### Requirement: Ready threshold
A course SHALL be marked automatised for a student when each question has been answered accurately and within a target response time on multiple separate sessions, with the thresholds configurable.

#### Scenario: Ready
- **WHEN** every question meets the threshold on at least two separate sessions
- **THEN** the student is shown that they are test-ready

### Requirement: Chunk ladder
Automatisation SHALL be a ladder of levels: level 1 asks for only the first chunk of the answer, level 2 the first two chunks, level 3 the first three chunks, and the final level the whole answer. A student moves up after meeting the accuracy and response-time target at a level and SHALL be able to start at a higher level.

#### Scenario: Level one
- **WHEN** a student is on level 1
- **THEN** they hear the question and need only say the first chunk to succeed

#### Scenario: Start higher
- **WHEN** a student chooses a higher level
- **THEN** the round starts there

### Requirement: Chunks appear as you speak
Each chunk SHALL appear on screen, in its colour, as the student says it correctly. Chunks SHALL NOT be removed once shown during the round.

#### Scenario: Chunk said
- **WHEN** a student says the first chunk correctly
- **THEN** the chunk appears in its colour

### Requirement: Hints appear when stuck
If the student has not started within a hint delay (default 2.5 seconds, configurable) the next chunk's first words SHALL appear as a hint. A hint SHALL mean the attempt was assisted but SHALL NOT be treated as an error. As the student's response times fall, hints SHALL appear less often because the student starts before the delay.

#### Scenario: Slow start
- **WHEN** the student has not begun speaking after 2.5 seconds
- **THEN** the first chunk's first words appear as a hint

### Requirement: Expert mode
After the ladder the student SHALL be able to enter expert mode, which shows no text on screen at all, like a mock test. Chunks SHALL be revealed only in the results.

#### Scenario: Expert round
- **WHEN** a student plays an expert round
- **THEN** no chunk or hint is shown while answering

### Requirement: Shrinking-time play
Response-time rank and personal bests SHALL be the basis of play in this phase, in the style of rewarding a falling time to answer. Any game mode beyond the ladder, the hint timer and expert mode SHALL follow the approval rule in practice-session-feel.

#### Scenario: New personal best
- **WHEN** a student's response time beats their previous best
- **THEN** the improvement is celebrated

### Requirement: Practice is one screen, challenge is a flow
The practice round SHALL be a single screen. A separate Challenge mode MAY use a sequence of screens; its design is open (see design.md, open questions).

#### Scenario: Practice round
- **WHEN** a student plays a practice round
- **THEN** it occupies one screen throughout
