import { buildFeelingTrack } from '../tele/feeling-track.ts';
import { wordsFromAlignment, type CharAlignment } from '../tele/alignment.ts';
import { parseClipFile, type ClipFile } from '../tele/clip.ts';
import { envelopeFromSamples } from '../tele/envelope.ts';
import { sourceHash, type ClipSpec } from './manifest.ts';
import type { createCostRouter } from '../cost-router/router.ts';

export const TTS_SERVICE = 'elevenlabs-tts';
/** UNVERIFIED estimate: Starter is about $6 for 30,000 credits, roughly one credit a character. Check on elevenlabs.io. */
export const COST_PER_CHAR_GBP = 0.00016;
const HOP = 0.03;

/** The only thing that knows about the vendor (design D6), so it can change without touching the rest. */
export interface Synthesiser {
  synthesise(text: string, speed: number): Promise<{ mp3: Buffer; alignment: CharAlignment }>;
}
export interface Decoder {
  decode(mp3: Buffer): Promise<{ samples: Float32Array; sampleRate: number }>;
}
export interface ClipStore {
  read(slot: string): Promise<ClipFile | null>;
  write(slot: string, mp3: Buffer, clip: ClipFile): Promise<void>;
}
export type Router = ReturnType<typeof createCostRouter>;

export interface Voice {
  provider: string;
  voiceId: string;
  model: string;
}

export interface Plan {
  /** Clips that exist and match the current voice, model, text and speed: nothing to pay for. */
  upToDate: ClipSpec[];
  /** Clips that are missing or out of date. */
  toBuild: ClipSpec[];
  estimateGbp: number;
  characters: number;
}

export const estimateFor = (specs: ClipSpec[]) => specs.reduce((s, c) => s + c.text.length * COST_PER_CHAR_GBP, 0);

/** Works out what needs building without calling anything. This is the dry run. */
export async function planBuild(specs: ClipSpec[], voice: Voice, store: ClipStore, force = false): Promise<Plan> {
  const upToDate: ClipSpec[] = [];
  const toBuild: ClipSpec[] = [];
  for (const spec of specs) {
    const existing = force ? null : await store.read(spec.slot);
    const wanted = sourceHash(spec.text, voice.voiceId, voice.model, spec.speed);
    (existing?.source.hash === wanted ? upToDate : toBuild).push(spec);
  }
  return { upToDate, toBuild, estimateGbp: estimateFor(toBuild), characters: toBuild.reduce((n, s) => n + s.text.length, 0) };
}

export interface BuildReport {
  built: string[];
  /** Specs not built because the cost router refused or the call failed. */
  failed: { label: string; status: string }[];
  spentGbp: number;
}

/** Builds only what the plan says is missing, one paid call each, through the cost router. */
export async function buildClips(
  toBuild: ClipSpec[],
  voice: Voice,
  deps: { synth: Synthesiser; decoder: Decoder; store: ClipStore; route: Router },
): Promise<BuildReport> {
  const report: BuildReport = { built: [], failed: [], spentGbp: 0 };
  for (const spec of toBuild) {
    const cost = spec.text.length * COST_PER_CHAR_GBP;
    const result = await deps.route({
      service: TTS_SERVICE, tier: 'speech', profileId: null, estimateGbp: cost, fallback: () => null,
      call: async () => ({ value: await deps.synth.synthesise(spec.text, spec.speed), units: spec.text.length, costGbp: cost }),
    });
    if (result.status !== 'ok') {
      report.failed.push({ label: spec.label, status: result.status });
      if (result.status === 'cap_reached') break; // stop spending the moment the cap is hit
      continue;
    }
    const { mp3, alignment } = result.value;
    const { samples, sampleRate } = await deps.decoder.decode(mp3);
    const { words } = wordsFromAlignment(alignment);
    const round = (n: number) => Math.round(n * 1000) / 1000;
    const clip = parseClipFile({
      id: spec.slot,
      text: spec.text,
      en: spec.en,
      end: round(samples.length / sampleRate),
      words: words.map((w) => ({ text: w.text, t0: round(w.t0) })),
      envelope: envelopeFromSamples(samples, sampleRate, HOP),
      envelopeHop: HOP,
      feelings: buildFeelingTrack(words, spec.feelings),
      source: { provider: voice.provider, voiceId: voice.voiceId, model: voice.model, speed: spec.speed, hash: sourceHash(spec.text, voice.voiceId, voice.model, spec.speed) },
    });
    await deps.store.write(spec.slot, mp3, clip);
    report.built.push(spec.label);
    report.spentGbp += cost;
  }
  return report;
}
