## RENAMED Requirements

- FROM: `### Requirement: Starting-point check`
- TO: `### Requirement: Understand quick check`

## MODIFIED Requirements

### Requirement: Understand quick check
The placement check SHALL be offered inside the Understand phase as an optional quick check, not as a separate window or screen on the home screen, and SHALL be titled in plain English ("Quick check"). It SHALL cover the questions to establish what the student already understands. Each question SHALL be heard once and answered by choosing its meaning. The check SHALL give a positive result on every outcome, SHALL end on a clear results screen with a next step and a way back to the desktop, and SHALL record the results as diagnostics. The check SHALL NOT repeat itself or force a second pass unless the student chooses to retry. Results SHALL be stored in the existing baseline results, so students who already completed the earlier starting-point check keep the questions they proved.

#### Scenario: All correct first time
- **WHEN** a student answers every question correctly on the first try
- **THEN** a clear success message is shown, Understand is marked done, and the student is offered the next step

#### Scenario: Some wrong
- **WHEN** a student answers some questions incorrectly
- **THEN** the results screen shows which they know, names the questions worth a listen, and starts Understand practice on only those questions

#### Scenario: Answered correctly
- **WHEN** a student answers a question correctly
- **THEN** it is clearly marked correct and its listen-again and answer controls are disabled

#### Scenario: Check finished
- **WHEN** the last question is answered
- **THEN** the student sees results and a next step and is never left on a screen with no navigation

#### Scenario: Earlier results kept
- **WHEN** a student completed the earlier starting-point check before this change
- **THEN** the questions they proved are still treated as understood

### Requirement: Skipping by proof
The Understand phase SHALL be skippable, per question, by a student who proves in the quick check that they understand it. Skipped questions SHALL count as understood for the Understand phase and for unlocking Memorise, and SHALL return in later phases as normal. No other phase SHALL offer a test-out.

#### Scenario: Partial skip
- **WHEN** a student proves three of five questions in the quick check
- **THEN** the Understand phase contains only the other two

#### Scenario: Later phases unchanged
- **WHEN** a student skipped a question in Understand
- **THEN** that question still appears in Write, Memorise and Automate as normal
