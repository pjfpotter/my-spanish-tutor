# Spec Delta

## Purpose

Makes repetition feel good. The teaching method (extensive processing instruction) depends on a large number of repetitions of the same narrow chunks, so the app must make those repetitions enjoyable through immediate feedback, sound, animation and a mix of task types. Patterns come from a recorded Duolingo session (`docs/knowledge/duolingo-ux-research-notes.md`, 9 Nov 2026), keeping the positive feedback mechanics and leaving out its loss framing.

## ADDED Requirements

### Requirement: Instant feedback panel
After every answer a feedback panel SHALL appear in the same screen position within 300 ms. It SHALL show correct or not yet, the correct answer when needed, and a Continue control, colour-coded with a non-colour cue as well. The panel SHALL NOT wait for a tutor line to finish.

#### Scenario: Correct answer
- **WHEN** a student answers correctly
- **THEN** a success panel appears at once with a Continue control and the student may continue immediately

#### Scenario: Wrong answer
- **WHEN** a student answers incorrectly
- **THEN** the panel shows the correct answer and at most one thing to fix, with no penalty

### Requirement: Feedback sound and reward animation
Each correct answer SHALL play a short feedback sound and a small reward animation. Sounds SHALL be short interface sounds (not tutor speech), SHALL be silenced by a sound setting and the calm switch, and SHALL be original or licensed. Reward animations SHALL stop under reduced motion.

#### Scenario: Correct answer sound
- **WHEN** a student answers correctly with sound on
- **THEN** a short success sound plays and a small animation runs

#### Scenario: Sound off
- **WHEN** the student has turned sound off
- **THEN** no interface sound plays and the animation remains

### Requirement: Varied praise
Praise wording SHALL vary from a stored pool and SHALL NOT repeat the same line twice in a row.

#### Scenario: Two correct in a row
- **WHEN** a student answers two items correctly in a row
- **THEN** the two praise lines differ

### Requirement: Combo moments
After a run of consecutive correct answers (default five, configurable) a short combo moment SHALL appear that auto-advances within about two seconds and does not need a tap. Skipped or assisted items SHALL neither count towards nor break a run.

#### Scenario: Five in a row
- **WHEN** a student answers five items correctly in a row
- **THEN** a combo moment shows and then advances by itself

### Requirement: Mistakes get a second chance
Items answered incorrectly SHALL be re-queued later in the same session, labelled in plain English as a previous mistake, so the session ends on success. There SHALL be no lives, hearts or loss of progress.

#### Scenario: Missed item returns
- **WHEN** a student answers an item incorrectly
- **THEN** it returns before the session ends with a "previous mistake" label

### Requirement: Mixed task types
A session SHALL mix task types, with a rising difficulty curve, and SHALL NOT repeat the same type more than three times in a row. The minimum set of task types is: hear and choose the meaning, match pairs (Spanish with English), sentence scramble (tap or drag chunks into order), fill the gap (choose the missing chunk), tap what you hear, and say it aloud. A task type SHALL be added only if it gives a different thinking load.

#### Scenario: Mix within a session
- **WHEN** a memorise session runs for ten items
- **THEN** at least three different task types appear and none appears more than three times in a row

#### Scenario: Sentence scramble
- **WHEN** a sentence scramble is shown
- **THEN** the student orders the answer's chunks by tap or drag and the colour of each chunk follows its chunk kind

### Requirement: Fast input
On a keyboard, number keys SHALL select choices and Enter SHALL check and continue. Controls SHALL ignore input while a transition is running so rapid presses cannot create a wrong answer.

#### Scenario: Rapid presses
- **WHEN** a student presses keys quickly during matching
- **THEN** no unintended pair is registered

### Requirement: Promise the reward before starting
A lesson's start control SHALL state what the session offers (for example the coins at stake) before the student commits.

#### Scenario: Start control
- **WHEN** a lesson is offered
- **THEN** its start control shows the coins on offer

### Requirement: Pending game modes need approval
No game in the style of a multiplayer quiz game (such as tower defence) SHALL be built until the owner has approved a written proposal for it. Ordinary task types listed above are exempt.

#### Scenario: Game idea
- **WHEN** a new game mode is suggested
- **THEN** a proposal is written for the owner and nothing is built until it is approved

### Requirement: Speaking and tapping screens are told apart at a glance
A screen that expects speech and a screen that expects a tap SHALL be distinguishable without reading, by a consistent visual signal (for example the listening indicator against a tap cue, and a short transition when the kind changes). The signal SHALL use little or no text and SHALL NOT rely on colour alone.

#### Scenario: Switching kind
- **WHEN** a tapping screen follows a speaking screen
- **THEN** the change of kind is signalled before the student acts, and the microphone indicator is not shown
