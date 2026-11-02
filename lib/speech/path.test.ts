import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { chooseRecognitionPath, VERIFIED_BROWSER_DEVICES } from './path';

const all = { browserRecogniser: true, recorder: true, microphone: true };
const verified = [{ name: 'test phone', matches: (ua: string) => ua.includes('TestPhone') }];

describe('chooseRecognitionPath', () => {
  it('uses the server fallback for a device that has not been verified', () => {
    expect(chooseRecognitionPath(all, 'Mozilla/5.0 (Linux; Android 14) Chrome/130', verified)).toBe('server');
  });

  it('uses the browser recogniser only on a verified device that has it', () => {
    expect(chooseRecognitionPath(all, 'TestPhone Chrome', verified)).toBe('browser');
    expect(chooseRecognitionPath({ ...all, browserRecogniser: false }, 'TestPhone Chrome', verified)).toBe('server');
  });

  it('is unsupported with no microphone support', () => {
    expect(chooseRecognitionPath({ ...all, microphone: false }, 'TestPhone', verified)).toBe('unsupported');
  });

  it('falls back to the browser recogniser when there is no recorder, and is unsupported with neither', () => {
    expect(chooseRecognitionPath({ ...all, recorder: false }, 'x', [])).toBe('browser');
    expect(chooseRecognitionPath({ ...all, recorder: false, browserRecogniser: false }, 'x', [])).toBe('unsupported');
  });

  it('has no verified devices yet, matching the device matrix document', () => {
    const doc = readFileSync(path.join(import.meta.dirname, '../../docs/device-matrix.md'), 'utf8');
    const verifiedRows = doc.split('\n').filter((l) => l.startsWith('|') && /\|\s*Verified\s*\|/.test(l));
    expect(verifiedRows.length).toBe(VERIFIED_BROWSER_DEVICES.length);
  });
});
