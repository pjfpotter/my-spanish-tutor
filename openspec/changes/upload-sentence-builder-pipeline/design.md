# Design

## Context

See `proposal.md` for why. What exists:

- A prototype (`docs/design/writing-sheet-prototype/`) with a document reader, a data-driven engine that still takes its rules from hand-written code, an in-page verification check and Playwright scripts. Its history is in the owner's three testing rounds.
- The v1 specs say the writing stage makes no language-model call and that fit rules are course data. The owner has agreed to change that on this branch.
- Seven real sheets, none committed (teachers' own documents). Four have a hand-written meaning layer. Three were held out and used only to test the reader and to measure a layout-order draft.

### What the seven sheets show

| Feature | Seen in | Consequence |
|---|---|---|
| No column headers or colours; each column is one table cell holding a list | all | The model must name columns and roles |
| Merged cells carry meaning: garment rows line up with their own colour lists; one adjective list serves two frames | clothes, bedroom | Alignment and shared lists are in the schema |
| Spanish and English are separated differently per sheet: bold plus brackets, no bold plus italic brackets, bold plus italic square brackets | all | Reader uses brackets, italics, bold and a language check |
| Floating text boxes hold extra chunks, sometimes split across lines | clothes, last year | Read separately, merged on "=" |
| Optional words "(no) soy", alternatives "más/menos", "dos/ tres / cuatro personas", unclosed brackets, several chunks in one paragraph | physical descriptions, family | Reader expands them |
| Rows encode polarity (positive verdicts above negative ones, with a contrast connector beside the negatives) | last year (past), family | Model reads layout groups as hints |
| Tense must agree between a starter and "porque es / porque era"; person changes verb forms ("fuimos" with "con mis amigos") | family, past | Schema has agreement rules beyond gender |
| Negation variants, shaded cells, images | physical descriptions | Variants expanded; shading and images noted, not relied on |
| Teacher slips: spelling ("marrónes", "perdida"), gender ("el pared"), English glosses in the wrong tense, missing glosses | most | Corrections at upload |
| Sheets built to produce a paragraph, not one sentence | bedroom, physical descriptions, family | Sentence frames, each complete or absent |

### What testing measured

- Pair space: about 16,000 item pairs across five sheets, of which the prototype's rules allowed about 8,300. Whole sentences range from about 10^3 to 10^11 per sheet and cannot be tested; pairs, and the few triples that rules reference, can.
- Automatic checks catch form faults (fragments, Spanish in English, repeated words, dangling endings, typed round-trip). They cannot catch meaning conflicts.
- A layout-order draft with no interpretation reads and round-trips typed text (about 80 to 100 per cent of random answers) and yields nonsense sentences. The interpretation is where the value is.

## Goals / Non-Goals

**Goals:**
- Upload and go: a teacher uploads a sheet and students can use it with no review step.
- A student is never blocked on a good sentence and rarely credited a bad one, judged by the exam rule.
- Every model output is data validated by rules before any student sees it.
- Bounded, cached cost; the practice loop stays model-free.

**Non-Goals:**
- A teacher review, approval or editing screen.
- Photo, PDF or Google Docs input in this change.
- Using model sentences from lessons as a source or a test.
- Memorising multi-sentence answers.

## Decisions

### D1. Four stages with a safe fallback
Read (deterministic), draft (model), verify and repair (rules, then model), fall back (rules). The fallback is the layout-order draft plus a codes-only check of the finished answer, so a failed upload still gives students a working, less guided sheet.

### D2. The interpretation is data, not code
The prototype expresses rules as functions (`accept`, `allowIf`). The schema must state the same things as data: chunk roles and tags, slot definitions (columns, accepted roles, dependencies, alignment, agreement, distinctness), sentence frames with core slots, fixed words and lists, questions with the parts they use, and rule triples for polarity and tense. Every reference must resolve to a chunk or slot the reader produced. A validator rejects anything else.

### D3. The verification gate is the test harness
The checks that found the prototype's faults run at upload: pair sweep, fragments and dangling endings, English-in-English, typo lexicon hits, typed round-trip, dead ends on required slots, reading size at 340 px. A failing draft goes back to the model with the failure list, at most three attempts, then falls back (D1). The same checks run in CI against synthetic fixture sheets.

### D4. Corrections are bounded edits with the original kept
Allowed: spelling, gender and number agreement with an article, a missing English gloss, a wrong-tense English gloss. Not allowed: changing vocabulary or meaning, adding or removing chunks. A deterministic check rejects a Spanish edit that is large (edit distance over two) or that leaves the sheet's own word bank. The original is stored and the student-facing sheet and subtitles use the corrected text.

### D5. Pair verdicts: fits, odd, clash, with agreement to block
The model judges pairs once at upload, in batches, by the exam rule: credit anything grammatical that could be true. Two independent passes run; a pair is a hard block only when both say clash, a soft flag when they differ. A pair the model calls odd is allowed and not flagged to the student, because odd is not wrong. Rule triples (starter, connector, reason) and cross-sentence references are judged as triples. Calibration is by blind audits (D8), not by a teacher.

### D6. Untrusted document, constrained output
The document text is passed as quoted data in structured fields. The model returns codes and chunk-id edits only; no text it returns is shown to a student except validated corrected chunks. Uploads are screened for inappropriate content before and after drafting.

### D7. Cache by content, not by student
Keys are the document content hash plus the prompt and schema version. Nothing about a student is in a key or a prompt. Re-uploading an unchanged sheet makes no new calls. Changing a prompt version reprocesses on next upload.

### D8. Acceptance by blind audit on held-out sheets
For each held-out sheet, 100 random complete answers are judged blind. The target is no more than 2 per cent unacceptable under the exam rule, with no half-built sentences. The owner is the oracle during development. Sheets used to tune prompts are never the ones used to accept.

### D9. The writing screen as tested
The card shows the real sentence; chips are handles in one scrolling strip; the active slot's list dims what it cannot take, with the reason on tap; extras are behind "Add more"; frames show half-built parts with "…"; lists take up to four items; "Check it" is pinned and the result panel always fits; the sheet keeps at least about 45 per cent of the height at 340 by 640. Pick-up mode is available as a setting and is not the default until the owner approves it.

### D10. Teachers are told what was corrected
After processing, the teacher sees the number of corrections and each one (original, corrected, and the type: spelling, agreement, missing English, wrong-tense English). It is informational: students never wait for it and nothing is held back. The same list stays on the course page. The originals are kept so a correction can be reversed later.

### D11. The wait is part of the experience
A sheet takes about 30 to 60 seconds to process. The upload screen shows Tele "reading" the sheet, a progress bar and rotating Spanish messages with English subtitles ("Leyendo tu hoja…", "Contando las palabras…"). Messages are tied to the real stages (read, draft, check, repair) so they never run ahead of the work. Motion stops under reduced motion and the calm switch, and the text still changes.

### Relationship to the v1 change
This change supersedes these requirements of `answer-writing-coach` and `course-content` in the unarchived v1 change: "Guidance about what fits" (fit rules from data, now model-drafted and verified), "Only words from the allowed sets" (typed own words are allowed with a safeguarding screen), "Show only what the next tap needs" (extras behind Add more), and the statement that writing makes no model call (upload-time calls are allowed). `teacher-course-setup` gains upload-and-go. The rest stands.

## Risks / Trade-offs

- **Final model verdicts with no review** can block good sentences or credit bad ones. Mitigation: agreement-to-block, the exam rule, blind audits, and a fail-soft `odd` outcome.
- **Silent corrections** may surprise a teacher whose printed sheet differs. Mitigation: originals kept and the teacher is told what changed (D10).
- **Upload latency and cost** for large sheets. Mitigation: batching, caching, budget caps in the cost router, a visible progress state.
- **Overfitting to seven sheets.** Mitigation: D8 and a growing fixture library of synthetic sheets, one per layout family.
- **Model drift.** Mitigation: prompt and schema versioning and re-audit when either changes.

## Decisions taken by the owner

- Teachers are told how many corrections were made and what they were (D10).
- A 30 to 60 second wait is acceptable with Spanish loading messages and animation (D11).
- The target is no more than 2 per cent unacceptable answers (D8).
- No model key is available in the cloud session. Everything that needs a real model (drafting, repair, pair judging, the held-out acceptance run) is written against stubs and run later, locally, by the owner.

## Open Questions

- Which model tier for drafting, repair and pair judging, and what monthly cap? To be set from the cost log after the first real uploads.
- Where do interpretations live when a teacher re-uploads an edited sheet? Default: a new content hash, a new interpretation.
