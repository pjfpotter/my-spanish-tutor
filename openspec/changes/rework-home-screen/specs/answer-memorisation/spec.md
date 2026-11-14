## MODIFIED Requirements

### Requirement: Memorisation mastery
An answer SHALL count as memorised once it reaches the accuracy threshold at least three times, with the thresholds configurable. The attempts MAY all come from one session, so a student revising at the last minute can finish in one sitting. The app SHALL NOT tell a student to come back another day in order to finish. The default SHALL NOT require more than one session.

#### Scenario: Memorised in one sitting
- **WHEN** a student reaches the threshold on three attempts in one session
- **THEN** the answer counts as memorised

#### Scenario: No wait message
- **WHEN** a student has memorised every answer they were practising in a session
- **THEN** no message asks them to return on another day
