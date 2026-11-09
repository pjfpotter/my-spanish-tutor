# Writing flow: problem, research, decisions and what is still open

Status: **direction decided (9 Nov 2026), details open**. The owner answered the 13 questions and added notes to the principles and options. The decisions are in section 7; the specs now follow them (`answer-writing-coach`, `course-content`, `engagement-rewards`, D20 in `design.md`). Written 9 Nov 2026 from the user-testing notes.

## 1. The problem, in the owner's words

- The writing flow "is not like anything else", so it needs explaining, and the explaining is itself a burden.
- There is "too much information on one page": a cognitive overload problem.
- Many small decisions about the flow were unmade.
- Ideas floated: an onboarding video; an explicit link to the sentence builders students already know; a Flippity-style manipulative; a card sort with coloured cards; building blocks; **bigger coin values for answers instead of the current rubric definitions**.

## 2. What the old flow asked of a student (from the spec and prototype handoff)

On one screen a student was asked to: pick a target level, read a model answer, tap a chunk, read a list of fitting swaps, notice a "lowers level" warning, read a feature checklist, read a whole-test checklist, read one suggestion, read a load note, then confirm. That is about ten separate things to read and decide, and a different interaction from every other phase.

## 3. Research (short, with honest limits)

- **Cognitive load theory** says learners novice at a task do better with worked examples and completion problems (a half-finished answer to finish) than with open problem solving, then fade support as they improve. [Worked-example effect](https://en.wikipedia.com/wiki/Worked-example_effect); [overview of split attention, modality and completion effects in language education](https://sc01.tci-thaijo.org/index.php/tureview/article/download/40755/33769). Caveat: secondary sources and a Wikipedia article. I found nothing applying the theory to language-app interfaces.
- **Split attention**: information needed together should sit together.
- **Duolingo's sentence exercise** is a word bank of tiles holding the target words plus a few distractors, tapped into order; a tapped tile can be tapped again to return it. [Duolingo blog](https://blog.duolingo.com/how-duolingo-experts-work-with-ai). Most learner-built tools offer tap-to-add on phones and drag on desktop, with tiered hints such as revealing the first word. [Example guide](https://sublearn.com/help/guides/sentence-builder). No independent research compares tap with drag for retention, so that choice is a usability decision.
- **Flippity** (resolved): the link is a four-wheel slot-machine randomiser (Who, What, When, Where), one column per wheel, driven by a Google Sheet, with per-wheel spin, step and remove controls. Notes are in `docs/knowledge/flippity-randomizer.md`. Its relevance is the columns-of-choices structure, which is the same shape as a sentence builder (starter, activity, reason, time phrase).
- **Teaching practice**: sentence cards laid out in a row and ordered by students is a standard classroom activity ([example](https://learn.k20center.ou.edu/strategy/4073)). Students already know sentence builders, so a card or block metaphor borrows that familiarity.
- **Aesthetic reference (owner's idea, not researched)**: the 1967 TV programme *Look and Read*, with a "build yourself a word" feel, fits the nostalgic look and the block-building metaphor.

## 4. Design principles, with the owner's notes applied

1. **One decision per screen. No target picking.** Everybody starts at ground zero. Students build an answer that works, then are nudged to extend it until they reach the challenge zone that feels right: just outside comfortable (zone of proximal development). If students get stuck in practice (repeatedly failing to recall a longer answer or specific words and phrases) they can opt to **prune** their answers.
2. **Start from blank spaces, with an optional starter.** *Changed from the first draft.* Opening the writing mode on a ready-made answer is not intuitive, so everyone starts with empty slots. A student can opt to generate a semi-random model answer as a starting point, and may keep using those if they are rushing or less engaged. It is still not a blank page, because they fill the spaces with ready-made chunks.
3. **The sentence builder is the interface.** Show the answer as cards or blocks laid out like the sentence builder the student already uses, with colour by chunk kind (starter, activity, reason and so on), using the same colours as the automatise phase chunks. The more it looks like a sentence builder, the more it uses the schema students already have for decoding it.
4. **Show only what the next tap needs.** Swaps appear only on tapping a card. (Confirmed.)
5. **Reward, not grade.** Progress is filling blocks and a value, not a checklist of rules. If a student wants to know why an answer is stronger or weaker, an **analysis** option lists the features that score points. It is animated: coloured highlighting picks out bits of text with a reward sound, for example highlight *sin embargo* and flash "connective!" with a coin animation, so analysis feels like a quick praise session. It must be quick and cancellable.
6. **Do not hold back strong students.** A confident student builds and confirms in a few taps.
7. **Plain English instructions; Spanish is the content.** This matches the current exam specification, where the rubric is now entirely in English at GCSE.

## 5. Options, with the owner's notes applied

### A. Card row (tap-to-swap)
A row of coloured cards, one per chunk, with the English gloss under each. Tap a card and a tray of fitting swaps opens in place. *Owner:* the "level idea has to be explained" weakness no longer applies, because there are no levels any more: added detail is rewarded with more value.

### B. Card sort (build from scratch, scaffolded) — chosen as the base
The student starts with the sentence builder as columns of coloured cards and builds the answer in a row. A model answer can be shown as a ghost outline to copy. *Owner:* bad combinations must not be offered, but a sentence builder cannot be made fully deterministic, so the app needs guidance about which phrases work together. That guidance (the fit rules) currently works well and stays.

### C. Blocks that grow, value as the score — chosen for the reward
Adding a richer block grows the answer and raises its value, shown as a number and a pile of the currency. *Owner:* building with a sentence builder is the most coherent metaphor; consider **starting with the main verb phrase and building outwards**; the nostalgic *Look and Read* style could suit the visuals.

### D. Hybrid — chosen
B's build-from-blank structure with C's value, in A's compact layout, refined by the notes: start blank, optional generated starter, tap a slot to fill or swap, value grows as detail is added, no named levels, and analysis on request.

## 6. Onboarding

Skipped for now. *Owner:* "I would rather the flow was so intuitive it did not need a demo at all." The flow is judged on whether a first-time student can use it without explanation.

## 7. Decisions (answers to the 13 questions)

| # | Decision |
|---|---|
| Q1 | Flippity resolved as a four-wheel randomiser; see `docs/knowledge/flippity-randomizer.md` |
| Q2 | **Build** (option B base) |
| Q3 | **Remove the named levels** from the student's view and from the spec. No Rock solid / Stepping out / Showing off. Extra detail earns more value |
| Q4 | Value is **a blend** of the number of extras and how hard each is to learn |
| Q5 | Paid when **memorising and automatising**, not on writing |
| Q6 | **No** teacher cap on value |
| Q7 | **Incentivise writing all five** with a bonus (a "coin dump") |
| Q8 | **Yes**, a student may start memorising one answer while still writing the others |
| Q9 | **Yes**, a confirmed answer can be changed, which **resets its progress**. The app also suggests changing it when progress stalls and helps simplify, preferring cognates and high-frequency chunks |
| Q10 | **The model call** writes model answers. The teacher scans a sentence builder, can review the course details and can edit them. Editing opens a content-safety risk (a bad actor adding inappropriate material), so edits are screened (see `teacher-course-setup`) |
| Q11 | Glue words (*y*, *pero*, *también*) sit in a "cement" tray of joining pieces between blocks (owner's "cement mixer" idea) |
| Q12 | Only the sentence builder **explicitly linked to that question** |
| Q13 | No demo and no video; the flow must be intuitive on its own |

Other: the currency is renamed **euros** (confirmed; see `engagement-rewards`). Photo scan and the teacher-facing flow stay **stretch**, not core (confirmed).

## 8. Smaller questions: proposed answers (for the owner's review)

These were answered by the assistant on 9 Nov 2026 and are **proposals, not decisions**. Change any that feel wrong.

- **Euros.** Confirmed as the display name for the existing currency everywhere, shown with the "€" sign in the interface. It never appears with a purchase flow, a price in real money, or wording like "pay". Code keeps the ledger table name; only the display text changes.
- **When to nudge.** Only after an answer is complete, valid and has been practised once. Then one optional extra is offered at a time, chosen from features the student has not used yet and sized to sit just beyond their current answer (the next-cheapest feature by difficulty weight, recycled chunks first). A dismissed nudge is not repeated for that answer in the same session.
- **Pruning.** A student chooses what to remove. The app suggests the most recently added or hardest-weighted feature first. Pruning keeps progress on the chunks that remain; only the changed joins are reset. A wholesale change of a confirmed answer resets all progress (Q9).
- **Value formula.** Value per feature = 1 + difficulty weight, where weight is 0 for easy features (time phrase, contrast, reason beyond "es"), 1 for medium (second justifier, another time frame) and 2 for hard (lo hago, plan or wish, closing line). The justified-opinion frame is worth 3. The weights live in the calibration data and are tuned against the teacher's nine example answers, so their order from simplest to richest is preserved.
- **All-five bonus.** Equal to the total value of the lowest-valued answer, paid once when the last answer is confirmed. It is paid at confirmation, not memorising, because it rewards finishing the writing; the value of each answer is still paid later through learning.
- **Main verb phrase first.** Slots appear in the sentence builder's left-to-right order, but the first slot a student fills is the activity (the main verb phrase), then the starter and reason fill around it. This is a testable default: if testers find it confusing, revert to left to right.
- **Analysis animation.** Highlights up to five features in order of value, about a second each, with a reward sound per feature and a running total. A "skip" ends it at once, and it can be replayed from the answer.
- **Photo scan and edit screening.** Stretch. If built: the vision call goes through the cost router, edits are screened by length limit, a blocklist, a word check against the Spanish and English word lists, and visibility only to those with the class code, and the developer can disable a course.
