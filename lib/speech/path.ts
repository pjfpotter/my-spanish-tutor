/**
 * Which recogniser a device uses (design D4, docs/device-matrix.md). The browser's built-in
 * recogniser is free and instant but unproven on our devices, so a device uses it only after a real
 * run has shown it works. Every other device uses server-side transcription of a short in-memory clip.
 */
export type RecognitionPath = 'browser' | 'server' | 'unsupported';

export interface Capabilities {
  /** SpeechRecognition or webkitSpeechRecognition exists. */
  browserRecogniser: boolean;
  /** MediaRecorder exists, so a clip can be sent to the server. */
  recorder: boolean;
  /** getUserMedia exists, so there can be a microphone at all. */
  microphone: boolean;
}

/**
 * Devices a real-device run has verified for browser recognition. Keep in step with the "Verified"
 * rows of docs/device-matrix.md: a test fails if they disagree. None are verified yet.
 */
export const VERIFIED_BROWSER_DEVICES: { name: string; matches: (userAgent: string) => boolean }[] = [];

export function chooseRecognitionPath(
  caps: Capabilities,
  userAgent: string,
  verified: typeof VERIFIED_BROWSER_DEVICES = VERIFIED_BROWSER_DEVICES,
): RecognitionPath {
  if (!caps.microphone) return 'unsupported';
  if (caps.browserRecogniser && verified.some((d) => d.matches(userAgent))) return 'browser';
  if (caps.recorder) return 'server';
  // No recorder to send a clip with: the built-in recogniser, unproven, is better than nothing.
  return caps.browserRecogniser ? 'browser' : 'unsupported';
}

/** Reads what this browser can do. Browser only. */
export function detectCapabilities(w: Window & typeof globalThis = window): Capabilities {
  const any = w as unknown as Record<string, unknown>;
  return {
    browserRecogniser: Boolean(any.SpeechRecognition ?? any.webkitSpeechRecognition),
    recorder: typeof any.MediaRecorder === 'function',
    microphone: Boolean(w.navigator?.mediaDevices?.getUserMedia),
  };
}
