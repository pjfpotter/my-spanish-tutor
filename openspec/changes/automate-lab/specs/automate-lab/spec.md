# Spec Delta

## Purpose

Lets the owner run the timed-answer phase repeatedly from a known starting point, as different kinds of student, and capture notes that carry the numbers behind them.

## ADDED Requirements

### Requirement: Isolated lab page
The app SHALL provide a lab page at `/lab/automate` that runs the real timed round (microphone, transcription, scoring, response window, hints, chunk ladder, expert mode and rank) on pre-written answers. The page SHALL NOT be linked from the student desktop or the phase pages and SHALL ask search engines not to index it.

#### Scenario: Opening the lab
- **WHEN** someone opens `/lab/automate`
- **THEN** they can start a round on a fake student's answers without joining a class or having done any earlier phase

#### Scenario: Not on the student path
- **WHEN** a student uses the desktop
- **THEN** no link or button leads to the lab

### Requirement: Pre-written fake students
The lab SHALL offer at least three fake students with five pre-written answers each, of different lengths: short, mixed and long. The answers SHALL come from the course's own model answers so the words and chunks are real. The chosen student SHALL be selectable on the page and by address.

#### Scenario: Choosing by address
- **WHEN** the address includes `?student=long`
- **THEN** the lab opens with the long-answers student selected

#### Scenario: Different answers
- **WHEN** the short and the long student are run
- **THEN** their answers have different numbers of chunks, and at least one question has a different number of ladder levels (the ladder has at most four levels, so only a very short answer has fewer)

### Requirement: Nothing is saved to the server
A lab run SHALL NOT create a profile or send an attempt, an answer, coins or audio to the server. Its progress (chunk level, response window, personal bests, round log and notes) SHALL live only on the device, under keys that do not overlap the real phase's keys.

#### Scenario: A round in the lab
- **WHEN** a round is played in the lab
- **THEN** no request to the attempt, response or profile routes is made

#### Scenario: Real phase untouched
- **WHEN** a student's real timed round is played after the lab on the same device
- **THEN** its ladder and personal bests are unaffected by the lab

### Requirement: Start again
The lab SHALL let the tester clear the lab's own state and begin again from the first level in one action, and SHALL accept address values to choose the starting level and expert mode.

#### Scenario: Start again
- **WHEN** the tester presses Start again
- **THEN** the chunk level, response window and personal bests return to their starting values, and the notes and log are kept unless cleared separately

#### Scenario: Skipping setup
- **WHEN** the address includes `?startAt=2&expert=1`
- **THEN** the round setup shows those choices already made

### Requirement: Notes with context
The lab SHALL keep a notes panel under the round. Adding a note SHALL stamp it with the fake student, the question, the level, the response window, the last response time, the last accuracy and whether a hint or a blank occurred, and SHALL accept one-tap tags and free text. The lab SHALL also keep a log of every attempt with those figures.

#### Scenario: Adding a note
- **WHEN** the tester adds a note while a question is on screen
- **THEN** the note records that question and its figures with the tester's text

#### Scenario: Log without typing
- **WHEN** the tester plays a round and writes no notes
- **THEN** every attempt still appears in the log

### Requirement: Copy notes out
The lab SHALL provide one action that copies all notes and the attempt log as plain text, and an action that clears them. Notes SHALL never be sent anywhere by the app.

#### Scenario: Copying
- **WHEN** the tester presses Copy notes
- **THEN** the clipboard holds the device summary, the notes and the log as readable plain text

#### Scenario: Cost shown
- **WHEN** the lab page is shown
- **THEN** it says that real transcription is used and paid for through the cost router
