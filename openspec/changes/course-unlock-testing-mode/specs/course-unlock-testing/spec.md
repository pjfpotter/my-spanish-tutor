# Spec Delta

## Purpose

Lets a tester try every phase of the app in one short session by joining a separate testing course, without weakening the gated order that real classes follow.

## ADDED Requirements

### Requirement: Unlock-all course
A course MAY be marked as an unlock-all course. Every student who has joined an unlock-all course SHALL see all four phases open from their first visit, whatever their progress.

#### Scenario: Fresh tester
- **WHEN** a student with no progress joins an unlock-all course and opens the desktop
- **THEN** write, understand, memorise and automate are all open

#### Scenario: Direct address
- **WHEN** that student types the address of a phase that would normally be locked
- **THEN** the phase opens instead of sending them back to the desktop

### Requirement: Real courses stay gated
A course SHALL NOT be an unlock-all course unless its owner set that when the course was seeded. No student, address, setting or on-screen control SHALL be able to turn the unlock on for a course or a profile. Courses created before this feature SHALL stay gated.

#### Scenario: Real class code
- **WHEN** a student joins with the real class code
- **THEN** memorise stays locked until all five answers are confirmed and all five questions are mastered, and automate stays locked until all five answers are memorised

#### Scenario: Guessing at the address
- **WHEN** a student of a gated course adds a query value or a header that names an unlock
- **THEN** nothing changes and the locked phases stay locked

### Requirement: One gate everywhere
The open or locked state of each phase SHALL be the same on the desktop, on the phase page reached by its address, and on any other screen that shows the phases. For a student's course, the unlock-all flag SHALL be read in one place.

#### Scenario: Consistent state
- **WHEN** a student of an unlock-all course views the desktop and then opens each phase
- **THEN** every phase shown as open opens, and none redirects back to the desktop

### Requirement: Joining the testing course
A student SHALL join an unlock-all course exactly as they join any other course: by class code, a nickname and no personal data. The testing course SHALL carry the same questions, sentence-builder chunks and model answers as the real course so that testers see the real content.

#### Scenario: Join by code
- **WHEN** a tester enters the testing course's class code
- **THEN** they are shown the course title and test date, pick a nickname and reach the desktop with all phases open

#### Scenario: Same content
- **WHEN** a tester of the testing course hears a question
- **THEN** it is one of the real course's five questions with the same audio

### Requirement: Practising without written answers
In an unlock-all course, when a student has not confirmed an answer to a question, memorisation and automation SHALL practise the course's model answer for that question in its place. The model answer SHALL NOT be stored as the student's answer or counted as a confirmed answer.

#### Scenario: Memorise straight away
- **WHEN** a tester with no written answers opens memorisation in an unlock-all course
- **THEN** they practise each question's model answer and the screen is never empty or broken

#### Scenario: Timed round straight away
- **WHEN** a tester with no written answers starts a timed round in an unlock-all course
- **THEN** the round runs on the model answers

#### Scenario: Own answer wins
- **WHEN** a tester has confirmed their own answer to a question
- **THEN** memorisation and automation use that answer for the question, not the model answer

### Requirement: Testing course is labelled
An unlock-all course SHALL show a plain label on the desktop saying that every step is open for testing, so that a tester or a student who joined the wrong code can tell.

#### Scenario: Label shown
- **WHEN** a student of an unlock-all course opens the desktop
- **THEN** the label is visible, in text and not in colour alone

#### Scenario: No label elsewhere
- **WHEN** a student of a gated course opens the desktop
- **THEN** no testing label is shown

### Requirement: Testing keeps the rules
Unlocking SHALL change only which phases are open. Scores, mastery, coins, streaks and time windows SHALL be recorded and calculated exactly as in a gated course, and the privacy rules SHALL apply unchanged: no names, emails or audio are stored, and a tester SHALL be able to delete everything their profile holds.

#### Scenario: Attempts count
- **WHEN** a tester answers in a timed round
- **THEN** the attempt is recorded and counts towards their own mastery, coins and streak like any other attempt

#### Scenario: Delete everything
- **WHEN** a tester uses delete-everything
- **THEN** their profile and everything attached to it are removed, as for any student
