# Spec Delta

## Purpose

Rules that every student-facing screen follows so the app feels fast, safe and never traps a student. They come from the first round of user testing (9 Nov 2026) and apply to all phases.

## ADDED Requirements

### Requirement: Never hold a capable student back
A student who shows they already know something SHALL be able to skip it and move on at their own pace. No section SHALL force repetition of material the student has proved they know.

#### Scenario: Proven knowledge skips a section
- **WHEN** a student has proved they understand all the questions (see learning-diagnostics, Starting point)
- **THEN** the comprehension memorising stage is skipped and the student is taken to the next stage

#### Scenario: Fast pace
- **WHEN** a student answers quickly and correctly
- **THEN** the app lets them continue immediately and adds no waiting time

### Requirement: Always a way out
Every screen inside a section, lesson or round SHALL offer a visible way back to the desktop, and leaving SHALL keep the progress already earned. Leaving SHALL ask for confirmation only if progress would otherwise be lost.

#### Scenario: Stopping suddenly
- **WHEN** a student starts a section and then taps the exit control
- **THEN** they return to the desktop and attempts already made are kept

#### Scenario: Forgotten something
- **WHEN** a student needs to go back one step
- **THEN** a back control returns them to the previous step without losing the current answer

### Requirement: No dead ends
Every screen SHALL show a next action. A failure (a service unavailable, recognition not working, a missing clip) SHALL show what happened in plain English and offer a way forward, and a section SHALL never end on a screen with no navigation and no feedback.

#### Scenario: Listening unavailable
- **WHEN** the app cannot listen on a device
- **THEN** the student is told in plain English, offered a retry and a way to continue without speaking, and can leave

#### Scenario: Section finished
- **WHEN** a student finishes a section
- **THEN** a completion screen shows what they achieved and offers the next step and a way back to the desktop

### Requirement: One screen, nothing below the fold in practice
Practice screens SHALL fit the visible phone viewport with no scrolling needed to see the prompt, the answer area, the feedback or the main action. The tutor SHALL be compact so it never pushes content below the fold.

#### Scenario: Practice on a small phone
- **WHEN** a practice screen is shown on a 360 by 640 pixel viewport
- **THEN** the prompt, the answer area, the feedback panel and the continue control are all visible without scrolling

### Requirement: Unexplained Spanish is never shown
Every label, button, heading and instruction in the interface SHALL be in English. Spanish SHALL appear only as learning content (a question, an answer, a chunk, a tutor line) and any Spanish that is not itself the thing being learned SHALL carry an English translation. Product names and screen titles such as "Punto de partida" SHALL be replaced by English or shown with an English translation.

#### Scenario: Screen title
- **WHEN** a student opens the placement check
- **THEN** its title is in English (for example "Find your starting point")

#### Scenario: Spanish in the interface
- **WHEN** any Spanish text outside a learning item appears
- **THEN** its English translation is shown with it

### Requirement: Positive feedback on every outcome
Every completed item SHALL give immediate feedback that names the outcome. A correct answer SHALL be clearly marked correct, and a wrong or skipped answer SHALL show the correct answer and one thing to fix, in the product's encouraging tone, without any penalty.

#### Scenario: All correct
- **WHEN** a student answers every item in a check correctly
- **THEN** a clear success message is shown and the check ends with a next step

### Requirement: Disable controls that no longer apply
Controls that are no longer meaningful (for example "listen again" after a correct answer) SHALL be disabled or hidden.

#### Scenario: After a correct answer
- **WHEN** a question has been answered correctly
- **THEN** replay and answer controls for that question are disabled

### Requirement: Little and often
The app SHALL tell students once, in plain English and without a plan or timings, that several short sessions work better than one long one. It SHALL NOT assign session lengths or per-section durations.

#### Scenario: Message shown
- **WHEN** a student finishes a session
- **THEN** a short line encourages coming back for another short session
