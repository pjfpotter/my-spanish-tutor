# Spec Delta

## Purpose

Gives every student in a class a nickname that no one else in the class has, made up from a large closed vocabulary and picked from a list, so the teacher can tell students apart and no one types free text.

## ADDED Requirements

### Requirement: Nicknames are generated from a closed vocabulary and picked, never typed
A nickname SHALL be made of one or two adjectives followed by a noun, all from fixed lists, and a student SHALL only pick one from the options offered. Anything that is not a name of that shape SHALL be refused.

#### Scenario: Generated shapes
- **WHEN** nicknames are generated
- **THEN** each has one or two distinct adjectives and one noun from the lists, in the form "Sleepy Llama" or "Sleepy Cosmic Llama"

#### Scenario: Free text refused
- **WHEN** a sign-up asks for "Alex" or a name made of other words
- **THEN** it is refused and no profile is created

#### Scenario: Old nicknames still work
- **WHEN** a sign-up uses a nickname from the old 12 by 12 list
- **THEN** it is accepted

### Requirement: The vocabulary is large and school-safe
There SHALL be at least 1,500 two-part nicknames and far more three-part ones, and no nickname SHALL contain a word or run of letters from a blocklist of rude words.

#### Scenario: Size
- **WHEN** the possible nicknames are counted
- **THEN** there are at least 1,500 two-part names and at least 50,000 three-part names

#### Scenario: Nothing rude
- **WHEN** every two-part nickname is checked, with and without its space
- **THEN** none contains a blocked word

### Requirement: Options leave out nicknames already in the class
The options offered to a student joining a class SHALL not include any nickname already used in that class. Six distinct options SHALL be offered.

#### Scenario: Taken names are never offered
- **WHEN** a class already has many students and options are offered
- **THEN** none of the six equals a nickname in that class

#### Scenario: Options come with the class
- **WHEN** the student's class code is accepted
- **THEN** the options for that class are returned, and none are offered before then

### Requirement: A taken nickname is refused
Sign-up SHALL refuse a nickname that is already used in the class, with a plain message, and SHALL offer fresh options instead.

#### Scenario: Someone was quicker
- **WHEN** a student submits a nickname that another student took after the options were shown
- **THEN** no profile is created, the answer says it was just taken, and new options are offered

#### Scenario: Another class
- **WHEN** a nickname is used in a different class
- **THEN** it is not taken here and is accepted

### Requirement: The overview copes with duplicates that already exist
The teacher overview SHALL list every student, including two with the same nickname, without error.

#### Scenario: Two students with one nickname
- **WHEN** a class holds two students with the same nickname
- **THEN** the overview lists both rows
