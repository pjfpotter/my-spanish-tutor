import { buildFeelingTrack } from '../tele/feeling-track.ts';
import { wordsFromAlignment, type CharAlignment } from '../tele/alignment.ts';
import { parseClipFile, type ClipFile } from '../tele/clip.ts';
import { envelopeFromSamples } from '../tele/envelope.ts';
import { slotFor, sourceHash, type ClipSpec } from './manifest.ts';
import { tagSentences, withoutAdded } from './tags.ts';
import type { createCostRouter } from '../cost-router/router.ts';

export const TTS_SERVICE = 'elevenlabs-tts';
/** UNVERIFIED estimate: Starter is about $6 for 30,000 credits, roughly one credit a character. Check on elevenlabs.io. */
export const COST_PER_CHAR_GBP = 0.00016;
const HOP = 0.03;

/** The only thing that knows about the vendor (design D6), so it can change without touching the rest. */
export interface Synthesiser {
  /** The natural voice at its own pace. Other speeds are made from this clip, not asked for. */
  synthesise(text: string): Promise<{ mp3: Buffer; alignment: CharAlignment }>;
}
/** Re-encodes a clip as the final MP3 and changes its speed without changing its pitch. A rate of 1 only re-encodes. */
export interface Stretcher {
  process(mp3: Buffer, rate: number): Promise<Buffer>;
}
export interface Decoder {
  decode(mp3: Buffer): Promise<{ samples: Float32Array; sampleRate: number }>;
}
export interface ClipStore {
  read(slot: string): Promise<ClipFile | null>;
  readMp3(slot: string): Promise<Buffer | null>;
  write(slot: string, mp3: Buffer, clip: ClipFile): Promise<void>;
}
export type Router = ReturnType<typeof createCostRouter>;

export interface Voice {
  provider: string;
  voiceId: string;
  model: string;
  /** A direction put at the start of every sentence sent to the voice, such as `[very slowly]`. Needs a model that reads tags. */
  tag?: string;
}

/** What the voice service is asked to say, and so what is billed. */
export const sentText = (text: string, voice: Pick<Voice, 'tag'>) => tagSentences(text, voice.tag ?? '').text;

export interface Plan {
  /** Clips that exist and match the current voice, model, text and speed: nothing to pay for. */
  upToDate: ClipSpec[];
  /** Clips that are missing or out of date. */
  toBuild: ClipSpec[];
  estimateGbp: number;
  characters: number;
}

/** The one speed ElevenLabs is asked for. Every other speed is this clip, stretched. */
export const BASE_SPEED = 1;
/** Bump this when the stretching changes, so clips made the old way are rebuilt. */
const STRETCH = 'rubberband-formant-v1';
const isBase = (s: ClipSpec) => s.speed === BASE_SPEED;
/** What marks a clip stale: the text, voice, model and tag, and for a stretched clip the speed and how it was stretched. */
export const hashFor = (spec: ClipSpec, voice: Voice) =>
  isBase(spec) ? sourceHash(spec.text, voice.voiceId, voice.model, BASE_SPEED, voice.tag) : sourceHash(spec.text, voice.voiceId, voice.model, spec.speed, voice.tag, STRETCH);
/** Only the natural-speed clips are paid for. */
const paid = (specs: ClipSpec[]) => specs.filter(isBase);

export const estimateFor = (specs: ClipSpec[], voice: Pick<Voice, 'tag'> = {}) => paid(specs).reduce((s, c) => s + sentText(c.text, voice).length * COST_PER_CHAR_GBP, 0);

/** Works out what needs building without calling anything. This is the dry run. */
export async function planBuild(specs: ClipSpec[], voice: Voice, store: ClipStore, force = false): Promise<Plan> {
  const upToDate: ClipSpec[] = [];
  const toBuild: ClipSpec[] = [];
  for (const spec of specs) {
    const existing = force ? null : await store.read(spec.slot);
    const wanted = hashFor(spec, voice);
    (existing?.source.hash === wanted ? upToDate : toBuild).push(spec);
  }
  return { upToDate, toBuild, estimateGbp: estimateFor(toBuild, voice), characters: paid(toBuild).reduce((n, s) => n + sentText(s.text, voice).length, 0) };
}

export interface BuildReport {
  built: string[];
  /** Specs not built because the cost router refused or the call failed. */
  failed: { label: string; status: string }[];
  spentGbp: number;
}

/**
 * Builds only what the plan says is missing. The natural-speed clip of each text is one paid call through the cost router;
 * the slow and fast clips are made from it here, locally and free. Natural clips are built first, so a stretched clip is
 * made from the original recording and not from a copy that was already compressed.
 */
export async function buildClips(
  toBuild: ClipSpec[],
  voice: Voice,
  deps: { synth: Synthesiser; decoder: Decoder; store: ClipStore; route: Router; stretcher: Stretcher },
): Promise<BuildReport> {
  const report: BuildReport = { built: [], failed: [], spentGbp: 0 };
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const natural = new Map<string, { source: Buffer; words: { text: string; t0: number }[] }>();
  const ordered = [...toBuild.filter(isBase), ...toBuild.filter((s) => !isBase(s))];

  const write = async (spec: ClipSpec, source: Buffer, words: { text: string; t0: number }[], rate: number) => {
    const mp3 = await deps.stretcher.process(source, rate);
    const { samples, sampleRate } = await deps.decoder.decode(mp3);
    const clip = parseClipFile({
      id: spec.slot,
      text: spec.text,
      en: spec.en,
      end: round(samples.length / sampleRate),
      words: words.map((w) => ({ text: w.text, t0: round(w.t0 / rate) })),
      envelope: envelopeFromSamples(samples, sampleRate, HOP),
      envelopeHop: HOP,
      feelings: buildFeelingTrack(words.map((w) => ({ text: w.text, t0: w.t0 / rate })), spec.feelings),
      source: { provider: voice.provider, voiceId: voice.voiceId, model: voice.model, speed: spec.speed, hash: hashFor(spec, voice) },
    }, { allowNoSubtitle: spec.kind === 'bit' });
    await deps.store.write(spec.slot, mp3, clip);
    report.built.push(spec.label);
  };

  for (const spec of ordered) {
    try {
      if (isBase(spec)) {
        const tagged = tagSentences(spec.text, voice.tag ?? '');
        const cost = tagged.text.length * COST_PER_CHAR_GBP;
        const result = await deps.route({
          service: TTS_SERVICE, tier: 'speech', profileId: null, estimateGbp: cost, fallback: () => null,
          call: async () => ({ value: await deps.synth.synthesise(tagged.text), units: tagged.text.length, costGbp: cost }),
        });
        if (result.status !== 'ok') {
          report.failed.push({ label: spec.label, status: result.status });
          if (result.status === 'cap_reached') break; // stop spending the moment the cap is hit
          continue;
        }
        const { mp3, alignment } = result.value;
        const { words } = wordsFromAlignment(voice.tag ? withoutAdded(alignment, tagged) : alignment);
        natural.set(spec.text, { source: mp3, words });
        await write(spec, mp3, words, BASE_SPEED);
        report.spentGbp += cost;
      } else {
        // A stretched clip needs the natural clip of the same text: from this run, or the one already stored.
        let base = natural.get(spec.text);
        if (!base) {
          const slot = slotFor(spec.text, BASE_SPEED);
          const [mp3, clip] = await Promise.all([deps.store.readMp3(slot), deps.store.read(slot)]);
          if (mp3 && clip) base = { source: mp3, words: clip.words };
        }
        if (!base) {
          report.failed.push({ label: spec.label, status: 'no_natural_clip' });
          continue;
        }
        await write(spec, base.source, base.words, spec.speed);
      }
    } catch (e) {
      report.failed.push({ label: spec.label, status: `error: ${(e as Error).message}` });
    }
  }
  return report;
}
