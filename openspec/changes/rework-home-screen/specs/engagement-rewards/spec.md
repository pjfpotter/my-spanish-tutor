## MODIFIED Requirements

### Requirement: Response-time rank
Students SHALL have a rank that rises as their recent average response time falls, shown in the Automate step where it is earned. The app SHALL NOT keep a separate page of the student's own attempt history.

#### Scenario: Faster average
- **WHEN** a student's average response time drops below a rank boundary
- **THEN** their rank increases and the change is celebrated

### Requirement: Progress shown in the world
Phase progress SHALL be shown on the home screen in the "What I can do" window (see home-screen) without changing the gated order. Each question SHALL show its progress through the four steps as plain-English ticks that rise as the student's results rise, locked phases SHALL be shown as locked with the reason given in words, and the response-time rank SHALL be shown as a ladder of named steps.

#### Scenario: Mastery rises
- **WHEN** a student's mastery of a question's step increases
- **THEN** that tick moves from "Not yet" to "Getting there" or from "Getting there" to "Got it"

#### Scenario: Locked phase
- **WHEN** a student has not yet unlocked a phase
- **THEN** it appears as locked with a reason in words and cannot be opened

### Requirement: No public ranking
The app SHALL NOT rank students against named peers. Competition SHALL be against one's own earlier results. The app SHALL NOT show class-wide goals or totals in version one.

#### Scenario: No class total
- **WHEN** a student uses any screen
- **THEN** no class-wide total, goal or position is shown
