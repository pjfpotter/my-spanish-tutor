# Spec Delta

## Purpose

Stops a contrast word from excusing a reason that contradicts the opinion, so a student cannot build "I love basketball although it is boring".

## ADDED Requirements

### Requirement: A contrast word brings in a cost or a benefit, not a contradicting feeling
After a connector that reverses polarity (such as "aunque"), the sentence builder SHALL accept a reason of the opposite polarity only when it is a practical cost or benefit (for example price, effort or health), and SHALL NOT accept a reason that says how the activity feels (for example fun, boring, relaxing or exciting). The sheet's reading marks which reasons are about feeling. A reason after an ordinary connector such as "porque" is unaffected.

#### Scenario: A cost after a liked activity
- **WHEN** a student has "Me encanta ir al cine" and "aunque"
- **THEN** "es caro" is offered

#### Scenario: A feeling that contradicts the opinion
- **WHEN** a student has "Me encanta ir al cine" and "aunque"
- **THEN** "es aburrido" is not offered, and picking it by typing or a saved answer is refused with a message naming the connector

#### Scenario: Ordinary connector
- **WHEN** a student has "Me encanta ir al cine" and "porque"
- **THEN** "es emocionante" is offered as before

### Requirement: Uploads mark feeling reasons
The instructions given to the model that reads a sheet at upload SHALL tell it to mark feeling reasons and to leave cost, price, health and effort reasons unmarked, and drafts made before this rule SHALL NOT be reused.

#### Scenario: Old draft
- **WHEN** a sheet was read before this rule existed
- **THEN** it is read again rather than taken from the stored drafts
