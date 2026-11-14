# Spec Delta

## Purpose

Makes sure a student builds an answer to a question only from the parts of the teacher's sentence builder that belong to that question, and never from a sentence builder written for a different question.

## ADDED Requirements

### Requirement: A course question is matched to a sheet question
Each course question SHALL be matched to the sheet question that has the same Spanish text, compared without capitals, accents or punctuation. The match SHALL be worked out from the stored question and sheet each time, so courses made before this feature are matched with no data change. A question with no sheet question of the same text has no match.

#### Scenario: Same question
- **WHEN** a course question reads "¿Qué haces en tu tiempo libre?" and the sheet has a question reading "¿Qué haces en tu tiempo libre?"
- **THEN** the course question is matched to it

#### Scenario: Different capitals and accents
- **WHEN** the texts differ only by capitals, accents or punctuation
- **THEN** they match

#### Scenario: Different question
- **WHEN** a course question asks about films and the only sheet question asks about free time
- **THEN** the course question has no match

### Requirement: The match limits what can be built
When a course question has a match, the write screen and the server SHALL apply that sheet question's required parts, its question variant and the sheet blocks it uses. A chunk or part that belongs to another question SHALL NOT be offered, and a saved answer that holds one SHALL NOT be confirmed.

#### Scenario: Part for another question
- **WHEN** a sheet has a past-tense half for one question and a present-tense half for another, and the student is on the past-tense question
- **THEN** present-tense chunks are not offered and a saved answer containing one is refused

#### Scenario: Required parts
- **WHEN** the matched sheet question lists the parts an answer needs
- **THEN** the answer cannot be confirmed until those are filled, and the one thing to fix named is one of them

### Requirement: A question with no match is not answered from another sheet
A course question with no match SHALL NOT show any sentence builder and SHALL NOT be confirmable. The student SHALL be told in plain words that this question has no sentence builder yet, and the server SHALL refuse to save an answer for it.

#### Scenario: Unmatched question on screen
- **WHEN** a student opens a question that has no match
- **THEN** a notice says there is no sentence builder for it yet, and no chunks are shown

#### Scenario: Unmatched question on the server
- **WHEN** a request to save or confirm an answer arrives for a question with no match
- **THEN** it is refused and nothing is stored

#### Scenario: Gated course
- **WHEN** a gated course has a question with no match
- **THEN** the write step cannot be completed for it, so the gap is visible and the gated order is not bypassed

### Requirement: Gaps are reported at seed time
The seed SHALL list, for each course it creates or updates, the questions that have no match, so a missing sentence builder is found before a student reaches it.

#### Scenario: Seed output
- **WHEN** the seed runs for a course with an unmatched question
- **THEN** it prints that question's position and text
