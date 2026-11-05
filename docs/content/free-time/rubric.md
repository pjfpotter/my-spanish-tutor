# Free time: rubric for classifying answers

Question: **¿Qué haces en tu tiempo libre?** (What do you do in your free time?)

Classifies an answer as **survival**, **good** or **showing off** by counting features from the free time sentence builder. It follows the mark-scheme requirement in `course-content` (countable features, no numeric grade shown) and the teacher's calibration in [calibration.md](calibration.md). Sentence builder: [sentence-builder.md](sentence-builder.md).

The thresholds are a proposal checked against the teacher's three original models and nine generated answers. Tune them with real student answers.

## The basic frame

A **justified opinion** is a starter from the sentence builder, then an activity, then *porque*, *ya que* or *dado que*, then a reason.

Example: *Me gusta jugar al fútbol porque es divertido.*

Repeating the frame for more activities adds nothing to the level.

## Seven extra features

Count each feature once, however many times it appears.

| # | Feature | What counts |
|---|---|---|
| E1 | Contrast | *sin embargo* or *aunque* |
| E2 | Frequency or time phrase | *todos los días*, *los fines de semana*, *los sábados*, *por la tarde*, *una vez a la semana*, *a veces*, *de vez en cuando* |
| E3 | *Lo hago* / *lo hacemos* | With or without *con* + person |
| E4 | Another time frame | *Me gustaría* or *voy a* + infinitive |
| E5 | Closing line | *Tengo mucho tiempo libre. ¡Qué guay!* or *No tengo mucho tiempo libre por los deberes. ¡Qué rollo!* |
| E6 | Reason beyond *es* + adjective | *es bueno para la salud*, *me hace reír*, *me relaja* |
| E7 | Second justifier | *ya que* or *dado que* used as well as *porque* |

E3, E4 and E5 are the **hard features**. Students avoid them (especially *lo hago* and *lo hacemos*), and they matter most for top marks.

## Classification

| Level | Rule |
|---|---|
| **Survival** | At least one justified opinion and no extra features. This is the floor: any on-topic attempt starts here. |
| **Good** | A justified opinion plus at least one extra feature, but not enough for showing off. |
| **Showing off** | A justified opinion plus **at least 5 of the 7 extras**, including **at least 2 of the 3 hard features** (E3, E4, E5). |

The level is the highest one whose rule is fully met. No numeric grade is shown.

## Rules for applying it

- **Chunks, not perfection.** A feature counts if the sentence builder chunk is clearly present. Accents, small spelling slips and recognition failures never lower the level. Accuracy is separate feedback.
- **Words outside the sentence builder** do not count as features. They are flagged, not penalised.
- **One thing to fix.** Feedback names a single next feature. For survival it is usually a contrast or a time phrase. For good it is whichever hard feature is missing.
- **Survival is the floor.** If there is no justified opinion yet, the level is still survival and the one thing to fix is "add *porque es…*".

## Worked checks

| Answer | Extras | Hard features | Level |
|---|---|---|---|
| Teacher's Good Enough model | 0 | 0 | Survival |
| Teacher's Really Good model | 4 (E1, E2, E3, E6) | 1 (E3) | Good |
| Teacher's Amazing model | 7 | 3 | Showing off |
| Generated survival 1 to 3 | 0 | 0 | Survival |
| Generated good 1 | 2 (E1, E6) | 0 | Good |
| Generated good 2 | 3 (E2, E4, E7) | 1 (E4) | Good |
| Generated good 3 | 4 (E1, E2, E3, E6) | 1 (E3) | Good |
| Generated showing off 1 to 3 | 7 | 3 | Showing off |

## Notes

- The teacher's Really Good model has several features and still sits below showing off. That is why two hard features are required, not just a feature count.
- Feature tags for the app's chunk model (ARD: opinion, justification, connective, sequencer, adjective, tense, idiom) map onto this as: justification = the basic frame and E6, connective = E1 and E7, sequencer = E2, tense = E4, idiom = E5. *Lo hago* / *lo hacemos* (E3) has no tag yet and would need one.
