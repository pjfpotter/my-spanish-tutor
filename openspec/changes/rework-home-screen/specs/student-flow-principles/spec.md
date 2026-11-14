## MODIFIED Requirements

### Requirement: Never hold a capable student back
A student who shows they already know something SHALL be able to skip it and move on at their own pace. No section SHALL force repetition of material the student has proved they know, and no section SHALL make a student wait for another day or session to finish. A student revising at the last minute SHALL be able to complete every step in one sitting.

#### Scenario: Proven knowledge skips a section
- **WHEN** a student has proved they understand all the questions (see learning-diagnostics, Understand quick check)
- **THEN** Understand is marked done and the student is offered the next step

#### Scenario: Fast pace
- **WHEN** a student answers quickly and correctly
- **THEN** the app lets them continue immediately and adds no waiting time

#### Scenario: Last-minute revision
- **WHEN** a student works through every step in a single session
- **THEN** every step can be completed in that session and no message asks them to return another day

### Requirement: Unexplained Spanish is never shown
Every label, button, heading, window title and instruction in the interface SHALL be in English. Spanish SHALL appear only as learning content (a question, an answer, a chunk, a tutor line) and any Spanish that is not itself the thing being learned SHALL carry an English translation. Product names and screen titles SHALL be English, or shown with an English translation.

#### Scenario: Screen title
- **WHEN** a student opens the Understand quick check
- **THEN** its title is in English (for example "Quick check")

#### Scenario: Spanish in the interface
- **WHEN** any Spanish text outside a learning item appears
- **THEN** its English translation is shown with it

#### Scenario: Home window titles
- **WHEN** a student opens the home screen
- **THEN** every window title is in English
