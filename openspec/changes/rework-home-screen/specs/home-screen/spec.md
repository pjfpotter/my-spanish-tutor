## ADDED Requirements

### Requirement: Plain-English windows
Every window on the home screen SHALL have a plain-English title that says what it is for, such as "What's next?", "What I can do", "Your four steps", "Your speaking test" and "Your streak". Titles SHALL NOT use file-name styling (such as `.exe`) and SHALL NOT be in Spanish. The home screen SHALL NOT have a My progress page or button.

#### Scenario: Window titles
- **WHEN** a student opens the home screen
- **THEN** every window title is plain English and none contains `.exe`

#### Scenario: No progress page
- **WHEN** a student looks for a separate progress screen
- **THEN** none is offered, and the "What I can do" window is where progress is shown

### Requirement: Step order
The home screen SHALL list the four steps in the order Understand, Write, Memorise, Automate. Understand and Write SHALL both be open from the start. Memorise SHALL open once at least one answer is confirmed and every question is understood, and Automate SHALL open once every answer is memorised.

#### Scenario: Order shown
- **WHEN** a student views the steps window
- **THEN** Understand is listed before Write, then Memorise, then Automate

#### Scenario: Write open on a first visit
- **WHEN** a student has not done anything yet
- **THEN** both Understand and Write can be opened

### Requirement: What's next
The home screen SHALL show a "What's next?" window with one sentence and one button that goes straight to the step the student should do now. The choice SHALL be made by fixed rules from the student's saved progress and most recent step, with no language-model call. The first matching rule SHALL apply: no attempts yet, then Understand; Understand unfinished, then Understand; fewer answers confirmed than questions, then Write; Memorise open and unfinished, then Memorise; Automate open and unfinished, then Automate; everything done, then a light review. After the first session the sentence SHALL name the step the student did last and say what to do now, in an encouraging tone, and SHALL name at most one thing to do. The student SHALL still be able to open any open step from the steps window.

#### Scenario: First session
- **WHEN** a student has made no attempts
- **THEN** the window says it is their first session and that they need to learn what the test questions mean, and its button opens Understand

#### Scenario: Returning student
- **WHEN** a student's last step was Understand and some questions are still not understood
- **THEN** the window names Understand as last time's step, says how many questions are left, and its button opens Understand

#### Scenario: Moving on
- **WHEN** a student has understood every question but confirmed fewer answers than there are questions
- **THEN** the window says what they did last and suggests Write, and its button opens Write

#### Scenario: Everything done
- **WHEN** every step is done
- **THEN** the window offers a light review

### Requirement: What I can do
The home screen SHALL show a "What I can do" window with one plain-English can-do statement per test question, taken from the question's English meaning or a short English topic label written when the teacher uploads the course. Each statement SHALL show four labelled ticks, Understand, Write, Memorise and Fast, and each tick SHALL be in one of three states: "Not yet", "Getting there" or "Got it". The state SHALL be shown as an icon and a word, never by colour alone. The window SHALL show a count of questions that are fully ready as whole numbers, and SHALL NOT show percentages, rankings or comparisons with other students. A statement with all four ticks at "Got it" SHALL be marked as complete. Tapping a statement SHALL open that question's next unfinished step. The states SHALL come from stored progress by rules, never from a model.

#### Scenario: Nothing done yet
- **WHEN** a student has not practised
- **THEN** every tick reads "Not yet" and no tick is shown as a failure

#### Scenario: Partway
- **WHEN** a student has some progress on a question's step but has not finished it
- **THEN** that tick reads "Getting there"

#### Scenario: Complete statement
- **WHEN** all four ticks of a question read "Got it"
- **THEN** its statement is marked complete and the count of ready questions rises by one

#### Scenario: Tap to continue
- **WHEN** a student taps a question's statement
- **THEN** the app opens that question's next unfinished step

### Requirement: Nickname greeting
The home screen SHALL greet the student by their generated nickname inside the tutor's area, in a soft dusk-sky setting with a nameplate, a time-of-day greeting and a small amount of gentle ornament such as a drifting cloud. It SHALL be dreamy and calm, not unsettling. Motion SHALL stop under reduced motion, the greeting SHALL be readable in light and dark themes, and the nickname SHALL be shown as text so that it is available to assistive technology. A signed-out visitor SHALL see no nickname.

#### Scenario: Signed-in greeting
- **WHEN** a signed-in student opens the home screen in the evening
- **THEN** the tutor's area shows an evening greeting with their nickname on a nameplate

#### Scenario: Reduced motion
- **WHEN** the device asks for reduced motion
- **THEN** the greeting is shown without animation

#### Scenario: Signed out
- **WHEN** a visitor is not signed in
- **THEN** no greeting with a nickname is shown

### Requirement: Removed home features
The home screen SHALL NOT offer a daily reminder, a class goal, a history of the student's own attempts, "best saying" scores, or a separate starting-point window.

#### Scenario: Windows not present
- **WHEN** a student opens the home screen
- **THEN** none of those features is shown
