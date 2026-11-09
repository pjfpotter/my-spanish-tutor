# Spec Delta

## Purpose

Scope note (9 Nov 2026): the developer-run flow and the course shape are version one. Photo scan, teacher edits and the teacher-facing page are stretch.

Defines how a teacher plans a speaking test and gets it into the app as a course with a class code, where each step runs, and which calls it makes. In version one the setup is done by the developer on the teacher's behalf; the teacher-run page is specified as the target so the flow is understood end to end. A teacher dashboard for coursework submission is out of scope and left for later.

## ADDED Requirements

### Requirement: Teacher flow steps
Setting up a course SHALL follow these steps: (1) plan the test: title, test date, one or more sentence builders and the test questions; (2) save the draft; (3) run the set-up call that flags bad chunk combinations and writes model answers; (4) review the result; (5) publish, which builds the audio; (6) share the class code, and keep the owner link.

#### Scenario: Full flow
- **WHEN** a teacher completes the steps in order
- **THEN** the course has a class code and an owner link and students can join

### Requirement: Where each step runs
In version one steps 1, 2 and 5 SHALL run on the developer's machine through the seed and audio build scripts, and steps 3 and 4 SHALL run through the same scripts using the cost router. The system SHALL record which step each course has reached. The teacher-facing page for the same steps SHALL be a later increment and SHALL call the same server functions as the scripts, so the two paths do not diverge.

#### Scenario: Developer-run course
- **WHEN** the developer runs the seed script with a teacher's materials
- **THEN** the course is saved as a draft and its status shows which step is next

### Requirement: More than one sentence builder
A course SHALL support one or more sentence builders. Each question SHALL name the sentence builder whose chunks answer it. Chunks, calibration data and model answers SHALL be scoped to their sentence builder.

#### Scenario: Two builders
- **WHEN** a course has a house sentence builder and a bedroom sentence builder
- **THEN** each question uses only its own builder's chunks for swaps and model answers

### Requirement: Four or five questions
A course SHALL have four or five test questions. Four is allowed because some schools run shorter tests. Whole-test checklists and readiness SHALL scale to the number of questions.

#### Scenario: Four-question test
- **WHEN** a course is saved with four questions
- **THEN** it is accepted and readiness is computed from four

### Requirement: Core and extension questions
Each question SHALL be marked core (for everyone) or extension (for higher-ability students). Readiness SHALL count only core questions. Extension questions SHALL be offered to all students as optional stretch and never block progress.

#### Scenario: Extension question
- **WHEN** a course includes an extension question
- **THEN** students may attempt it, and finishing the core questions still marks the student test-ready

### Requirement: Draft, review and publish
A course SHALL be a draft until published. The set-up call SHALL only run on a draft, only through the cost router, and its output SHALL be shown for review before publishing when a reviewer is available. Publishing SHALL be blocked while required items are missing.

#### Scenario: Missing audio
- **WHEN** a question has no audio
- **THEN** the course cannot be published and the missing items are listed

### Requirement: Calls made by the teacher flow
The flow SHALL use these calls: saving a draft (database write), the set-up call (one model call through the cost router per sentence builder upload), the audio build (one speech-synthesis call per new question and speed, cached by content hash), and publish (database write). No call SHALL happen when a student uses the app other than those in the student specs.

#### Scenario: Re-publish unchanged
- **WHEN** a teacher publishes again with no text changes
- **THEN** no new set-up or speech-synthesis call is made

### Requirement: Owner link is the credential
There SHALL be no teacher accounts. The owner link SHALL be the only credential and SHALL be shown once at course creation, with a way to regenerate it.

#### Scenario: Lost owner link
- **WHEN** the owner link is lost
- **THEN** the developer can regenerate it and the old link stops working

### Requirement: No coursework dashboard yet
The overview SHALL stay read-only and SHALL NOT collect or grade coursework submissions. A submission dashboard is parked for a later change.

#### Scenario: Request for submissions
- **WHEN** a teacher asks to see student answers
- **THEN** only aggregate progress is available

### Requirement: Scan to start (stretch)
In a later increment, a teacher SHALL start a course by scanning or photographing a sentence builder, which produces an editable draft of chunks, and the set-up call SHALL then write the model answers. The teacher SHALL be able to review the course details easily and edit them. Nothing SHALL be used by students until the teacher confirms.

#### Scenario: Scan and review
- **WHEN** a teacher scans a sentence builder
- **THEN** an editable draft is shown for review and confirmation

### Requirement: Safe edits (stretch, with the teacher-facing flow)
Once teachers can edit course content, edited text SHALL be screened before publishing: length limits, a blocklist for inappropriate language, only text from the draft's chunk and question fields, and a check that every word is a valid Spanish or English word for the course. Flagged edits SHALL block publishing until corrected. A course SHALL only be visible to those with its class code, and the developer SHALL be able to disable a course.

#### Scenario: Inappropriate edit
- **WHEN** a teacher edit contains a blocklisted word
- **THEN** publishing is blocked and the field is highlighted

### Requirement: Photo scan is a stretch
Photo scan of a sentence builder and the teacher-facing flow are stretch work and SHALL NOT block version one, in which the developer sets courses up. When built, scan SHALL fall back to typing chunks by hand when a scan fails.

#### Scenario: Unreadable scan
- **WHEN** the scan yields no chunks
- **THEN** the teacher can retake it or type the chunks
