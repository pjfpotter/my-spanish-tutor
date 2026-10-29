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
When recall fails, the app SHALL compare untimed and timed results and the latest mood check-in to tag the failure as not known well enough, stress-related, or a chunk hotspot.

#### Scenario: Stress pattern
- **WHEN** a student succeeds untimed but fails the same item when timed, after reporting feeling nervous
- **THEN** the tag is stress-related

### Requirement: Chunk hotspots
The app SHALL identify chunks that cause failures across more than one answer or session and flag them for focused practice.

#### Scenario: Repeated trouble
- **WHEN** the same chunk is missed in three or more attempts
- **THEN** it is marked a hotspot and prioritised in the next session

### Requirement: Mood check-in
Each session SHALL start with an optional one-tap mood check-in, including an option to say Spanish is not their favourite, and the result SHALL influence tone and task difficulty.

#### Scenario: Student says they hate Spanish
- **WHEN** a student picks the dislike option
- **THEN** the tutor acknowledges it lightly and starts with an easy, quick win

### Requirement: Starting-point check
At course start the app SHALL run a short test-teach-test baseline over the five questions to establish starting points and record the results as diagnostics.

#### Scenario: Baseline run
- **WHEN** a student begins a course
- **THEN** a short baseline of the questions is offered and its results are stored

### Requirement: Diagnostics drive practice
The next session plan SHALL prioritise items with recent failures and use their cause tags to choose the support offered.

#### Scenario: Too-fast tag
- **WHEN** an item has the tag too fast
- **THEN** the next practice of it starts slower
