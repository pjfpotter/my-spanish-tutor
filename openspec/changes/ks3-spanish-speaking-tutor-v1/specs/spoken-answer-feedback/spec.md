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

### Requirement: Listening never dead-ends
If speech recognition fails on both the browser path and the server fallback (for example the fallback is not configured and returns an error), the app SHALL say in plain English that it cannot listen right now, offer a retry, offer to continue the session with non-spoken task types, and record the failure for diagnosis. It SHALL NOT show a raw error and SHALL NOT penalise the attempt.

#### Scenario: Fallback unavailable
- **WHEN** the server recogniser returns an unavailable status
- **THEN** the student sees a plain message with retry and continue options

### Requirement: Fallback is configured before release
The server fallback SHALL be configured and verified on a phone and a laptop browser before any student test.

#### Scenario: Pre-release check
- **WHEN** the release checklist runs
- **THEN** a real transcription request succeeds on both device types

### Requirement: Visible listening
Whenever the microphone is open the screen SHALL show that the student is being heard. A level indicator SHALL respond to the voice without depending on the recogniser, and each word SHALL light as soon as the recogniser understands it, on listen-and-repeat screens as well as recall screens. Words SHALL only turn on while the student is speaking; nothing is shown as wrong until they have finished. The tutor SHALL finish speaking before the microphone opens.

#### Scenario: Words light as they are said
- **WHEN** a student says the first two words of a bit
- **THEN** those two words are lit before they finish the bit

#### Scenario: Heard but not matched
- **WHEN** the recogniser hears words that do not match the script
- **THEN** the screen still shows that it is hearing, and no word is marked wrong

### Requirement: Finishing without a button
A spoken screen SHALL end by itself when every bit has been said. The student SHALL NOT need to press a control to end a correct attempt.

#### Scenario: All said
- **WHEN** the last word of the last bit lights
- **THEN** the result shows and the lesson moves on with no tap

### Requirement: Pauses are met with help, not a clock
Silence SHALL NOT end or fail a spoken attempt. After a configurable pause with no new word (default three seconds) the app SHALL offer a hint and a way to move on, and SHALL keep listening. A hint SHALL show help for the next word without counting it as said.

#### Scenario: Thinking time
- **WHEN** a student is silent for ten seconds and then says the answer
- **THEN** the attempt is still open and is marked on what they said

#### Scenario: Giving up
- **WHEN** a student chooses to move on
- **THEN** the attempt is marked on what was said so far

### Requirement: Later words count after a slip
A skipped or mangled bit SHALL NOT stop words after it from being recognised and credited.

#### Scenario: Mangled middle
- **WHEN** a student mangles the second bit of three and says the third
- **THEN** the first and third bits count as said

### Requirement: Repeated words are matched in place
When a word occurs more than once in the text being said, a spoken instance SHALL light only the occurrence at the student's current place in the sentence.

#### Scenario: Same word twice
- **WHEN** the answer contains "me gusta" in its first and last bits and the student says the first bit
- **THEN** only the first "me gusta" lights

### Requirement: Pronunciation support on a repeated error
When the same word fails to be recognised on repeated attempts, the app SHALL offer pronunciation support for that word (hearing it slowly and its syllable breakdown) rather than repeating the same screen.

#### Scenario: Same word again
- **WHEN** the same word is unlit at the end of three attempts in a lesson
- **THEN** the student is offered that word slowly with its syllables before trying again

### Requirement: Live feedback keeps up on a phone
On the primary phone, a word SHALL light within a set budget of being spoken. The budget SHALL be set from a measurement on a real Android phone and recorded in the device matrix, and the level indicator SHALL cover any remaining delay.

#### Scenario: Measured
- **WHEN** the live listening is run on the reference Android phone
- **THEN** the delay from speech to highlight is recorded and is within the budget

### Requirement: The microphone survives the lesson
The screen SHALL be kept awake while a lesson is listening. If the microphone is lost because the screen locked or the app went to the background, the lesson SHALL resume listening when the student returns, and SHALL NOT switch to self-marking for that reason.

#### Scenario: Screen lock
- **WHEN** the phone locks during a spoken screen and the student unlocks it
- **THEN** the same screen is listening again and nothing has been marked
