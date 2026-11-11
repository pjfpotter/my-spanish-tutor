# Spec Delta

## Purpose

The writing screen built on a verified interpretation: the sentence builder sits above an answer flashcard that shows the real sentence, and a sign-off that blocks only what is ungrammatical or impossible.

## ADDED Requirements

### Requirement: The card shows the sentence
The answer card SHALL show the Spanish sentence being built, with its English subtitle beneath, including fixed words, joining words and punctuation. The chosen chunks SHALL appear as a single scrolling strip of editing handles under it.

#### Scenario: A fixed word
- **WHEN** a student picks "mis primos" for the "who" slot
- **THEN** the sentence reads "con mis primos" and the handle shows the same

#### Scenario: A half-built part
- **WHEN** a frame has some of its parts but not its core
- **THEN** the sentence ends that part with "…"

### Requirement: Frames are complete or absent
Each sentence of a multi-sentence sheet SHALL be a frame with its own core parts. A frame with some parts and not its core SHALL fail the check with a plain instruction naming the missing part.

#### Scenario: Bedroom fragment
- **WHEN** a student picks "Me gusta mi dormitorio porque es" and "bastante" but no adjective
- **THEN** the check says an adjective is missing and offers to add one

### Requirement: The active slot decides what a tap does
When a slot is active, the sheet SHALL dim chunks that slot cannot take, with a reason on tap, and a tap SHALL NOT silently replace a chunk belonging to another slot.

#### Scenario: Contrast opinion
- **WHEN** the contrast slot is active and the student taps "porque"
- **THEN** nothing changes and the sheet says the word belongs to "because…"

### Requirement: Extras behind Add more
Optional slots SHALL be hidden until asked for by an "Add more" control, and SHALL NOT be offered automatically after a sentence is complete.

#### Scenario: A complete sentence
- **WHEN** a student completes a sentence
- **THEN** the card offers "Add more" and no optional slots are open

### Requirement: Lists of items
A slot pair repeated up to four times SHALL let a student list several items, joined with commas and "y" before the last, in Spanish and English.

#### Scenario: Three garments
- **WHEN** a student picks three garments with colours
- **THEN** the sentence reads "un jersey rojo, vaqueros azules y zapatillas blancas"

### Requirement: Sign-off by the exam rule
The check SHALL block only an answer that is ungrammatical, incomplete or contradictory, and SHALL credit any answer that is grammatical and could be true. It SHALL return plain instructions naming at most one thing to fix.

#### Scenario: A strange but possible answer
- **WHEN** a student says they like their bedroom because it is quite red
- **THEN** the answer is credited

### Requirement: The screen fits
At 340 by 640 the sheet SHALL keep at least about 45 per cent of the height while building, "Check it" SHALL stay on screen, and the result panel SHALL fit without scrolling. Text on the sheet SHALL be at least 14 px for Spanish.

#### Scenario: A long sentence
- **WHEN** the sentence runs to four lines
- **THEN** the card scrolls inside itself and "Check it" stays visible

### Requirement: Pick-up view is optional
A pick-up view, where the sheet lifts over the card, SHALL be available as a setting and SHALL NOT be the default until the owner approves it.

#### Scenario: Short screen
- **WHEN** a student uses a screen under 700 px tall
- **THEN** the guided camera is used unless pick-up has been chosen
