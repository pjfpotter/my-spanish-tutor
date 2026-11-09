# Writing flow: problem, research, options and questions

Status: **open**. Nothing here is decided. It feeds the "Writing flow" open decision in `openspec/changes/ks3-spanish-speaking-tutor-v1/design.md` (D20) and the `answer-writing-coach` spec. Written 9 Nov 2026 from the user-testing notes.

## 1. The problem, in the owner's words

- The writing flow "is not like anything else", so it needs explaining, and the explaining is itself a burden.
- There is "too much information on one page": a cognitive overload problem.
- Many small decisions about the flow are unmade.
- Ideas floated: an onboarding video; an explicit link to the sentence builders students already know; a Flippity-style manipulative; a card sort with coloured cards; building blocks; **bigger coin values for answers instead of the current rubric definitions**.

## 2. What the current flow asks of a student (from the spec and prototype handoff)

On one screen a student is asked to: pick a target level, read a model answer, tap a chunk, read a list of fitting swaps, notice a "lowers level" warning, read a feature checklist, read a whole-test checklist, read one suggestion, read a load note, then confirm. That is about ten separate things to read and decide. It is also a different interaction from every other phase.

## 3. Research (short, with honest limits)

- **Cognitive load theory** says learners novice at a task do better with worked examples and completion problems (a half-finished answer to finish) than with open problem solving, then fade support as they improve. The writing flow currently starts with a model answer (a worked example), which fits, but then shows every control at once. [Worked-example effect](https://en.wikipedia.com/wiki/Worked-example_effect); [overview of split attention, modality and completion effects in language education](https://sc01.tci-thaijo.org/index.php/tureview/article/download/40755/33769). Caveat: these are secondary sources and a Wikipedia article. I found nothing applying the theory to language-app interfaces.
- **Split attention**: information needed together should sit together. A feature checklist in one place and the chunks in another forces the student to look back and forth.
- **Duolingo's sentence exercise** is a word bank of tiles holding the target words plus a few distractors drawn from recently taught words, tapped into order; a tapped tile can be tapped again to return it. [Duolingo blog](https://blog.duolingo.com/how-duolingo-experts-work-with-ai). Most learner-built tools offer tap-to-add on phones and drag on desktop, with tiered hints such as revealing the first word. [Example guide](https://sublearn.com/help/guides/sentence-builder). I found no independent research comparing tap with drag for retention, so treat that choice as a usability decision, not an evidence-based one.
- **Flippity**: the link you sent loads as a **spinning-wheel randomiser**, and its entries are not in the page text, so I could not see what you meant. Flippity's templates are built on a Google Sheet, and the closest ones to what you describe are *Manipulatives* (draggable cards on a board) and *Word Scramble*. Please tell me which template you meant. See question Q1.
- **Teaching practice**: sentence cards laid out in a row and ordered by students is a standard classroom activity ([example](https://learn.k20center.ou.edu/strategy/4073)). Students already know sentence builders, so a card or block metaphor can borrow that familiarity instead of needing a video.

## 4. Design principles I suggest for the writing flow

1. **One decision per screen.** Pick a target, pick an answer, finish it, confirm. Never show the checklist and the swap list and the target picker together.
2. **Start from a worked example, finish it.** The student sees a complete answer first, then changes parts of it (a completion problem), never a blank page.
3. **The sentence builder is the interface.** Show the answer as cards or blocks laid out like the sentence builder the student already uses, with colour by chunk kind (starter, activity, reason, and so on). Use the same colours as the automatise phase chunks so the colours carry over.
4. **Show only what the next tap needs.** Swaps appear only on tapping a card.
5. **Reward, not grade.** Show progress as filling blocks and a coin value, not a checklist of rules (see option C).
6. **Do not hold back strong students.** A confident student can skip straight to a target and confirm in a few taps.
7. **No unexplained Spanish and no English in the tutor's voice.** All instructions are plain English; the Spanish is the content.

## 5. Options

### A. Card row (tap-to-swap), the smallest change
The answer is a row of coloured cards, one per chunk, with the English gloss under each. Tap a card and a small tray of fitting swaps opens in place. Everything else (checklist, load note) moves behind one "How is this scoring?" link.
- Strengths: smallest change from the prototype; keeps the tested rules; fits one screen.
- Weaknesses: still a new interaction; the "level" idea still has to be explained.

### B. Card sort (build from scratch, scaffolded)
The student starts with the sentence builder as columns of coloured cards (opinion starters, activities, reasons...). They drag or tap cards into a row to build the answer; the model answer is shown as a ghost outline they can copy. Support fades: a full model answer, then a model with gaps, then an empty row.
- Strengths: closest to the classroom sentence builder; the fading ladder matches the worked-example evidence and the automatise chunk ladder.
- Weaknesses: more build effort; needs fit rules strong enough that every row is valid Spanish; risk of bad combinations (the existing fit rules cover this).

### C. Blocks that grow, coins as the score
The answer is a tower of blocks, one per chunk kind. Adding a block that makes the answer richer (a reason, a time phrase, a plan, and so on) grows the tower and raises the coin value of that answer, shown as a number and a growing pile of coins. The three named levels disappear from the student's view. Rock solid, Stepping out and Showing off stay in the data as thresholds, but the student only sees "worth 5 coins, add a time phrase to reach 7". Coins are paid when the answer is later memorised and automatised, not on writing it, so a rich answer must also be learnable.
- Strengths: matches your idea of coin values replacing the rubric definitions; no vocabulary to explain; the choice becomes "worth more, more to learn".
- Weaknesses: removes the named levels the teacher chose; risks players picking the biggest answer and then being overwhelmed (the load note must stay); needs a rule that coins for a big answer are earned during memorising so it cannot be gamed; touches `engagement-rewards`.

### D. Hybrid (my recommendation)
B's fading structure with C's coin value, in A's compact layout. Concretely: step 1 pick how big (3 cards with a coin value and a one-line feel); step 2 see the model answer as a card row; step 3 tap any card to swap; step 4 confirm. The level is shown only as a coin value. The rule list lives behind a link.
- Why: it keeps the screen to one decision at a time, reuses the sentence-builder look, and removes the biggest explanation burden (the level names and the checklist).

## 6. Onboarding

- A **video** costs production time and goes stale when the interface changes. I suggest a 20-second **inline demonstration** instead: the first time, Tele "types" one swap into the card row by itself, and the student repeats it. Skippable, and never shown again.
- If the owner prefers a video, it should be under 30 seconds, captioned and skippable.

## 7. Questions to answer (in order of leverage)

**Direction**
- Q1. Which Flippity template did you mean (the link I could open is a spinning wheel)? What about it should the writing flow copy: dragging cards, a board, or randomness?
- Q2. Should the student *build* (B), *edit a given answer* (A), or *pick and finish* (D)? Which one feels like what students already do with a sentence builder in class?
- Q3. Do you want the named levels to disappear from the student's view (C and D) or stay (A and B)?

**Coin values**
- Q4. What should an answer's coin value be based on: the number of extras, or the extras weighted by how hard they are to learn (so *lo hago* is worth more than a time phrase)?
- Q5. When are the coins paid: on writing, on memorising it, or both? (I suggest on memorising and automatising, so a big answer only pays if it is learned.)
- Q6. Should the teacher be able to cap the maximum value so a class stays on realistic answers?

**Pacing and choice**
- Q7. How many answers must a student write before moving on: all five, or one at a time so memorise can start sooner?
- Q8. Should a student be allowed to jump into memorising one answer while still writing the others? (I suggest yes, in line with "do not hold me back".)
- Q9. Is changing a confirmed answer after memorising allowed? What happens to progress on it?

**Content**
- Q10. Who authors model answers when the sentence builder changes: you, the teacher at course setup, or the setup call with a rubric check?
- Q11. Where do glue words like *y* and *pero* sit in the card row? (They are not in the sentence builder.)
- Q12. For a course with more than one sentence builder, are cards from both builders available in one row or only the one matching the question? (I suggest only the question's own builder.)

**Onboarding**
- Q13. Is a first-time inline demonstration acceptable, or do you want a video?

## 8. What the spec records meanwhile

The `answer-writing-coach` spec keeps the tested behaviour (three named levels, rules from data, model answers first, swaps, confirmation) and adds only these binding rules until the questions are answered: one decision per screen, nothing below the fold, an always-available exit, and plain English instructions. D20 in `design.md` lists the open questions.
