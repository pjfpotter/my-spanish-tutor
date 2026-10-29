# Spec Delta

## Purpose

Builds the automatic link between hearing a Spanish question and saying the memorised answer, using timed practice and a visible response-speed measure.

## ADDED Requirements

### Requirement: Hear and answer
The student SHALL hear a question with no text shown and say the matching answer aloud within a response window.

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
Questions SHALL be presented in shuffled order with voices and speeds varied, and the recycled question SHALL appear alongside current ones.

#### Scenario: Shuffled round
- **WHEN** a round of five questions starts
- **THEN** the order differs from the previous round

### Requirement: Ready threshold
A course SHALL be marked automatised for a student when each question has been answered accurately and within a target response time on multiple separate sessions, with the thresholds configurable.

#### Scenario: Ready
- **WHEN** every question meets the threshold on at least two separate sessions
- **THEN** the student is shown that they are test-ready
