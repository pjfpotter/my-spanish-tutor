## RENAMED Requirements

- FROM: `### Requirement: Mastery across sessions`
- TO: `### Requirement: Mastery`

## MODIFIED Requirements

### Requirement: Mastery
A question SHALL count as mastered once it is answered correctly, without help, at least three times, with the threshold configurable. The successes MAY come from a single sitting, so a student revising at the last minute can finish in one session. A student SHALL NOT advance to the next phase until all questions are mastered. The mastery rule MAY be configured to also ask for more than one session, but the default SHALL NOT.

#### Scenario: Single-session success
- **WHEN** a student answers a question correctly three times in one session
- **THEN** it is mastered and is not scheduled for a later session

#### Scenario: Help used
- **WHEN** a student reveals the text before answering
- **THEN** that attempt does not count toward mastery

### Requirement: Skip by proof
A student SHALL be offered an optional quick check at the start of this phase to prove which questions they already understand. Each question SHALL be heard once and answered by choosing its meaning. A question answered correctly SHALL be treated as understood and SHALL be skipped in this phase. A question answered incorrectly SHALL go into normal practice, and the results screen SHALL describe those as worth a listen, not as failures. The check SHALL be skippable, SHALL NOT repeat unless the student chooses to retry, and SHALL end on a clear results screen with a next step. The student SHALL also be able to try a question first to skip it at any time. There SHALL be no equivalent test-out for memorising.

#### Scenario: Quick check offered
- **WHEN** a student opens Understand for the first time
- **THEN** they are offered "Already know these? Try the quick check" and a normal "Start learning" choice

#### Scenario: Known questions
- **WHEN** a student answers three of five questions correctly in the quick check
- **THEN** those three are treated as understood and Understand practice contains only the other two

#### Scenario: All known
- **WHEN** a student answers every question correctly in the quick check
- **THEN** a clear success message is shown, Understand is marked done, and the student is offered the next step

#### Scenario: Some wrong
- **WHEN** a student answers a question incorrectly in the quick check
- **THEN** the results screen names it as worth a listen and starts practice on it, with no penalty

#### Scenario: No memorise test-out
- **WHEN** a student opens Memorise
- **THEN** no check is offered that skips memorising an answer
