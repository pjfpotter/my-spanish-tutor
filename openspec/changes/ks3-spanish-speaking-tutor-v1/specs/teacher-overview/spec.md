# Spec Delta

## Purpose

Shows a teacher or head of department what the app learns about a class so the product's value is visible, without requiring teacher accounts in this version.

## ADDED Requirements

### Requirement: Read-only class summary
A course owner SHALL be able to open a read-only overview for a class code showing counts of students who have started, how many are at each phase, and the average readiness.

#### Scenario: Overview opened
- **WHEN** the owner opens the overview with the class's owner link
- **THEN** it shows the number of students per phase and the class readiness

### Requirement: Owner link access
The overview SHALL be reachable only through an unguessable owner link and SHALL never be linked from the student app.

#### Scenario: Student guesses
- **WHEN** someone opens the overview with the student class code
- **THEN** no overview is shown

### Requirement: Anonymous learners
The overview SHALL identify students only by nickname and SHALL NOT show any data that could identify a child outside the class.

#### Scenario: Student row
- **WHEN** a student appears in the overview
- **THEN** only the nickname and progress are shown

### Requirement: Class hotspots
The overview SHALL list the chunks and questions that cause the most failures across the class and the most common cause tags.

#### Scenario: Shared trouble
- **WHEN** many students miss the same chunk
- **THEN** it appears at the top of the hotspots list

### Requirement: Demonstration data
For demonstrations, the overview SHALL be able to load clearly labelled sample data, kept separate from real students.

#### Scenario: Demo mode
- **WHEN** demo data is loaded
- **THEN** the overview marks every figure as sample data
