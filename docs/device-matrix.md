# Device matrix: speech recognition

Which recognition path each device uses (design D4). The primary path is the browser's built-in recogniser. The fallback is server-side transcription of a short in-memory clip through the cost router (`POST /api/transcribe`, task 2.2).

**Rule:** a device that has not been tested defaults to the server fallback and is marked **unverified**. A device moves to the browser path only after a real-device run below shows it works.

Status: no real-device runs have been recorded yet. Task 2.1 was verified with a mocked recogniser only, so every device below is unverified.

| Device | Browser | Mic | Status | Recognition path | Notes |
|---|---|---|---|---|---|
| Android phone | Chrome | Built-in | Unverified | Server fallback (default) | Expected to work with browser recognition; confirm with a run |
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

Move a device to **Browser recognition** only if the report says interim results were seen, the first result came back without errors, and listening resumed after the lock. A device that fails stays on the server fallback; what live listening means there is decided in design D22.

## Results

None yet.

## Open

- Fallback vendor: the spike adapter uses OpenAI transcription. The vendor, its price and its accuracy for a 13-year-old's accent are not yet decided. The cap and per-second price in `app/api/transcribe/route.ts` are unverified spike defaults, to be set properly in task 14.1.
