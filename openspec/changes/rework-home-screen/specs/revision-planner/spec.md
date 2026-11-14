## MODIFIED Requirements

### Requirement: Readiness meter
The app SHALL show a readiness measure from zero to one hundred percent computed from the questions mastered, answers memorised and questions automatised. What the student should do next SHALL be shown in the "What's next?" window (see home-screen), not on the meter.

#### Scenario: Meter shown
- **WHEN** a student views the speaking-test window
- **THEN** it shows the readiness measure and does not repeat the next action

### Requirement: Late starters
If few days remain, the app SHALL recommend, in the "What's next?" window, the fastest route: choosing short answers and rapid recall of the answers already written.

#### Scenario: Two days left
- **WHEN** a student starts with two days to go
- **THEN** the "What's next?" window points to writing short answers and rapid recall

## REMOVED Requirements

### Requirement: Reminders
**Reason**: A daily reminder is useful only if fully developed (including delivery when the app is closed), and it is not essential to version one. The current version only fires while the app is open.
**Migration**: Delete the reminder window, its notification code and the locally stored reminder preferences. Nothing is stored on the server, so there is no data to migrate. A reminder MAY be reconsidered in a later version as a complete feature.
