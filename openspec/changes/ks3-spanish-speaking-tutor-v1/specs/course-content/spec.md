# Spec Delta

## Purpose

Defines the course: a sentence builder, its test questions and a simplified mark scheme, and how a class reaches it. A course is the unit of content the whole app works from.

## ADDED Requirements

### Requirement: Course structure
A course SHALL contain one or more sentence builders made of chunks (Spanish text with an English gloss, a category and feature tags), four or five test questions (usually the current topic plus one recycled from an earlier topic), a test date, and a mark scheme. Every question SHALL have a Spanish text, an English subtitle, the sentence builder that answers it, the chunk categories that answer it, and a core or extension marking (see teacher-course-setup).

#### Scenario: Valid course is accepted
- **WHEN** a course is saved with one or more sentence builders, four or five questions with Spanish text and English subtitles, and a test date
- **THEN** the course becomes available to join

#### Scenario: Incomplete course is rejected
- **WHEN** a course is saved with fewer than four or more than five questions or a question missing its English subtitle
- **THEN** the course is not published and the missing items are listed

### Requirement: Feature values replace levels
The mark scheme SHALL be data that each course can tune, made of features, each with a value. A justified opinion SHALL be a starter from the sentence builder, an activity, "porque", "ya que" or "dado que", and a reason. Extra features (for example contrast, frequency or time phrase, "lo hago" or "lo hacemos", another time frame, closing line, a reason beyond "es" plus an adjective, a second justifier) SHALL each carry a value that blends one unit per extra with a weight for how hard it is to learn. An answer's value SHALL be the sum of its features' values, each feature counted once however often it appears, and repeating the frame for more activities SHALL add nothing. The student SHALL NOT see named levels.

#### Scenario: Frame only
- **WHEN** an answer contains a justified opinion and no extra features
- **THEN** its value is the frame's value

#### Scenario: Harder features weigh more
- **WHEN** two answers each have one extra, one a time phrase and the other "lo hago"
- **THEN** the "lo hago" answer has the higher value

#### Scenario: Each feature counts once
- **WHEN** an answer uses two time phrases
- **THEN** the time phrase feature is counted once

### Requirement: Calibration data is editable
Feature definitions (names, the phrases that count, their values and weights), the load-note value, glue words and the teacher's example answers SHALL live in data files that can be edited, added to and versioned without code changes. A course SHALL use the defaults for its sentence builder unless it overrides them, and the rubric SHALL read only from this data. Teacher-supplied example answers SHALL be kept as regression fixtures that the rubric must classify at the level they were written for.

#### Scenario: Adjusting a threshold
- **WHEN** a feature's value is changed in the calibration data
- **THEN** the rubric uses the new value for that course with no code change and the regression fixtures are re-run

### Requirement: Glue-word bank
Each course SHALL carry a glue-word bank of common linking words such as "y", "pero", "también" and "aunque" used inside answers. Glue words SHALL be allowed in swaps and SHALL NOT count as features unless the calibration data names them as one.

#### Scenario: Glue word is allowed but not counted
- **WHEN** an answer uses "pero" between two chunks
- **THEN** the word is accepted and adds no feature

### Requirement: Whole-test targets
The mark scheme SHALL carry whole-test targets of three different tenses across the five answers and two justified opinions across the test. They SHALL be shown to the student as a checklist and SHALL NOT gate any level or be a grade.

#### Scenario: Targets are not gates
- **WHEN** a student's five answers together use two tenses
- **THEN** the checklist shows the tense target as unmet and no answer is lowered a level

### Requirement: Course set-up from a sentence builder
When a sentence builder is uploaded, the app SHALL make one call through the cost router to a small model, at upload time only, to set up the course: it SHALL flag chunk combinations that do not work together (for example a frequency adverb that a verb phrase makes irrelevant), and write model answers for each question, with the features each contains. The call SHALL be given the course's calibration data and teacher examples as context. A generated model answer SHALL be accepted only if the deterministic rubric finds the features it was written to contain, and otherwise SHALL be regenerated once and then marked as missing.

#### Scenario: Model answer must match its features
- **WHEN** the model writes an answer meant to have a contrast feature that the rubric does not find
- **THEN** it is regenerated once and, if still wrong, marked as missing rather than offered

#### Scenario: Set-up call is the only model call
- **WHEN** a student uses the writing stage
- **THEN** no language-model call is made

### Requirement: No grades or levels shown
The app SHALL NOT display or mention grades, marks, numeric levels or named levels anywhere, including any working-towards grade. A student sees only the value of an answer in the in-app currency and, on request, the features that earn it.

#### Scenario: Result of an answer
- **WHEN** a student views the result of any answer
- **THEN** only a value and, on request, named features are shown, with no grade, mark, level or number of levels

### Requirement: Class code joining
Each course SHALL be reachable through a short class code. A student SHALL join by entering the code only.

#### Scenario: Valid code
- **WHEN** a student enters a valid class code
- **THEN** the student sees that course's title, test date and the start of the writing phase

#### Scenario: Unknown code
- **WHEN** a student enters a code that matches no course
- **THEN** the app explains the code was not found and asks them to check it with their teacher

### Requirement: Recycled chunks
Chunks SHALL be taggable as recycled, meaning they recur across topics. Recycled chunks SHALL be offered first when the coach suggests ways to lift an answer.

#### Scenario: Recycled chunk suggested
- **WHEN** the coach suggests an upgrade to an answer
- **THEN** a recycled chunk is chosen over a topic-only chunk when both fit

### Requirement: Photo import of a sentence builder
Where photo import is enabled, a user SHALL be able to photograph a sentence builder and receive an editable draft of its chunks. The draft SHALL NOT be used by anyone until the user confirms it. Identical imports SHALL reuse the earlier result.

#### Scenario: Import reviewed and confirmed
- **WHEN** a user uploads a photo and confirms the extracted chunks
- **THEN** the chunks become the course's sentence builder

#### Scenario: Unreadable photo
- **WHEN** no chunks can be extracted from a photo
- **THEN** the user is told and can retake the photo or type chunks manually
