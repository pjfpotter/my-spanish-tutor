# Spec Delta

## Purpose

Defines how a course holds several sentence builders, how each test question is assigned at most one of them, and what the write screen, the sign-off and the setup checks do as a result. It restates and completes "More than one sentence builder" (`teacher-course-setup`), "Question's own sentence builder" (`answer-writing-coach`) and the matching rule of `question-sheet-match`, which the first build collapsed to one sheet per course.

## ADDED Requirements

### Requirement: A course holds one or more sentence builders
A course SHALL hold a list of one or more sentence builders. Each builder SHALL be the re-typeset sheet and the checked interpretation of one uploaded document, kept as uploaded. A course with no builder SHALL NOT be created.

#### Scenario: Five builders
- **WHEN** a course is created with five uploaded sentence builders
- **THEN** all five are kept, each with its own sheet and interpretation

#### Scenario: No builder
- **WHEN** a course is created with no sentence builder
- **THEN** it is refused and the missing builder is named

### Requirement: A question has at most one builder
Each test question SHALL name at most one of its course's builders. A question SHALL NOT name a builder that is not in its course.

#### Scenario: A question names a builder
- **WHEN** a question names the free-time builder
- **THEN** the write screen for that question shows only the free-time builder's sheet

#### Scenario: A builder from elsewhere
- **WHEN** a question names a builder that is not in its course
- **THEN** the course is refused and the question is named

### Requirement: One builder may serve several questions
Several questions of a course MAY name the same builder. Each of them SHALL be written, saved and signed off on its own.

#### Scenario: Two questions, one builder
- **WHEN** two questions name the same builder
- **THEN** each shows that builder's sheet and a student answers each separately

### Requirement: A question with no builder has none
A question that names no builder SHALL show that it has no sentence builder yet. It SHALL NOT be answered from any other question's builder, it SHALL NOT be confirmable on the write screen, and nothing a student sends SHALL save a sheet answer for it. Memorise and automate practise its model answer as for any answer not written on a builder.

#### Scenario: No builder
- **WHEN** a student opens a question that names no builder
- **THEN** the screen says there is no sentence builder for it yet and shows no sheet

#### Scenario: Server refuses
- **WHEN** a request tries to save a sheet answer for a question that names no builder
- **THEN** the server refuses it and nothing is saved

### Requirement: The assigned builder decides what is offered
For a question that names a builder, the write screen, typed-text reading and the server's sign-off SHALL use only that builder's chunks and rules. A chunk of another builder SHALL NOT be offered, accepted or counted, and a saved selection that holds one SHALL be refused.

#### Scenario: Another builder's chunk
- **WHEN** a request for a film question includes a chunk from the bedroom builder
- **THEN** the server refuses the answer

### Requirement: A question is linked to a part of its builder
A question that names a builder SHALL also be linked to one of that builder's own questions (a section of the sheet, such as its present-tense half), and the link SHALL be stored with the question. The question SHALL take the parts it may use and the parts it requires from the linked builder question. A builder with one question or none needs no link, and the question uses the whole builder with its default required parts.

#### Scenario: Present half and past half
- **WHEN** one builder has a present-tense half and a past-tense half, and two questions name it and link one half each
- **THEN** each question offers only its own half

#### Scenario: Builder with one question
- **WHEN** a question names a builder that has one question and no link
- **THEN** the whole builder is offered and its default required parts apply

### Requirement: Links are filled in when the text matches
When a question names a builder and gives no link, the system SHALL link it to the builder question whose Spanish text is the same, ignoring case, accents and punctuation, and SHALL store that link. An explicit link in the course file SHALL win over a text match.

#### Scenario: Same wording
- **WHEN** a question's text equals a builder question's text and no link is given
- **THEN** the link is stored and the question offers that builder question's parts

#### Scenario: Explicit link
- **WHEN** a question gives a link to a builder question whose text is worded differently
- **THEN** the explicit link is used

### Requirement: An ambiguous link stops setup
When a question names a builder that has several questions, gives no link and matches none by text, setup SHALL stop, name the question and list the builder's questions to choose from. Nothing SHALL be guessed. A link that points at no builder question SHALL be refused in the same way.

#### Scenario: Two halves, no match
- **WHEN** a question names a builder with a present half and a past half and its text matches neither
- **THEN** the course is refused, the question is named, and both halves are listed

#### Scenario: Bad link
- **WHEN** a question links to a builder question that does not exist
- **THEN** the course is refused and the question is named

### Requirement: Each builder has its own calibration
Each builder SHALL carry its own calibration data (frame starters and justifiers, features, tenses, glue words and cognates). The value of an answer, the writing coach's feedback and the memorise practice text for a question SHALL use the calibration of that question's builder. A question with no builder SHALL use the course's calibration.

#### Scenario: Two builders, two calibrations
- **WHEN** a film answer and a bedroom answer are scored
- **THEN** each is scored with its own builder's calibration, and a phrase that is only in the other builder earns nothing

### Requirement: Whole-test targets stay on the course
The whole-test targets (how many tenses and justified opinions the test needs) SHALL stay on the course, and the whole-test checklist SHALL count each answer's tenses and justified opinions against its own builder's phrases.

#### Scenario: Whole-test checklist
- **WHEN** a student has answers on two builders
- **THEN** the checklist counts the tenses and justified opinions found in each answer using that answer's builder, against the course's targets

### Requirement: Setup reports questions without a builder
When a course is seeded, saved or published, the system SHALL list each question that names no builder. This SHALL be a notice and SHALL NOT block seeding or publishing, because a teacher may not have a sheet for every question yet.

#### Scenario: One question has no builder
- **WHEN** a course with five questions and four builders assigned is seeded
- **THEN** the report names the fifth question and the course is still created

### Requirement: Existing courses keep working
Courses created before this change SHALL be carried over so that a student sees no difference: a course's single sheet becomes its one builder, and each question that matched a sheet question by text is assigned to it and linked to that sheet question. Questions that matched nothing stay without a builder. Saved student answers SHALL stay valid.

#### Scenario: Existing course
- **WHEN** the change is applied to a course with one sheet and five questions, one of which matched
- **THEN** the course has one builder, the matched question names it and is linked to its sheet question, the other four name none, and a saved answer still opens as it was

### Requirement: Builders hold no student data
A builder SHALL hold only teacher content: the sheet and its interpretation. Nothing a student chose or typed SHALL be written into it.

#### Scenario: A student answers
- **WHEN** a student confirms an answer
- **THEN** the builder rows are unchanged
