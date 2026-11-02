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

## Results

None yet.

## Open

- Fallback vendor: the spike adapter uses OpenAI transcription. The vendor, its price and its accuracy for a 13-year-old's accent are not yet decided. The cap and per-second price in `app/api/transcribe/route.ts` are unverified spike defaults, to be set properly in task 14.1.
