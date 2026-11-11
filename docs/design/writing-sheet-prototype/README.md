# Writing sheet prototype

A single-page prototype of the new writing flow: a re-typeset sentence builder above, an answer flashcard below, a guided camera (or a pick-up view), and a check. It reads Word sentence builders in the browser.

Design record: `openspec/changes/upload-sentence-builder-pipeline/`.

## Build and run

```bash
python3 docs/design/writing-sheet-prototype/build.py --sheets /path/to/sheets
```

The sheets are teachers' own documents and are never committed (`.gitignore`). Open `dist/prototype.html` in a browser.

## Tests

Playwright scripts (CommonJS, because the repo is ESM) in `tests/` drive the built page. Set `PROTO_HTML` to the built file and `SHEETS_DIR` to the folder of sheets.

| Script | What it does |
|---|---|
| `report-test.cjs` | Prints the in-page builder check for every sheet (reading size at 340px, dead ends, typed round-trip, drilled sentences) |
| `sweep.cjs` | Tests every pair of chunks: how many the engine blocks and allows, plus form lints on the sentences |
| `audit.cjs` | Prints 12 random complete answers per question for a human to judge |
| `walk.cjs` | Replays the free-time walkthrough from the first user test |
| `heldout.cjs` | Parses sheets the interpretations were not written for and prints what the parser found |
| `baseline.cjs` | Uploads those sheets as a layout-order draft with no interpretation and samples its answers |

## What is real and what is not

- Reading the Word files (unzip, tables, merged cells, floating boxes, languages, "(no)" and "más/menos") is real and deterministic.
- The meaning layer (`OV` in `engine.js`: negative opinions, agreement, which lists pair with which) is **hand-written** for four sheets plus free time. It stands in for the model step described in the change.
- The model call, safeguarding patterns and drilled sentences are simulated or examples.
