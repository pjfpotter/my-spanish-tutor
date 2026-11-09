# Spec Delta

## Purpose

Lets students use the app without accounts or personal details while protecting children's data by design. Data minimisation is a product feature, not an afterthought.

## ADDED Requirements

### Requirement: Anonymous profile
The app SHALL identify a student by a random profile created on first use. It SHALL NOT ask for or store a real name, email address, phone number or school-issued identifier.

#### Scenario: First use
- **WHEN** a student opens the app for the first time and joins a course
- **THEN** a profile is created with no personal identifiers and the student chooses only a nickname from a generated list

### Requirement: Profile recovery
A student SHALL be able to restore progress on a new device using a short recovery code shown at profile creation.

#### Scenario: Restore on a new phone
- **WHEN** a student enters their recovery code on another device
- **THEN** their progress, desktop unlocks and plan are restored

#### Scenario: Lost code
- **WHEN** a student has no recovery code
- **THEN** the app explains that progress cannot be recovered and offers a fresh start

### Requirement: Clear sign-up choices
The first screen SHALL offer exactly two actions, worded "Sign up for a new account" and "I lost my account". The second SHALL lead to entering a recovery code. Neither action SHALL need a name, email or any personal detail.

#### Scenario: Two clear buttons
- **WHEN** a student opens the app for the first time
- **THEN** the two actions are shown with those labels and each explains in one line what it does

### Requirement: No stored voice recordings
Student audio SHALL be processed only to produce a transcript and timing results and SHALL then be discarded. No student recording MUST be persisted on a server or shared with any third party beyond the single processing call.

#### Scenario: After an attempt
- **WHEN** a speaking attempt has been scored
- **THEN** only the transcript-derived results are kept and the recording is not retrievable

### Requirement: Delete everything
A student SHALL be able to delete their profile and all associated data in one action, with immediate effect.

#### Scenario: Delete all
- **WHEN** a student confirms deletion
- **THEN** all server-side data for the profile is removed and the device returns to its first-use state

### Requirement: Plain-language privacy notice
The app SHALL show a short privacy notice written for a 13-year-old before joining a course, stating what is stored, what is not, and how to delete it.

#### Scenario: Notice shown
- **WHEN** a student joins a course for the first time
- **THEN** the notice is displayed and must be acknowledged to continue

### Requirement: Interests are parked
Version one SHALL NOT ask students what they are into, because the answers changed nothing in their process. If reintroduced, interests SHALL come from a fixed list of tags (no free text, nothing sent to a language model) and SHALL have a visible effect, such as which model answers are suggested. To avoid another model call, verb phrases in the sentence builder would be tagged by topic by the course set-up call and suggestions chosen from the tags by rules. This is not a priority.

#### Scenario: Joining
- **WHEN** a student joins a course
- **THEN** no interest question is asked
