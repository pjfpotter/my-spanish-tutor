# Spec Delta

## Purpose

Helps a student produce, for each question, a Spanish answer they can realistically memorise and say, pitched at their ability and the time they have, with light personal touches.

## ADDED Requirements

### Requirement: Level and time targeting
Before drafting, the coach SHALL ask the student how confident they feel and how many minutes a day they can revise, and SHALL target an answer length and level accordingly.

#### Scenario: Low time, low confidence
- **WHEN** a student says they have five minutes a day and feel unsure
- **THEN** the first suggested target is the survival level with short sentences

### Requirement: Answers built from the sentence builder
Every draft SHALL use only chunks from the course sentence builder plus a small allowed list of common words. Any word outside that set SHALL be flagged and the draft SHALL NOT be offered until it is removed or replaced.

#### Scenario: Out-of-bank word
- **WHEN** a draft contains a word not in the sentence builder or allowed list
- **THEN** the word is replaced or the draft is regenerated before the student sees it

### Requirement: Rubric tiering by rules
The rung of a draft SHALL be determined by counting mark-scheme features in the text and across the student's five answers, independently of the process that wrote it, and the counted features SHALL be shown to the student by name. No grade or mark SHALL be shown.

#### Scenario: Features counted
- **WHEN** a draft has a justified opinion, a sequencer and a past tense
- **THEN** the display lists those features and the rung reflects them

### Requirement: Aim higher suggestions
The coach SHALL suggest one concrete upgrade at a time that moves the answer toward the next rung, such as adding a justification, a missing basic tense or a fancy phrase, and the student SHALL be able to accept or decline it. Gaps across the whole test come first: for example, if the five answers use only two basic tenses, the coach suggests the answer where a third is easiest to add, and it steers toward roughly five justified opinions across the test without requiring one in every answer.

#### Scenario: Accepting an upgrade
- **WHEN** a student accepts a suggested upgrade
- **THEN** the draft updates and the level indicator re-evaluates

### Requirement: Light personalisation
The coach SHALL offer substitutions based on the student's interest tags, limited to chunks or known vocabulary that preserve the sentence builder's objectives.

#### Scenario: Interest tag applied
- **WHEN** a student has a football tag and an answer mentions a hobby
- **THEN** the coach offers football-related phrasing that exists in the course vocabulary

### Requirement: Confirmation gate
A student SHALL explicitly confirm each answer before memorisation begins, and SHALL be able to change a confirmed answer later.

#### Scenario: Confirm all five
- **WHEN** a student confirms all five answers
- **THEN** the memorisation phase unlocks for those answers

### Requirement: Draft failure handling
If drafting is unavailable, the coach SHALL fall back to ready-made model answers for the course so the student is never blocked.

#### Scenario: Service down
- **WHEN** drafting cannot be completed
- **THEN** the student is offered the course's model answers instead
