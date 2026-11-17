# Spec Delta

## Purpose

Defines where built audio clips live, how they are shared between courses and teachers, how the app learns which clips exist and serves them, and what the build and publish steps do. It replaces the committed-files arrangement and completes "Audio reuse" and "Fallback when audio is missing" of `speech-audio-assets`.

## ADDED Requirements

### Requirement: One clip per text and speed, for every course
A clip SHALL be identified by a hash of its text and speed. The same text at the same speed SHALL be built and stored once, however many courses and teachers use it.

#### Scenario: Shared phrase
- **WHEN** two teachers' courses both use "me gusta" at normal speed
- **THEN** one clip serves both and the second course builds nothing for it

### Requirement: Clips are stored outside the repository
Clip audio and timelines SHALL be kept in private object storage, not in the code repository, and SHALL NOT need a commit or redeploy to be added. A clip's teacher-derived text SHALL NOT be written into the repository.

#### Scenario: New course with new words
- **WHEN** a course with words no clip exists for is built
- **THEN** the new clips are in storage and the repository is unchanged

### Requirement: The list of built clips is data
The system SHALL keep a table of built clips: the hash, the text, the speed, the voice and model it was made with, its source hash, its size and when it was built. The table SHALL hold nothing about a course, a teacher or a student.

#### Scenario: Reading the table
- **WHEN** the table is read for a clip
- **THEN** it says whether the clip exists and whether it matches the current voice and model

### Requirement: Clips are served with long-lived caching
A clip SHALL be served by the app from storage with a cache lifetime that lets the CDN and the device keep it, and the address of a clip SHALL change when the clip is rebuilt, so a rebuilt clip is not served stale.

#### Scenario: Second play
- **WHEN** a clip is played a second time on the same device
- **THEN** it is not fetched from storage again

#### Scenario: Rebuilt clip
- **WHEN** a clip is rebuilt with a new voice
- **THEN** devices fetch the new version and not the old one

### Requirement: A student is told only the clips their course needs
The app SHALL tell a student's device which clips exist for that student's own course and for the app's shared tutor lines, and SHALL NOT list clips that belong only to other courses.

#### Scenario: Another teacher's text
- **WHEN** a student of one course asks which clips exist
- **THEN** the answer holds nothing that only another course uses

### Requirement: Missing audio does not stop the student
When a clip a student needs is not available, the app SHALL carry on without its audio and show the subtitle, as the audio-missing fallback already requires, and SHALL NOT call a speech service.

#### Scenario: Clip missing at play time
- **WHEN** a clip's audio cannot be fetched
- **THEN** the student sees the text and continues, and no speech call is made

### Requirement: The build adds, and never removes another course's clips
The audio build SHALL create only the clips that are missing from the table or stale for the current voice and model, SHALL pay for nothing that exists, and SHALL report how many clips it reused. It SHALL NOT delete a clip because the course being built does not use it.

#### Scenario: Build for a second course
- **WHEN** a second course is built after a first
- **THEN** the first course's clips are all still present

#### Scenario: Reuse report
- **WHEN** a build finishes
- **THEN** it states how many clips were built, how many were reused and what was spent

### Requirement: A course cannot publish with a missing clip
Publishing a course SHALL be blocked while any clip the course needs is missing from the table, and the missing items SHALL be listed.

#### Scenario: Missing clip
- **WHEN** a question's clip has not been built
- **THEN** the course cannot be published and the question is named

### Requirement: Existing clips are carried over
The clips already built SHALL be copied into storage and the table before the repository copies are removed, and every course that worked before SHALL still have all its audio.

#### Scenario: Migration
- **WHEN** the move is complete
- **THEN** every previously built clip is in storage and the table, and the repository holds none
