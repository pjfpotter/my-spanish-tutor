# User testing notes

Notes only: no audio, no video, no names. Newest first.

## 19 Nov 2026: El Pasillo scaffolding ladder (`el-pasillo-scaffolding-ladder`)

Automated checks only so far; nobody has played it on a phone yet (task 4.1 of the change).

**Checked by the e2e suite with a stand-in recogniser:** the five stages come in order, the question is shown as text when sound is off and can be asked again, a no-help door cleared with Show me does not count towards the way out and another follows, three clean no-help doors end the run with "You wake up.", and only no-help doors post attempts (numbers only).

**Not checked:** how the closing rate feels now that the last stage has no fixed length, whether Tele's spoken question is clear on a Chromebook headset, and whether three clean no-help doors is the right number. Play one run saying everything (it should end) and one making only noise (it should be caught), then record the stage reached here.

## 12 Nov 2026: memorise lab with live listening (`/lab/memorise`)

Run by the owner on an Android phone and a PC, with one other user, on the Vercel preview of `claude/memorise-live-feedback`. Informal, not the full plan in `docs/user-testing.md`.

**Working:** words lighting up while speaking, moving on without a Done button, the hint after a pause in place of a clock, and credit for carrying on after a fudged bit.

**Problems found.** Each is a task in section 27 of the change's `tasks.md`; none is fixed yet.

| # | What happened | Task |
|---|---|---|
| 1 | On a longer sentence, some bits lit and others did not. The student got stuck, not knowing what to do next. More support is needed at that point. | 27.5 |
| 2 | The same pronunciation error came back again and again with no help offered. | 27.6 |
| 3 | A word that appears more than once in the sentence lit up everywhere at once when it was said once. | 27.7 |
| 4 | A student missed one bit and finished the rest of the sentence. They were not pointed back to the bit they missed. | 27.8 |
| 5 | On the phone, recognition and word highlighting lagged a touch behind the PC. | 27.9 |
| 6 | Going from a speaking screen to a tapping screen confused a user. It needs a clear signal with very little text. | 27.10 |
| 7 | The Android screen lock came on mid-lesson and killed the microphone. The lesson dropped into checking your own answer. | 27.11 |
