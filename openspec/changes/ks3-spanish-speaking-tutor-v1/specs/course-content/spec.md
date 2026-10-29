# Spec Delta

## Purpose

Defines the course: a sentence builder, its test questions and a simplified mark scheme, and how a class reaches it. A course is the unit of content the whole app works from.

## ADDED Requirements

### Requirement: Course structure
A course SHALL contain one sentence builder made of chunks (Spanish text with an English gloss and a category), exactly five test questions (four on the current topic, one recycled from an earlier topic), a test date, and a mark scheme. Every question SHALL have a Spanish text and an English subtitle.

#### Scenario: Valid course is accepted
- **WHEN** a course is saved with a sentence builder, five questions with Spanish text and English subtitles, and a test date
- **THEN** the course becomes available to join

#### Scenario: Incomplete course is rejected
- **WHEN** a course is saved with fewer or more than five questions or a question missing its English subtitle
- **THEN** the course is not published and the missing items are listed

### Requirement: Simplified mark scheme
The mark scheme SHALL define three levels, survival, good and showing off, each as a list of countable features such as justified opinion, connective, sequencer, adjective range, verb tenses used, and an idiom. It SHALL NOT produce or display a numeric grade.

#### Scenario: Levels are shown, not grades
- **WHEN** a student views the result of any answer
- **THEN** the level is one of survival, good or showing off and no numeric mark is displayed

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
