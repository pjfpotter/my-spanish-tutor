## ADDED Requirements

### Requirement: The testing course has five questions that each have their own sentence builder
The testing course (class code `PRBA7K3M`) SHALL have exactly five core questions, and every one of them SHALL match a question of the course's sentence builder by Spanish text, so that the write screen offers a sentence builder for every question and no question is skipped for lack of one.

#### Scenario: Every question has a sentence builder
- **WHEN** the seed lists the unmatched questions of the testing course
- **THEN** it lists none

#### Scenario: Each question offers only its own part
- **WHEN** a tester opens question 1 (films) in the write phase
- **THEN** the sentence builder offers only the films chunks, and no chunk from the clothes, free time, holiday or bedroom builders

#### Scenario: All five answers can be written and confirmed
- **WHEN** a tester writes and confirms one valid answer to each of the five questions
- **THEN** all five confirm, the write phase reports complete, and memorise and automate use the tester's own five answers

#### Scenario: The printed sheet shows only the question's own builder
- **WHEN** a tester opens question 3 (clothes)
- **THEN** the sheet drawn on screen is headed by that question and shows only the clothes columns

### Requirement: The five builders come from the teacher's Year 8 sheets
The five sentence builders SHALL be drawn from `docs/teaching-resources/sentence_builders/` and SHALL cover five different answer shapes: an opinion, present habits, present and near-future clothes, a past-tense holiday with a reaction, and a description with positions. Printing slips on a sheet SHALL be fixed through the interpretation's `corrections`, and no chunk SHALL be added to or removed from what the reader found.

#### Scenario: A misspelt chunk is corrected
- **WHEN** a sheet prints "al esatdio" or "el pared"
- **THEN** the interpretation corrects it, and students see the corrected word with the correction recorded

#### Scenario: The interpretation passes the existing gates
- **WHEN** the merged sheet and interpretation are checked with `validateInterpretation` and `verifyBuilder`
- **THEN** both report no problems

### Requirement: The testing course's chunks and model answers are valid and worth something
The testing course SHALL pass `validateCourse` and SHALL carry a calibration worked out from its own chunks, so that answers built from its sentence builders are valued. Its chunks SHALL be derived from the five interpretations, every question SHALL have a simple model answer that the word validator accepts and the rubric scores above zero, and no model answer SHALL use a chunk from another question's builder.

#### Scenario: The course validates
- **WHEN** `validateCourse` is run on the testing course
- **THEN** it returns ok with no problems

#### Scenario: Every question has a simple model answer
- **WHEN** the simplest model answer for each of the five questions is scored
- **THEN** each is valid and worth more than zero

### Requirement: Teacher-derived content stays out of the repository
Sheets and interpretations derived from teachers' documents SHALL be kept in a gitignored folder and SHALL NOT be committed. When that folder is present the testing course SHALL be built from it; when it is absent the testing course SHALL fall back to its previous definition, so a clean checkout builds, seeds and passes its committed tests.

#### Scenario: Local data present
- **WHEN** `npm run seed` runs with the local folder present
- **THEN** `PRBA7K3M` is created or updated with the five questions and five builders

#### Scenario: Local data absent
- **WHEN** the local folder is absent and `npm run seed` or the test suite runs
- **THEN** nothing fails, `PRBA7K3M` keeps its previous content, and the seed prints a one-line note that the local data was not found

#### Scenario: Nothing derived is tracked
- **WHEN** `git status` is run after the local data is generated
- **THEN** no file from the local folder appears as untracked or modified

### Requirement: Question audio exists for the new questions
Each of the five questions SHALL have its Spanish audio built through the cost router before the course is used with sound. The tutor SHALL speak Spanish only, with English as subtitles.

#### Scenario: A dry run lists the missing clips
- **WHEN** `npm run build-audio -- --course=PRBA7K3M` is run without `--yes`
- **THEN** it lists the missing clips and their cost and spends nothing
