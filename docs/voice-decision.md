# Production voice decision (task 4.1)

| | |
|---|---|
| **Status** | **Decided** for the student project. A launch gate applies (see Decision). |
| **Date** | 2026-11-01 |
| **Voice** | ElevenLabs Voice Design voice `UwUfvuU7dZdSX47WuYCC`, made by the developer (Tele's character voice) |
| **Plan** | ElevenLabs Starter (paid, so commercial use is permitted by the terms) |

## Decision

This is a student project. The ElevenLabs voice is the production voice for it. **Before launching to real users, the developer will seek ElevenLabs' written approval** for an app directed at under-18s (finding 1), and will fall back to another vendor (option B) if it is refused. Until then the voice is used for development and testing with the first test user, on the developer's own judgement.

**Decided 2026-11-02:** version one uses one voice, Tele's. The spec, design, PRD, ARD and tasks 4.2, 6.1 and 9.1 were amended to three speeds in one voice; rotating voices is deferred until a second voice is chosen.

## Findings

Read from the official pages on 2026-11-01 (both "Last Updated: 09 October 2026"): [Prohibited Use Policy](https://elevenlabs.io/use-policy), [Terms of Service (non-EEA)](https://elevenlabs.io/terms-of-use) and [Terms of Service (EEA, Switzerland, UK)](https://elevenlabs.io/terms-of-use-eu). The pricing and API notes come from third-party guides and docs search results and are unverified; check them on elevenlabs.io before relying on them.

1. **Apps directed at under-18s need written approval.** Use Policy, section 1, "Use by and for Minors":
   > "Apps, products, or experiences directed at individuals under 18 are prohibited unless we have assessed and approved them in writing. Where approved, you must obtain any parental consent required by applicable law and maintain records of that consent."

   The policy says it applies to products "built with our technology". This app is directed at 12 to 13 year olds. Neither page separates pre-generated audio files from live API use, and neither names an education route. This is the main risk to the plan. I am not a lawyer; the safe reading is that written approval is needed.
2. **Account holder must be 18+.** Fine: the developer holds the account and students never use ElevenLabs directly.
3. **Commercial use needs a paid plan.** Terms section 1(c): Free users may only use the Services for non-commercial purposes; paid users may use them commercially, subject to the Use Policy. Output rights stay with the user (section 4(c)(ii)). The terms contain no attribution requirement. A third-party guide says the Free plan requires attribution; the official terms don't say so.
4. **Pricing (unverified):** Free is about 10,000 credits a month. Starter is about $6 a month with about 30,000 credits and a commercial licence. Roughly one credit per character on the standard model.
5. **Timestamps and speed (verified 2026-11-01 with a live call on the Starter plan):** `POST /v1/text-to-speech/{voice_id}/with-timestamps` returns `audio_base64` plus `alignment` with a start and end time for every character, on both `eleven_multilingual_v2` and `eleven_v3`. `voice_settings.speed` is accepted: 0.7 made a 2.0 second line 2.6 seconds, about 30% longer. Whether that is slow enough for the "slow" variant is a listening check for task 4.2. No `output_format` above 128 kbps mp3 was needed.
6. **Budget fit.** About 30 question clips plus a phrase bank of around 100 short lines is a few thousand characters per full build, well inside either plan. A real cost estimate comes from the first build.

## Options

| Option | Notes |
|---|---|
| **A. Ask ElevenLabs for written approval** (team@elevenlabs.io, or the contact-sales form), then use the voice in production | Matches the stated route. Costs an email. The answer might be no. |
| **B. Use ElevenLabs for prototype and Dolores's testing only, choose another vendor for production** | `scripts/voice-audition.mjs` already compares OpenAI and Gemini voices, so the fallback exists. |
| **C. Ship without asking** | Not recommended: it conflicts with the policy as written. |

## Recommendation

Do A now, build M1 against the ElevenLabs voice meanwhile (the build script isolates the provider, design D6), and treat B as the fallback if approval is refused or slow. Whether even informal testing with Dolores counts as a product directed at a minor is a judgement for the developer; the policy text does not distinguish.

## Still to decide

- A second voice for rotation: deferred by decision (2026-11-02). Variety in v1 comes from three speeds.
- Which model sounds best for Tele, `eleven_multilingual_v2` (default) or `eleven_v3`, which is slower and more expressive. Set `ELEVENLABS_MODEL` and run `npm run build-audio -- --yes --force --only=lines` to compare (this spends money again). This is a listening decision.
