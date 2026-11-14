## MODIFIED Requirements

### Requirement: Ready threshold
A course SHALL be marked automatised for a student when each question has been answered accurately and within a target response time enough times, with the thresholds configurable. Those answers MAY come from one session, so a student can be marked test-ready in one sitting. The default SHALL NOT require more than one session.

#### Scenario: Ready in one sitting
- **WHEN** every question meets the accuracy and response-time threshold in a single session
- **THEN** the student is shown that they are test-ready
