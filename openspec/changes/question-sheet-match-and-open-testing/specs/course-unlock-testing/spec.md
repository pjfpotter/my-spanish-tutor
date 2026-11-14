# Spec Delta

## Purpose

Extends the testing course so a tester can reach any part of a phase, not only any phase.

## ADDED Requirements

### Requirement: Gates inside the phases are open too
In an unlock-all course, the gates inside open phases SHALL also be lifted: the expert-mode switch in the timed round SHALL be available before every answer reaches its top level, any memorise lesson of any answer SHALL be openable in any order, and the write screen SHALL let the student move on from a question without confirming it. A gated course SHALL keep every one of these gates.

#### Scenario: Expert mode at once
- **WHEN** a tester opens the timed round before any answer is at its top level
- **THEN** the expert-mode switch is available

#### Scenario: Any lesson
- **WHEN** a tester opens the memorise list for an answer they have not started
- **THEN** they can open its final check without doing the lessons before it

#### Scenario: Skipping a question
- **WHEN** a tester is on a write question they do not want to build
- **THEN** they can go to the next question, and memorise and the timed round practise that question's model answer

#### Scenario: Real class unchanged
- **WHEN** a student of a gated course opens the same screens
- **THEN** the expert switch stays locked until every answer is at its top level, lessons open in order, and a question can only be passed by confirming it

### Requirement: A testing deployment is a separate deployment
A deployment used for testing SHALL be a separate deployment with its own database branch, seeded with the testing course, and SHALL NOT share a database with the real class's deployment. The documentation SHALL say how to stand one up.

#### Scenario: Separate data
- **WHEN** a tester creates a profile on the testing deployment
- **THEN** it does not appear in the real class's database
