# Spec Delta

## Purpose

Records not only what a student got wrong but the most likely reason, so practice and encouragement can adapt, using simple probes and rules rather than heavy analysis.

## ADDED Requirements

### Requirement: Attempt events
Every practice attempt SHALL be stored with the item, phase, outcome, response time, voice and speed where relevant, whether help was used, and zero or more cause tags.

#### Scenario: Stored attempt
- **WHEN** a student completes an attempt
- **THEN** an event with those fields is saved

### Requirement: Comprehension cause tags
When a question is not understood, the app SHALL run a short probe that plays the key word alone slowly, alone at normal speed, and inside the sentence, and SHALL assign one tag: too fast, word not known, known word but sound-spelling gap, or thrown by context.

#### Scenario: Fails only when fast
- **WHEN** the student succeeds at slow speed but fails at normal speed
- **THEN** the tag is too fast

#### Scenario: Fails in context only
- **WHEN** the student recognises the word alone but fails inside the sentence
- **THEN** the tag is thrown by context

### Requirement: Recall cause tags
When recall fails, the app SHALL compare untimed and timed results to tag the failure as not known well enough, stress-related, or a chunk hotspot.

#### Scenario: Stress pattern
- **WHEN** a student succeeds untimed but fails the same item when timed, on more than one occasion
- **THEN** the tag is stress-related

### Requirement: Chunk hotspots
The app SHALL identify chunks that cause failures across more than one answer or session and flag them for focused practice.

#### Scenario: Repeated trouble
- **WHEN** the same chunk is missed in three or more attempts
- **THEN** it is marked a hotspot and prioritised in the next session

### Requirement: Starting-point check
At course start the app SHALL offer a short placement check, titled in English ("Find your starting point"), over the five questions to establish what the student already understands. Each question SHALL be heard once and answered by choosing its meaning. The check SHALL give a positive result on every outcome, SHALL end on a clear results screen with a next step and a way back to the desktop, and SHALL record the results as diagnostics. The check SHALL NOT repeat itself or force a second pass unless the student chooses to retry.

#### Scenario: All correct first time
- **WHEN** a student answers every question correctly on the first try
- **THEN** a clear success message is shown, the comprehension memorising stage is skipped, and the student is taken to the next stage

#### Scenario: Some wrong
- **WHEN** a student answers some questions incorrectly
- **THEN** the results screen shows which they know, names the questions to learn, and starts the comprehension stage on only those questions

#### Scenario: Answered correctly
- **WHEN** a student answers a question correctly
- **THEN** it is clearly marked correct and its listen-again and answer controls are disabled

#### Scenario: Check finished
- **WHEN** the last question is answered
- **THEN** the student sees results and a next step and is never left on a screen with no navigation

### Requirement: Skipping by proof
Any stage whose purpose is learning what the questions mean SHALL be skippable by a student who proves, in the starting-point check, that they understand them. Skipped questions SHALL count as mastered only for that stage and SHALL return in later stages as normal.

#### Scenario: Partial skip
- **WHEN** a student proves three of five questions in the check
- **THEN** the comprehension stage contains only the other two

### Requirement: Diagnostics drive practice
The next session plan SHALL prioritise items with recent failures and use their cause tags to choose the support offered.

#### Scenario: Too-fast tag
- **WHEN** an item has the tag too fast
- **THEN** the next practice of it starts slower

### Requirement: Mood check-in is parked
Version one SHALL NOT ask students about their mood. A one-tap check-in (with an option to say Spanish is not their favourite) was removed after user testing because its answer was stored and used nowhere visible. It MAY be reconsidered only with a visible use, such as an easier first task or a lighter tutor tone, shown to the student. Tone SHALL instead adapt from behaviour such as repeated blanks or misses.

#### Scenario: Session start
- **WHEN** a student starts a session
- **THEN** no mood question is asked
