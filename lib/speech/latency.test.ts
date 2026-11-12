import { describe, expect, it } from 'vitest';
import { LATENCY_BUDGET, LatencyLog, budgetVerdict, deviceReport, freshStats, summarise } from './latency';

describe('summarise', () => {
  it('has nothing to say about no samples', () => {
    expect(summarise([])).toBeNull();
  });
  it('gives the median, the 90th percentile and the worst', () => {
    const s = summarise([50, 10, 30, 20, 40, 60, 70, 80, 90, 100])!;
    expect(s).toEqual({ n: 10, median: 50, p90: 90, max: 100 });
  });
  it('copes with one sample', () => {
    expect(summarise([42])).toEqual({ n: 1, median: 42, p90: 42, max: 42 });
  });
});

describe('LatencyLog', () => {
  it('ignores impossible timings', () => {
    const log = new LatencyLog();
    log.add('paint', -5);
    log.add('paint', Number.NaN);
    log.add('paint', 120_000);
    log.add('paint', 30);
    expect(log.summary('paint')?.n).toBe(1);
    expect(log.count()).toBe(1);
  });
  it('can be reset', () => {
    const log = new LatencyLog();
    log.add('gap', 10);
    log.reset();
    expect(log.count()).toBe(0);
  });
});

describe('budget verdict and device report', () => {
  const facts = { userAgent: 'Test Browser', recogniser: true, meterOn: false, wakeLock: true, wakeLockHeld: true };

  it('says over budget when the 90th percentile is above the limit', () => {
    const log = new LatencyLog();
    [20, 30, 40, 50, 60, 70, 80, 90, LATENCY_BUDGET.paintP90Ms + 40, LATENCY_BUDGET.paintP90Ms + 50].forEach((n) => log.add('paint', n));
    expect(budgetVerdict(log).paint).toBe('over budget');
    expect(budgetVerdict(log).firstWord).toBe('not measured');
  });

  it('lets one slow outlier in ten pass, because the limit is on the 90th percentile', () => {
    const log = new LatencyLog();
    [20, 30, 40, 50, 60, 70, 80, 90, 95, LATENCY_BUDGET.paintP90Ms + 400].forEach((n) => log.add('paint', n));
    expect(budgetVerdict(log).paint).toBe('within budget');
  });

  it('says within budget when it is under', () => {
    const log = new LatencyLog();
    [10, 20, 30].forEach((n) => log.add('paint', n));
    [800, 900, 1000].forEach((n) => log.add('first-word', n));
    expect(budgetVerdict(log)).toEqual({ paint: 'within budget', firstWord: 'within budget' });
  });

  it('writes a report with the facts and no words or audio', () => {
    const log = new LatencyLog();
    log.add('paint', 25);
    const stats = { ...freshStats(), sessions: 2, interims: 14, finals: 3, firstResultMs: 640, resumes: 1, errors: ['no-speech'] };
    const text = deviceReport(facts, stats, log);
    expect(text).toContain('Browser: Test Browser');
    expect(text).toContain('interim results seen): yes, 14 interim and 3 final');
    expect(text).toContain('First result after the microphone opened: 640 ms');
    expect(text).toContain('Errors: no-speech');
    expect(text).toContain('Screen stays awake: supported and held');
    expect(text).toContain('came back after a lock or background: 1 time');
    expect(text).toContain('median 25 ms');
  });

  it('says plainly when nothing was heard', () => {
    const text = deviceReport({ ...facts, recogniser: false, wakeLock: false, wakeLockHeld: false }, freshStats(), new LatencyLog());
    expect(text).toContain('recogniser present: no');
    expect(text).toContain('(interim results seen): no');
    expect(text).toContain('First result after the microphone opened: none');
    expect(text).toContain('Screen stays awake: not supported');
  });
});
