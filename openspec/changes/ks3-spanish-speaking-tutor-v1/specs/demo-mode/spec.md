# Spec Delta

## Purpose

A quick, lightweight way for someone who is not a target student, such as an audience member at the presentation or a viewer of a demo video, to play with every key feature in a few minutes without joining a class.

## ADDED Requirements

### Requirement: Enter without a class code
A visitor SHALL be able to start demo mode from the front page with one tap, using no class code, nickname or recovery code, and SHALL be able to leave at any time.

#### Scenario: Audience member
- **WHEN** someone taps the demo entry on the front page
- **THEN** a demo session starts on a built-in sample course with no sign-up

### Requirement: Guided tour of every key feature
Demo mode SHALL offer a short sequence of one-minute stops covering: hearing a question, memorising an answer, a timed answer round with chunks appearing, the tutor and its reactions, rewards, and the teacher overview. Each stop SHALL be reachable directly and in order.

#### Scenario: Skip around
- **WHEN** a visitor picks any stop
- **THEN** it opens directly with a way to go to the next stop

### Requirement: Works without a microphone
Every spoken stop SHALL offer a "pretend" button that plays a scripted example answer so the demo still works in a noisy room or on a machine without a microphone.

#### Scenario: No microphone
- **WHEN** a visitor taps the pretend button
- **THEN** a scripted answer is processed and the usual feedback shows

### Requirement: Isolated from real data
Demo activity SHALL never be written to real student tables, SHALL NOT use real class data, and SHALL be clearly labelled "Demo" on every screen. Demo mode SHALL make no paid calls beyond cached assets.

#### Scenario: Demo labelled
- **WHEN** any screen is shown in demo mode
- **THEN** a visible "Demo" label is shown and no real profile is created

### Requirement: Fast reset
A visitor or presenter SHALL be able to reset demo mode to its start in one action and demo mode SHALL be recordable for video, with a switch that removes timers and prompts.

#### Scenario: Reset
- **WHEN** the presenter taps Reset
- **THEN** demo mode returns to the first stop
