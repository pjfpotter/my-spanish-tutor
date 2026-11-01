# Performance budget (task 18.6)

The app must stay light on an old school Chromebook and a mid-range phone (CLAUDE.md). This is the budget, how it is enforced, and what has and has not been measured.

## Budget

| What | Limit | Measured 2026-11-01 | Enforced by |
|---|---|---|---|
| JavaScript, all chunks, gzipped | 300 KB | 203 KB | `npm run check:budget` in CI |
| CSS, gzipped | 20 KB | 4 KB | same |
| Web fonts as shipped | 250 KB | 117 KB | same |
| Everything under `public/` (wallpapers, icons) | 3 MB | 8 KB | same |
| Tele animation rate | at most 30 frames a second | 30 | `TELE_MAX_FPS` in `lib/tele/draw.ts`, checked by a unit test |
| Tele canvas pixel ratio | at most 1.5 | 1.5 | `TELE_MAX_DPR`, same test |

Rules that are not numbers:
- Camcorder effects, grain and the photo collage appear only on the home desktop, empty states and transitions. Never over question, caption or feedback surfaces (design D15).
- Wallpapers are compressed static images. Nothing animated that needs a video decoder.
- The calm switch and reduced motion stop idle animation entirely.

## Measurements and what they do and do not show

- **JavaScript cost of drawing Tele:** about 1.7 ms per frame on the development machine (world 0.5 ms, body 0.1 ms, television and eye 1.1 ms).
- **Frame rate under CPU throttling,** headless Chromium, production build, full motion: 60 fps unthrottled; about 22 fps (idle) and 18 fps (speaking) at 4× throttle; about 13 fps and 12 fps at 6× throttle. Capping at 30 fps and 1.5 pixel ratio changed these only slightly.
- **Read these numbers with care.** CPU throttling slows the page's JavaScript, but headless Chromium also rasterises the canvas in software, which a Chromebook's GPU normally does not. The JavaScript cost is small, so the low frame rates are most likely a headless artefact and a pessimistic upper bound. It is not proof the real device is fine.

## Optional manual check (does not block ticking 18.6)

Open `/lab/tele` on a real school Chromebook with calm mode off, and note whether the animation looks smooth while Tele speaks. If it stutters, the next steps in order are: cache the static world and body to an offscreen canvas, lower the frame cap to 20, then drop the antenna and picture effects when the device reports low memory.
