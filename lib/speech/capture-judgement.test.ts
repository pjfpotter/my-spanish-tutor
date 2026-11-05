import { describe, expect, it } from 'vitest';
import { judgeCapture, MIN_CONFIDENCE } from './capture-judgement';

describe('judgeCapture (task 5.5)', () => {
  it('scores a clear transcript', () => {
    expect(judgeCapture({ status: 'ok', transcript: ' Me llamo Ana ', confidence: 0.9 })).toEqual({ scorable: true, transcript: 'Me llamo Ana' });
  });

  it('does not score when nothing was heard', () => {
    expect(judgeCapture({ status: 'unclear' })).toEqual({ scorable: false, reason: 'nothing_heard' });
    expect(judgeCapture({ status: 'ok', transcript: '   ', confidence: 0.9 })).toEqual({ scorable: false, reason: 'nothing_heard' });
  });

  it('does not score a low-confidence (noisy) transcript', () => {
    expect(judgeCapture({ status: 'ok', transcript: 'me llamo', confidence: 0.2 })).toEqual({ scorable: false, reason: 'low_confidence' });
    expect(judgeCapture({ status: 'ok', transcript: 'me llamo', confidence: MIN_CONFIDENCE - 0.01 }).scorable).toBe(false);
  });

  it('scores at exactly the threshold, and when the device reports no confidence', () => {
    expect(judgeCapture({ status: 'ok', transcript: 'hola', confidence: MIN_CONFIDENCE }).scorable).toBe(true);
    expect(judgeCapture({ status: 'ok', transcript: 'hola', confidence: null }).scorable).toBe(true);
    expect(judgeCapture({ status: 'ok', transcript: 'hola', confidence: 0 }).scorable).toBe(true);
  });
});
