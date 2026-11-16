## ADDED Requirements

### Requirement: The demo uses real voice recognition
Every spoken step in the demo SHALL listen through the same recogniser and the same rules-based scorer as the real app. There SHALL be no button that pretends the student answered, except a fallback on a device with no usable microphone, which SHALL say that it is a fallback.

#### Scenario: Spoken answer
- **WHEN** a visitor with a microphone says an answer in the demo
- **THEN** the words they said light up and the score and one thing to fix come from the scorer

#### Scenario: No microphone
- **WHEN** the browser cannot use a microphone or the visitor declines it
- **THEN** the demo shows a labelled fallback so the tour can still be completed

### Requirement: The demo matches the real app
Demo stops SHALL reuse the real screens and components for each step, on a sample course, so they cannot drift from the product. The final stop SHALL be El Pasillo.

#### Scenario: Same screens
- **WHEN** a visitor reaches the memorise stop
- **THEN** they see the real memorise screen on sample answers

### Requirement: The demo explains the journey to non-teachers
The demo SHALL open with a short plain-English explanation of the KS3 speaking test, why students dread it, and the four steps a student takes, each with one line on why it exists. Plain words, no teaching jargon, no abbreviations left unexplained.

#### Scenario: First screen
- **WHEN** a visitor opens the demo
- **THEN** before any stop they can read what the test is, who the students are and the four steps

### Requirement: The demo saves nothing
The demo SHALL read no profile and write nothing to the database. Audio SHALL NOT be stored. It SHALL be labelled as a demo on every screen.

#### Scenario: Nothing persists
- **WHEN** a visitor completes the demo and checks the database
- **THEN** no profile, attempt or coin row exists for them
