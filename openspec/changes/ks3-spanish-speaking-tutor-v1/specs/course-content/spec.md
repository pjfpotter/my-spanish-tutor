# Spec Delta

## Purpose

Defines the course: a sentence builder, its test questions and a simplified mark scheme, and how a class reaches it. A course is the unit of content the whole app works from.

## ADDED Requirements

### Requirement: Course structure
A course SHALL contain one sentence builder made of chunks (Spanish text with an English gloss, a category and feature tags), exactly five test questions (four on the current topic, one recycled from an earlier topic), a test date, and a mark scheme. Every question SHALL have a Spanish text, an English subtitle and the chunk categories that answer it.

#### Scenario: Valid course is accepted
- **WHEN** a course is saved with a sentence builder, five questions with Spanish text and English subtitles, and a test date
- **THEN** the course becomes available to join

#### Scenario: Incomplete course is rejected
- **WHEN** a course is saved with fewer or more than five questions or a question missing its English subtitle
- **THEN** the course is not published and the missing items are listed

### Requirement: Three levels
The mark scheme SHALL be data that each course can tune, with three levels shown to the student by name only: Rock solid, Stepping out and Showing off. The names SHALL describe what an answer does, not rank it. A justified opinion SHALL be a starter from the sentence builder, an activity, "porque", "ya que" or "dado que", and a reason. Rock solid SHALL be at least one justified opinion. Stepping out SHALL be a justified opinion plus at least one extra feature. Showing off SHALL be a justified opinion plus at least four extra features, including at least two hard features. Repeating the frame for more activities SHALL add nothing. Each feature SHALL count once however often it appears.

#### Scenario: Frame reaches Rock solid
- **WHEN** an answer contains a justified opinion and no extra features
- **THEN** it is Rock solid

#### Scenario: One extra reaches Stepping out
- **WHEN** an answer contains a justified opinion and one extra feature
- **THEN** it is Stepping out

#### Scenario: Hard features gate Showing off
- **WHEN** an answer has five extras but only one hard feature
- **THEN** it is Stepping out, not Showing off

### Requirement: Calibration data is editable
Feature definitions (names, the phrases that count, which are hard), thresholds, level names, glue words and the teacher's example answers SHALL live in data files that can be edited, added to and versioned without code changes. A course SHALL use the defaults for its sentence builder unless it overrides them, and the rubric SHALL read only from this data. Teacher-supplied example answers SHALL be kept as regression fixtures that the rubric must classify at the level they were written for.

#### Scenario: Adjusting a threshold
- **WHEN** the Stepping out threshold is changed in the calibration data
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
When a sentence builder is uploaded, the app SHALL make one call through the cost router to a small model, at upload time only, to set up the course: it SHALL flag chunk combinations that do not work together (for example a frequency adverb that a verb phrase makes irrelevant), and write model answers for each question at each level. The call SHALL be given the course's calibration data and teacher examples as context. A generated model answer SHALL be accepted only if the deterministic rubric places it at the level it was written for, and otherwise SHALL be regenerated once and then marked as missing.

#### Scenario: Model answer must match its level
- **WHEN** the model writes a Showing off answer that the rubric scores as Stepping out
- **THEN** it is regenerated once and, if still wrong, marked as missing rather than offered

#### Scenario: Set-up call is the only model call
- **WHEN** a student uses the writing stage
- **THEN** no language-model call is made

### Requirement: No grades shown
The app SHALL NOT display or mention grades, marks or numeric levels anywhere, including any working-towards grade. Level names are the only thing a student sees, and they are never presented as a ladder or a ranking.

#### Scenario: Levels are shown by name, never as grades
- **WHEN** a student views the result of any answer
- **THEN** the level is one of Rock solid, Stepping out or Showing off, and no grade, mark or number is displayed

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
