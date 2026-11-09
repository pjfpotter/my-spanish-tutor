# Spec Delta

## Purpose

Helps a student build, for each question, a Spanish answer they can realistically memorise and say, by filling a sentence-builder-style row of blocks with chunks from the question's own sentence builder. Everyone starts from empty spaces, the app rewards added detail with more value instead of showing levels or grades, and nudges students to extend until the answer is challenging but achievable. The writing stage makes no language-model call. Design record: `docs/writing-flow-options.md`.

## ADDED Requirements

### Requirement: Build from empty spaces
Writing a question's answer SHALL start with empty slots laid out like the sentence builder the student knows, coloured by chunk kind, with the same colours used for chunks in the automatise phase. The student SHALL fill slots by choosing chunks from that question's sentence builder. The app SHALL NOT ask the student to choose a target or level.

#### Scenario: Opening a question
- **WHEN** a student opens a question to write
- **THEN** empty coloured slots are shown, nothing is pre-filled, and no target is asked for

### Requirement: Optional starter answer
A student SHALL be able to generate a semi-random model answer to fill the slots as a starting point, and SHALL be able to keep and use it unchanged. Generating one SHALL be optional and SHALL never be the default.

#### Scenario: Rushed student
- **WHEN** a student taps to generate a starter answer
- **THEN** the slots fill from a model answer for that question, and the student may confirm it as it is

### Requirement: Show only what the next tap needs
Tapping a slot SHALL open only the chunks that fit that slot. Swap choices, analysis and rules SHALL NOT be shown until asked for. The writing screens SHALL show one decision at a time, fit one screen with no scrolling, offer an always-available exit and back, and use plain English instructions.

#### Scenario: Tapping a slot
- **WHEN** a student taps a slot
- **THEN** only fitting chunks are offered, in place, with nothing else added to the screen

### Requirement: Guidance about what fits
The coach SHALL only offer chunks that combine sensibly, using fit rules from the course's data (polarity of starters and reasons, slot kinds, no repeats within an answer). When a swap would break a dependent chunk, the app SHALL repair it and say so in one line.

#### Scenario: Mismatched reason
- **WHEN** a student swaps a positive starter for a negative one
- **THEN** a dependent positive reason is replaced with a fitting one and a one-line note says so

### Requirement: Only words from the allowed sets
Every word in an answer SHALL come from the question's sentence builder, the course's glue-word bank or the allowed common-word list. Any other word SHALL be flagged and the answer SHALL NOT be confirmed until it is removed or replaced.

#### Scenario: Out-of-bank word
- **WHEN** an answer contains a word in none of the allowed sets
- **THEN** the word is flagged and the answer cannot be confirmed

### Requirement: Cement for joining words
Glue words such as "y", "pero" and "también" SHALL be offered in a joining tray ("cement") between blocks. Glue words SHALL be accepted anywhere they fit and SHALL carry no value.

#### Scenario: Joining two chunks
- **WHEN** a student places "pero" between two chunks
- **THEN** it is accepted and adds no value

### Requirement: Question's own sentence builder
For a course with more than one sentence builder, a question's slots SHALL offer only chunks from the sentence builder explicitly linked to that question.

#### Scenario: Two builders
- **WHEN** a student writes a question linked to the house sentence builder
- **THEN** no bedroom chunks are offered

### Requirement: Value grows with detail
Each answer SHALL have a value shown as an amount of the in-app currency that grows as the student adds features from the course's calibration data. Each feature's value SHALL blend one unit per extra with a weight for how hard the feature is to learn. Repeating a feature SHALL add nothing. No level names, grades, marks or ladders SHALL be shown. Accents, small spelling slips and recognition failures SHALL never lower the value.

#### Scenario: Adding a feature
- **WHEN** a student fills a slot with a time phrase
- **THEN** the answer's value rises by that feature's value

#### Scenario: Repeating a feature
- **WHEN** a student adds a second time phrase
- **THEN** the value does not rise again

### Requirement: Value is earned by learning
The currency for an answer SHALL be paid when it is memorised and automatised, not when it is written, so a bigger answer pays only if it is learned.

#### Scenario: Written but not learned
- **WHEN** a student confirms a valuable answer and does not practise it
- **THEN** no currency is paid for that value yet

### Requirement: Nudge into the challenge zone
After an answer works (it is complete and valid), the coach SHALL offer at most one optional extra at a time, phrased as an optional extra, chosen to sit just outside the student's comfort zone. Recycled chunks are offered first. It SHALL not nudge before the first working answer exists.

#### Scenario: One suggestion
- **WHEN** a student has a complete working answer
- **THEN** a single optional extra is offered and can be dismissed

### Requirement: Analysis on request
A student SHALL be able to open an analysis that shows why an answer is worth what it is. It SHALL animate by highlighting the parts of the text that earn value, naming each feature in English (for example "connective!") with a reward sound and a currency animation. It SHALL be short, SHALL be cancellable at any time and SHALL respect reduced motion and the sound setting.

#### Scenario: Cancel analysis
- **WHEN** a student taps cancel during the analysis
- **THEN** it stops at once and the writing screen returns

### Requirement: Whole-test checklist
Across the test the coach SHALL show a checklist of three different tenses and two justified opinions as targets. They SHALL NOT gate any answer or be a grade.

#### Scenario: Targets are not gates
- **WHEN** a student's answers together use two tenses
- **THEN** the checklist shows the tense target as unmet and nothing is withheld

### Requirement: Confirm each answer
A student SHALL confirm each answer, and a confirmed answer SHALL unlock memorising for that answer alone. A student MAY start memorising a confirmed answer while still writing the others.

#### Scenario: One confirmed
- **WHEN** a student confirms the first of five answers
- **THEN** memorising that answer is available at once

### Requirement: Bonus for finishing all five
Confirming every answer in the course SHALL pay a bonus of the in-app currency, to encourage writing all of them without blocking any student who moves on earlier.

#### Scenario: All confirmed
- **WHEN** a student confirms the last of their answers
- **THEN** a bonus is paid and celebrated

### Requirement: Changing a confirmed answer
A student SHALL be able to change a confirmed answer at any time, and doing so SHALL reset the progress on that answer. When progress on an answer stalls (repeated failures to recall it or particular words), the app SHALL suggest changing it and SHALL help simplify it, preferring cognates and high-frequency chunks. A student SHALL be able to prune an answer by removing chunks.

#### Scenario: Stalled answer
- **WHEN** a student repeatedly fails to recall a long answer
- **THEN** the app suggests a simpler version using cognates and high-frequency chunks, which the student may accept

#### Scenario: Reset on change
- **WHEN** a student changes a confirmed answer
- **THEN** its progress is reset

### Requirement: No model answers available
If a course has no model answer for a question, the optional starter SHALL say so plainly and the student SHALL still be able to build an answer from the sentence builder, so they are never blocked.

#### Scenario: Missing starter
- **WHEN** a course has no model answer for a question
- **THEN** the starter option explains this and building from the slots remains available

### Requirement: Memorising load
Because bigger answers take more memorising, the coach SHALL tell the student once per question, in plain words, that a longer answer takes more learning and that removing chunks is fine at any time.

#### Scenario: Honest note
- **WHEN** an answer's value passes the course's load-note value
- **THEN** the note appears once and does not block confirmation

## Open questions

- Euro naming and display, value formula weights, bonus size, how pruning treats earned progress, building outwards from the main verb phrase, and the analysis animation (see docs/writing-flow-options.md, section 8). Photo scan for teachers (teacher-course-setup).
