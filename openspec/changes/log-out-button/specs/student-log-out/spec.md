# Spec Delta

## Purpose

Defines how a student leaves their profile on a device without deleting it, what the student is told first, what the device forgets and what it keeps, and how the same student or a new one gets back in. It adds the log-out case to "Profile recovery" in `student-identity-privacy`.

## ADDED Requirements

### Requirement: A signed-in student can log out
The app SHALL show a "Log out" control to a signed-in student on the desktop and on the Privacy page, and SHALL NOT show it to a device with no profile. It SHALL be reachable by keyboard, large enough to tap on a phone, and have a visible focus.

#### Scenario: Signed in
- **WHEN** a signed-in student opens the desktop
- **THEN** a Log out control is visible near the Privacy link

#### Scenario: No profile
- **WHEN** a device with no profile opens the desktop or the Privacy page
- **THEN** there is no Log out control

### Requirement: Logging out asks first and says what it takes to return
Choosing Log out SHALL show a confirmation in plain words before anything happens. It SHALL say that this device will forget the student, that nothing is deleted, and that returning needs the recovery code, which the app cannot show again. It SHALL offer "Log out" and "Stay", and "Stay" SHALL change nothing.

#### Scenario: Confirmation
- **WHEN** a student chooses Log out
- **THEN** they see the warning about the recovery code and the choices Log out and Stay, and are still signed in

#### Scenario: Stay
- **WHEN** a student chooses Stay
- **THEN** the confirmation closes and they remain signed in with nothing changed

### Requirement: Logging out deletes nothing
Logging out SHALL end the profile on this device only. The profile, its answers, mastery, attempts, coins, purchases and plan SHALL remain, its recovery code SHALL still work, and the teacher's overview SHALL still count the student.

#### Scenario: Data kept
- **WHEN** a student logs out
- **THEN** their data is unchanged and restoring with their recovery code brings it all back

### Requirement: The device forgets the student but keeps its own settings
Logging out SHALL clear the student's data held on the device (cached progress and planner settings) and SHALL keep the device's own settings: calm mode, sound and captions.

#### Scenario: Next student on a shared device
- **WHEN** a student logs out and another joins on the same device
- **THEN** the second student sees none of the first student's cached progress or planner settings, and calm mode, sound and captions are as they were

### Requirement: After logging out, the student can join or return
After logging out the app SHALL show the welcome screen, with joining a class and restoring with a recovery code both available.

#### Scenario: A new student
- **WHEN** a student has logged out
- **THEN** a new student can join with the class code and gets a new profile of their own

#### Scenario: The same student returns
- **WHEN** a logged-out student enters their recovery code
- **THEN** their own profile is restored

### Requirement: Logging out never fails loudly
Logging out SHALL work whether or not the device still has a valid profile cookie, and SHALL make no change to the database. If the request fails, the student SHALL see a short plain message and stay signed in.

#### Scenario: Already signed out
- **WHEN** the log-out request arrives with no cookie
- **THEN** it succeeds and the student reaches the welcome screen

#### Scenario: Offline
- **WHEN** the request cannot be sent
- **THEN** the student is told it did not work and is still signed in
