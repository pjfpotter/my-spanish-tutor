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
- **THEN** their progress, avatar items and plan are restored

#### Scenario: Lost code
- **WHEN** a student has no recovery code
- **THEN** the app explains that progress cannot be recovered and offers a fresh start

### Requirement: Interests as fixed tags
Personalisation SHALL use interests chosen from a fixed list of tags. The app MUST NOT accept free-text interest descriptions or send them to any language model.

#### Scenario: Choosing interests
- **WHEN** a student selects interests
- **THEN** they pick from the fixed list and there is no free-text field

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

### Requirement: Custom drawings stay on device
An image the student supplies for their tutor avatar SHALL be stored only on that device and SHALL NOT be uploaded.

#### Scenario: Drawing used
- **WHEN** a student sets a custom drawing as their tutor
- **THEN** no network request carries the image

### Requirement: Plain-language privacy notice
The app SHALL show a short privacy notice written for a 13-year-old before joining a course, stating what is stored, what is not, and how to delete it.

#### Scenario: Notice shown
- **WHEN** a student joins a course for the first time
- **THEN** the notice is displayed and must be acknowledged to continue
