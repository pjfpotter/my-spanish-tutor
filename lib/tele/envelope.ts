/**
 * A loudness envelope for the glow: one value from 0 to 1 per `hopSeconds`, from the RMS level of
 * decoded audio. Computed when a clip is built so the browser never decodes audio (design D7).
 * Levels are scaled so the loud parts of speech reach about 1, whatever the recording level.
 */
export function envelopeFromSamples(samples: Float32Array, sampleRate: number, hopSeconds = 0.03): number[] {
  const hop = Math.max(1, Math.round(sampleRate * hopSeconds));
  const rms: number[] = [];
  for (let i = 0; i < samples.length; i += hop) {
    let sum = 0;
    const end = Math.min(samples.length, i + hop);
    for (let j = i; j < end; j++) sum += samples[j] * samples[j];
    rms.push(Math.sqrt(sum / (end - i)));
  }
  if (!rms.length) return [];

  // Scale by the 95th percentile so a single click does not squash the rest.
  const sorted = [...rms].sort((a, b) => a - b);
  const ref = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  if (ref < 1e-4) return rms.map(() => 0); // silence

  // A light smoothing keeps the glow from flickering on every consonant.
  const scaled = rms.map((v) => Math.min(1, v / ref));
  return scaled.map((v, i) => {
    const avg = (scaled[i - 1] ?? v) * 0.25 + v * 0.5 + (scaled[i + 1] ?? v) * 0.25;
    return Math.round(avg * 100) / 100;
  });
}
