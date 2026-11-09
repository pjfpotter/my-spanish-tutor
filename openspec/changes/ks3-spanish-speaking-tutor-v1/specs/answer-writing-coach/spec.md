# Spec Delta

## Purpose

Helps a student choose, for each question, a Spanish answer they can realistically memorise and say, starting from model answers written for the course and adjusting them with chunks from the sentence builder. The writing stage makes no language-model call.

## ADDED Requirements

### Requirement: Pick a target level
The coach SHALL let the student choose a target level (Rock solid, Stepping out or Showing off) for the whole test and SHALL let them switch at any time. Switching SHALL be presented as picking a style, never as an upgrade or a demotion. Reaching the level the student chose SHALL be celebrated in full, whichever level that is.

#### Scenario: Rock solid is a full win
- **WHEN** a student targets Rock solid and their answers reach it
- **THEN** the app celebrates completion without suggesting the answer is a lesser one

#### Scenario: Switching target
- **WHEN** a student switches from Rock solid to Stepping out
- **THEN** each answer is offered the matching model answer and their confirmed answers are kept until they replace them

### Requirement: Model answers are the main path
For each question and level the coach SHALL offer the course's model answers as the starting point. The default offered is the Rock solid model answer with the most cognates, shortest words and most recycled chunks, because many students want the easiest route and that is a legitimate choice.

#### Scenario: Easiest route first
- **WHEN** a student opens a question with Rock solid as the target
- **THEN** the first model answer shown is the one scoring highest on cognates, short words and recycled chunks

### Requirement: Swaps and the glue-word bank
The student SHALL be able to swap chunks in a model answer for other chunks from the sentence builder that fit. Every word in an answer SHALL come from the sentence builder, the course's glue-word bank (for example "y", "pero", "también") or the allowed common-word list. Glue words SHALL never count as features. Any word outside those sets SHALL be flagged and the answer SHALL NOT be confirmed until it is removed or replaced.

#### Scenario: Glue word accepted
- **WHEN** a student joins two chunks with "pero"
- **THEN** the swap is accepted and no feature is added or lost

#### Scenario: Out-of-bank word
- **WHEN** an answer contains a word in none of the allowed sets
- **THEN** the word is flagged and the answer cannot be confirmed until it is fixed

### Requirement: Rubric tiering by rules
The level of an answer SHALL be determined by counting features from the course's calibration data in the text, independently of how the answer was produced, and the counted features SHALL be shown by name as a checklist. No grade or mark SHALL be shown. Accents, small spelling slips and recognition failures never lower the level.

#### Scenario: Swap re-evaluates
- **WHEN** a student swaps a chunk
- **THEN** the checklist and level are recomputed immediately with no model call

#### Scenario: Words outside the sentence builder
- **WHEN** an answer contains a word outside the sentence builder
- **THEN** the word is flagged and does not count as a feature, and the level is not lowered by it

### Requirement: One suggestion at a time
The coach SHALL offer at most one suggestion per answer, phrased as an optional extra ("add one more touch if you like"), and SHALL name at most one thing to fix. Recycled chunks are offered first. Across the test it SHALL show a checklist with three different tenses and two justified opinions as targets, none of which is a gate on any level.

#### Scenario: Whole-test checklist
- **WHEN** a student's five answers use only two tenses
- **THEN** the checklist shows the tense target as not yet met and suggests the answer where a third tense is easiest to add, without withholding any level

### Requirement: Spare extras
Model answers sitting exactly on a level threshold SHALL carry one spare extra, so a single swap does not drop them a level.

#### Scenario: One swap at the threshold
- **WHEN** a student swaps one chunk in a Showing off model answer
- **THEN** the answer is still at Showing off

### Requirement: Memorising load note
At the Showing off level the coach SHALL tell the student, once per question, that this version takes more memorising and that switching back is fine at any time.

#### Scenario: Honest note
- **WHEN** a student selects a Showing off model answer
- **THEN** the load note appears once and does not block confirmation

### Requirement: Confirmation gate
A student SHALL explicitly confirm each answer before memorisation begins, and SHALL be able to change a confirmed answer later.

#### Scenario: Confirm all five
- **WHEN** a student confirms all five answers
- **THEN** the memorisation phase unlocks for those answers

### Requirement: No model answers available
If a course has no model answers for a question and level, the coach SHALL say so plainly, offer the levels that do have model answers, and let the student build an answer from sentence-builder chunks so they are never blocked.

#### Scenario: Missing level
- **WHEN** a course has no Showing off model answer for a question
- **THEN** the student is offered the other levels and the missing one is marked for the teacher

### Requirement: Writing flow rules while the design is open
Until the writing flow is redesigned (see docs/writing-flow-options.md), the writing screens SHALL show one decision at a time, fit one screen with no scrolling, offer an always-available exit and back, use plain English instructions, and let a confident student reach confirmation in a few taps. The flow's interaction (card row, card sort or blocks) and any change from named levels to answer coin values are undecided.

#### Scenario: One decision per screen
- **WHEN** a student is choosing a swap
- **THEN** the checklist and level picker are not on the same screen

## Open questions

- Writing flow redesign, including the 13 questions in docs/writing-flow-options.md (direction, whether named levels give way to answer coin values, onboarding style). Not decided.

- Should a teacher review and approve generated model answers (and any proposed feature phrases) before a course is published, or is the rubric agreeing with the intended level enough? Not decided; v1 builds without a review step.
- Should the upload-time model call also propose extra feature phrases for language that the base calibration does not mention? Not decided; the calibration files are editable so they can be adjusted by hand if live testing shows mislabelled answers.
- Parked: a student-facing mode that fakes a relevant sentence builder from the 2022 specification vocabulary lists, for Year 8 tests that span several builders. It depends on whether the end user is a teacher or a student.
