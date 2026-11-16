## ADDED Requirements

### Requirement: El Pasillo is the final step of the path
The fourth step of the student's path SHALL open El Pasillo using the student's own confirmed answers. It SHALL unlock under the same rule the timed round used (all answers memorised, or a testing course) and a locked step SHALL redirect to the desktop.

#### Scenario: Step opens after memorising
- **WHEN** a student who has memorised every answer opens the fourth step
- **THEN** El Pasillo starts with doors built from their own answers

#### Scenario: Locked step
- **WHEN** a student who has not memorised their answers types the address of the fourth step
- **THEN** they are sent back to the desktop

#### Scenario: Old timed round
- **WHEN** anyone visits the old timed round at its unlinked address
- **THEN** it still works there and nothing on the path links to it

### Requirement: Only matched words hold the monster back
The chase SHALL slow, and each completed door SHALL push it back, only for words the recogniser matched against the current door. Other sound, such as noise, coughing or unrelated words, SHALL NOT slow it.

#### Scenario: Noise does not help
- **WHEN** the student makes sound for ten seconds that matches no word of the door
- **THEN** the gap closes at the full rate

#### Scenario: Matched words help
- **WHEN** the student says words that match the door
- **THEN** the gap closes at the slowed rate for a short time after each matched word

#### Scenario: Recognition failure is not punished
- **WHEN** the microphone or recogniser is unavailable
- **THEN** the chase waits and the student can read aloud and continue by tap

### Requirement: Fear escalates with the gap
Camera shake, glitch and the heartbeat SHALL rise noticeably from the point where the gap falls to two thirds, reaching their strongest as it is caught. With reduced motion on, shake and glitch SHALL stay minimal and the look-behind SHALL not be forced.

#### Scenario: Escalation is visible
- **WHEN** the gap falls from 1.0 to 0.3
- **THEN** shake and glitch intensity at 0.3 is at least three times the intensity at 0.7

#### Scenario: Reduced motion
- **WHEN** the student prefers reduced motion
- **THEN** shake stays at the reduced level and no look-behind is forced

### Requirement: The look-behind happens by itself
While a door waits, a random check SHALL turn the student round with a probability that rises as the gap closes. It SHALL be rare when the gap is large and never within a minimum time of the last one. The student SHALL still be able to turn round by choice.

#### Scenario: Chance rises with stress
- **WHEN** the look-behind chance is computed for gap 0.9 and for gap 0.2 with enough time since the last
- **THEN** the chance at 0.2 is at least five times the chance at 0.9

#### Scenario: Cooldown
- **WHEN** a look-behind has just ended
- **THEN** another cannot start until the cooldown has passed

### Requirement: A run records effort, not recordings
Each door the student clears SHALL record one timed attempt for its question with the accuracy, the time to the first matched word and whether help was shown. No audio and no transcript SHALL be stored. Showing help SHALL mark the attempt as assisted so it does not count towards readiness.

#### Scenario: Readiness comes from runs
- **WHEN** a student clears the top-rung door for every question without help in enough distinct sessions
- **THEN** the student counts as test ready and the teacher overview shows it

#### Scenario: Assisted door
- **WHEN** a student presses Show me on a door and then clears it
- **THEN** the attempt is stored as assisted and does not count towards readiness

### Requirement: Progress is rewarded, never ranked
El Pasillo SHALL keep souvenirs and a furthest-door record on the device only. It SHALL have no lives and no public ranking.

#### Scenario: Caught
- **WHEN** the student is caught
- **THEN** they wake up with a souvenir and an effort-based summary and can go in again immediately
