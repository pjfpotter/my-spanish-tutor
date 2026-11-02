# Spec Delta

## Purpose

Defines the course: a sentence builder, its test questions and a simplified mark scheme, and how a class reaches it. A course is the unit of content the whole app works from.

## ADDED Requirements

### Requirement: Course structure
A course SHALL contain one sentence builder made of chunks (Spanish text with an English gloss, a category and feature tags), exactly five test questions (four on the current topic, one recycled from an earlier topic), a test date, and a mark scheme. Every question SHALL have a Spanish text, an English subtitle and the chunk categories that answer it.

#### Scenario: Valid course is accepted
- **WHEN** a course is saved with a sentence builder, five questions with Spanish text and English subtitles, and a test date
- **THEN** the course becomes available to join

#### Scenario: Incomplete course is rejected
- **WHEN** a course is saved with fewer or more than five questions or a question missing its English subtitle
- **THEN** the course is not published and the missing items are listed

### Requirement: Mark scheme rungs
The mark scheme SHALL be data that each course can tune, with five rungs shown to the student by name only: survival, opinion, detail, range and showing off. Survival SHALL require an answer that is relevant to the question (it uses a chunk from the question's topics) and counts as a sentence (it contains a verb phrase). Opinion SHALL be survival plus a justified opinion.

#### Scenario: Relevant sentence reaches survival
- **WHEN** an answer uses a chunk from the question's topics and contains a verb phrase
- **THEN** it reaches the survival rung, and an answer with no verb phrase or nothing relevant does not

### Requirement: Detail rung
Detail SHALL be survival plus range and extra detail, with no opinion needed, using several verb phrases joined with sequencers and detail words counted by weight.

#### Scenario: Detail without an opinion
- **WHEN** an answer has three verb phrases, a sequencer and enough detail words but no opinion
- **THEN** it reaches the detail rung

#### Scenario: Opinion and detail are two routes
- **WHEN** one answer has a justified opinion and another has detail but no opinion
- **THEN** both are valid routes up from survival and neither is required for the other

### Requirement: Phrases outweigh single words
In counting detail, an adverbial or adjectival phrase SHALL be worth more than a single adverb or adjective.

#### Scenario: A phrase outweighs a single word
- **WHEN** two answers differ only in that one uses an adverbial phrase where the other uses a single adverb
- **THEN** the answer with the phrase earns more detail points

### Requirement: Whole-test rules
The range rung SHALL be gated by the use of at least three different basic tenses across the student's whole test, not within one answer. The basic tenses are present, preterite, near future ("voy a") and conditional. The mark scheme SHALL also carry a target of roughly five justified opinions across the whole test, which the coach steers toward but which SHALL NOT be a gate, because not every question suits an opinion.

#### Scenario: Range depends on the whole test
- **WHEN** a student's five answers together use only two basic tenses
- **THEN** no answer reaches the range rung, however detailed it is, until a third basic tense is used somewhere in the test

#### Scenario: Opinion target is not a gate
- **WHEN** a student's answers contain fewer than five justified opinions
- **THEN** no rung is withheld for that reason alone

### Requirement: Fancy language
The showing-off rung SHALL be range plus a fancy feature in the answer. Any tense other than the four basic ones SHALL count as fancy, as SHALL syntax that is tricky for native English speakers (for example "a mis padres les gusta") and an idiom.

#### Scenario: Other tenses are fancy
- **WHEN** an answer uses the present perfect, imperfect, simple future or subjunctive
- **THEN** it counts as a fancy feature and not as one of the basic tenses

### Requirement: No grades shown
The app SHALL NOT display or mention grades, marks or numeric levels anywhere, including any working-towards grade. Rung names are the only thing a student sees.

#### Scenario: Levels are shown by name, never as grades
- **WHEN** a student views the result of any answer
- **THEN** the rung is one of survival, opinion, detail, range or showing off, and no grade, mark or number is displayed

### Requirement: Class code joining
Each course SHALL be reachable through a short class code. A student SHALL join by entering the code only.

#### Scenario: Valid code
- **WHEN** a student enters a valid class code
- **THEN** the student sees that course's title, test date and the start of the writing phase

#### Scenario: Unknown code
- **WHEN** a student enters a code that matches no course
- **THEN** the app explains the code was not found and asks them to check it with their teacher

### Requirement: Recycled chunks
Chunks SHALL be taggable as recycled, meaning they recur across topics. Recycled chunks SHALL be offered first when the coach suggests ways to lift an answer.

#### Scenario: Recycled chunk suggested
- **WHEN** the coach suggests an upgrade to an answer
- **THEN** a recycled chunk is chosen over a topic-only chunk when both fit

### Requirement: Photo import of a sentence builder
Where photo import is enabled, a user SHALL be able to photograph a sentence builder and receive an editable draft of its chunks. The draft SHALL NOT be used by anyone until the user confirms it. Identical imports SHALL reuse the earlier result.

#### Scenario: Import reviewed and confirmed
- **WHEN** a user uploads a photo and confirms the extracted chunks
- **THEN** the chunks become the course's sentence builder

#### Scenario: Unreadable photo
- **WHEN** no chunks can be extracted from a photo
- **THEN** the user is told and can retake the photo or type chunks manually
