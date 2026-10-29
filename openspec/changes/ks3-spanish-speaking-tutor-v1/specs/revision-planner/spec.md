# Spec Delta

## Purpose

Helps students manage their one week of revision by tying every session to the test date, showing readiness, and suggesting realistic short sessions.

## ADDED Requirements

### Requirement: Test countdown
The home screen SHALL show days remaining to the course's test date and the current phase.

#### Scenario: Six days left
- **WHEN** the test is six days away
- **THEN** the home screen states six days left

### Requirement: Readiness meter
The app SHALL show a readiness measure from zero to one hundred percent computed from the questions mastered, answers memorised and questions automatised, and SHALL show what moves it next.

#### Scenario: Meter explains itself
- **WHEN** a student views the meter
- **THEN** it names the next action that will raise it

### Requirement: Personal session plan
Given the student's available minutes and days left, the app SHALL propose a short plan of sessions, each under a stated duration, and SHALL adjust it when sessions are missed.

#### Scenario: Missed day
- **WHEN** a planned session is skipped
- **THEN** the plan is redistributed across the remaining days without alarming language

### Requirement: Reminders
Where the device allows notifications, the app SHALL offer one optional daily reminder at a time the student chooses, and SHALL send nothing without explicit opt-in.

#### Scenario: Opt-in only
- **WHEN** a student has not enabled reminders
- **THEN** no notification is sent

### Requirement: Late starters
If few days remain, the plan SHALL shorten phases and prioritise automatisation of the answers already written.

#### Scenario: Two days left
- **WHEN** a student starts with two days to go
- **THEN** the plan focuses on writing short answers and rapid recall

### Requirement: After the test date
After the test date the app SHALL stop countdown messaging, show a short reflection prompt, and offer the course for light review.

#### Scenario: Test passed
- **WHEN** the test date has passed
- **THEN** the home screen no longer shows a countdown
