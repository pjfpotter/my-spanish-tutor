# Audio pipeline

How every spoken clip in the app is made. Clips are built once, offline, and then only played; nothing is synthesised while a student practises.

## What gets built

`planClips()` in `lib/audio/manifest.ts` lists every clip the app needs:

- each course question at three speeds: slow (0.7), normal (1.0), fast (1.2). The provider is asked once per text for the natural voice; slow and fast are made locally from that clip with ffmpeg, which costs nothing (changed 12 Nov 2026, see `scripts/build-audio.mjs`);
- each phrase-bank line (`lib/tele/phrase-bank.ts`) at normal speed.

There is one voice, Tele's (see `docs/voice-decision.md`). The same text at the same speed is one clip, however many places use it.

## Where clips live

`public/audio/clips/<slot>.mp3` and `<slot>.json`. The slot is a hash of the text and speed, so identical text is stored once. The JSON is the clip's timeline: word times, a downsampled loudness envelope (one value per 30 ms), and a feeling track. It also records the provider, voice, model, speed and a source hash. `lib/audio/built.ts` is generated and lists the clips that exist so the browser only asks for those.

A clip is up to date when its source hash (text, voice, model, speed) matches. Change any of those and the clip is stale and is rebuilt; nothing else is ever rebuilt.

## Commands

```
npm run build-audio                    # DRY RUN, the default: lists what is missing and the estimated cost. Spends nothing.
npm run build-audio -- --yes           # builds only the missing or stale clips
npm run build-audio -- --yes --only=lines      # or --only=questions
npm run build-audio -- --yes --force   # rebuilds even up-to-date clips. This costs money again.
```

Needs `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_TELE` in `.env.local` (and `ELEVENLABS_MODEL`, default `eleven_multilingual_v2`). With `DATABASE_URL` in `.env` the spend is logged and counts toward the cap across runs.

## Regenerating one clip

Edit its text (or delete its two files in `public/audio/clips/`), run the dry run to see that exactly one clip is listed, then run with `--yes`. Every other clip is left alone.

## Cost control

Every call goes through the cost router (`lib/cost-router`) as service `elevenlabs-tts`, with a cap of £3 per 30 days. Reaching the cap stops the build at once. The per-character price in `lib/audio/build.ts` is an unverified estimate: check it on elevenlabs.io and compare it with the cost log after the first real build. Tests use a stub provider and never call the vendor.

## The vendor is isolated

Only the `Synthesiser` and `Decoder` objects in `scripts/build-audio.mjs` know about ElevenLabs and MP3 decoding. To change vendor, write another `Synthesiser`; the planning, hashing, timelines and cost routing do not change. The unofficial edge-tts voice is prototype only and must not ship.

## Timelines

Word times come from the provider's character timestamps (`lib/tele/alignment.ts`). The loudness envelope is computed from the decoded audio when the clip is built (`lib/tele/envelope.ts`), so the browser never decodes audio. The feeling track is baked: a phrase-bank line carries its own feeling; a question has none and uses the small rule-based cue list in `lib/tele/feeling-track.ts`. No language model is called.
