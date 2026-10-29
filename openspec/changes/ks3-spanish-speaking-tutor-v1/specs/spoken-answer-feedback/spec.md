# Spec Delta

## Purpose

Turns a student's spoken attempt into quick, fair, low-stakes feedback without deep pronunciation analysis, focused on whether a listener would understand and on known English-speaker mistakes.

## ADDED Requirements

### Requirement: Speech capture on target devices
The app SHALL capture speech on current phone browsers and on school Chromebooks, using the device microphone or a headset, and SHALL tell the student when permission is needed.

#### Scenario: Microphone permission
- **WHEN** the microphone has not been allowed
- **THEN** the app explains why it is needed, requests permission, and offers a retry if denied

### Requirement: Accuracy against the script
The app SHALL compare what was recognised with the student's confirmed answer word by word and show an overall accuracy percentage with each word marked as matched, missed or different.

#### Scenario: One word missed
- **WHEN** a student says all words but one
- **THEN** that word is highlighted and the percentage reflects one missed word

### Requirement: Intelligibility as the standard
A word SHALL count as matched when the recogniser identifies the intended word, and minor accent differences SHALL NOT reduce the score.

#### Scenario: Accented but understood
- **WHEN** the recogniser returns the intended word
- **THEN** the word is marked matched

### Requirement: Known confusion hints
The app SHALL maintain a table of common English-speaker confusions, including me versus mi, a trailing "w" sound on final o, silent h, j, ll, v and b, and z and c, and SHALL show a one-line tip when a mismatch fits an entry.

#### Scenario: Me versus mi
- **WHEN** the recognised word is "mi" where the script has "me"
- **THEN** the app explains the difference in one line

### Requirement: Syllable breakdown
For any missed word the app SHALL show it split into syllables, play its slow audio, and let the student repeat it.

#### Scenario: Practice a missed word
- **WHEN** a student taps a missed word
- **THEN** its syllables are shown and the slow audio plays

### Requirement: Recognition uncertainty
When recognition confidence is low or the environment is noisy, the app SHALL say it could not hear clearly, SHALL NOT penalise the attempt, and SHALL offer a retry.

#### Scenario: Noisy room
- **WHEN** recognition fails because of noise
- **THEN** the attempt is not scored and the student is invited to retry

### Requirement: Recognition service fallback
If the primary recogniser is unavailable on a device, the app SHALL use a server-based recogniser without changing the feedback shown.

#### Scenario: Unsupported browser
- **WHEN** the browser lacks built-in recognition
- **THEN** speech is processed by the fallback and feedback appears as usual
