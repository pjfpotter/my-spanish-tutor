/**
 * Speaking-rate settings passed to the provider's speed control (never time-stretching). Kept apart
 * from the manifest, which hashes with Node's crypto, so the browser can import this without
 * pulling a crypto polyfill into the bundle.
 */
export const SPEEDS = { slow: 0.7, normal: 1, fast: 1.2 } as const;
export type SpeedName = keyof typeof SPEEDS;
