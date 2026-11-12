# Device matrix: speech recognition

Which recognition path each device uses (design D4). The primary path is the browser's built-in recogniser. The fallback is server-side transcription of a short in-memory clip through the cost router (`POST /api/transcribe`, task 2.2).

**Rule:** a device that has not been tested defaults to the server fallback and is marked **unverified**. A device moves to the browser path only after a real-device run below shows it works.

Status: one real-device run so far, the memorise lab on an Android phone (12 Nov 2026, below), which is encouraging but is not yet the `/spike/speech` run that moves a device to Verified. Task 2.1 was verified with a mocked recogniser only, so every device is still unverified.

| Device | Browser | Mic | Status | Recognition path | Notes |
|---|---|---|---|---|---|
| Android phone | Chrome | Built-in | Unverified | Server fallback (default) | The memorise lab run on 12 Nov 2026 (Android 10, Chrome 156) was good: words lit as they were said and it felt smooth. That is encouraging but is not the spike run this matrix needs. Run `/spike/speech` on this phone, and if it passes move this row to Verified and add the device to `VERIFIED_BROWSER_DEVICES` in `lib/speech/path.ts` |
| iPhone | Safari | Built-in | Unverified | Server fallback (default) | Browser recognition is the main risk on iOS; confirm with a run |
| Chromebook | Chrome | Built-in | Unverified | Server fallback (default) | Noisy-room case |
| Chromebook | Chrome | Headset | Unverified | Server fallback (default) | Expected best case for browser recognition |

## How to add a result

1. Open `/spike/speech` on the device and run the three sample sentences.
2. Copy the "Copy for the device matrix" block from the bottom of the page.
3. Paste it under **Results** below, then change that row's status to **Verified** and its path to **Browser recognition** (or leave it on the fallback with a reason).

## Running the memorise lab on a device (task 27.12)

The lab at `/lab/memorise` checks more than the spike does: whether words light **while** the student speaks, how fast, whether the screen stays awake, and whether listening survives a screen lock.

1. Open `/lab/memorise` on the device. In **Tester tools** leave the level meter at its default (off on phones, on elsewhere).
2. Do one **From memory** lesson, speaking the answers. Lock the screen for a few seconds during one spoken screen and unlock it.
3. Back on the home screen open **Tester tools** and press **Show and copy the device report**.
4. Paste the block under **Results** below, name the device and microphone, and set that row's status.

Move a device to **Verified** and **Browser recognition** (and add it to `VERIFIED_BROWSER_DEVICES` in `lib/speech/path.ts`, which makes the whole app use the browser recogniser there) only after the `/spike/speech` run passes and, in the lab, words lit while speaking, the report shows no errors, the first word lit within the budget in `docs/performance-budget.md`, and listening resumed after the lock. A device that fails stays on the server fallback; what live listening means there is decided in design D22.

## Results

### Memorise lab run, Android phone, 12 Nov 2026
- Browser: Android 10, Chrome 156 (mobile)
- Built-in recogniser present: yes
- Results marked as still being revised (interim): none seen. The report did not yet print the count of settled results, so the split is unknown for this run; the report now shows both.
- First result after the microphone opened: 1773 ms
- Recogniser sessions opened: 1
- Errors: none
- Level meter: off (the phone default)
- Screen stays awake: supported (taken while a lesson listens; the report was read on the home screen, where it is released)
- Listening came back after a lock or background: 0 times (no lock was tried in this run)
- Result to screen: median 13 ms, 90th 20 ms, worst 25 ms, 75 samples (within budget)
- Speech start to first word lit: median 2117 ms, 90th 3476 ms, worst 6904 ms, 14 samples (within the 2.5 s median budget)
- Gap between results: median 194 ms, 90th 542 ms, worst 3654 ms, 155 samples

## Open

- Fallback vendor: the spike adapter uses OpenAI transcription. The vendor, its price and its accuracy for a 13-year-old's accent are not yet decided. The cap and per-second price in `app/api/transcribe/route.ts` are unverified spike defaults, to be set properly in task 14.1.
