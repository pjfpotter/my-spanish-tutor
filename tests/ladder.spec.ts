import { expect, test, type Page } from '@playwright/test';
import { SEED_COURSE, simplestSeedAnswer } from '../lib/course/seed';
import { answerPieces } from '../lib/practice/tasks';
import { levelsFor } from '../lib/practice/ladder';
import { expectFits, installCuedMic, signUp, stubQuestionAudio, unlockAutomate } from './helpers';

// Tasks 22.1 to 22.4: the chunk ladder, chunks appearing in colour as they are said, the hint delay, expert mode and
// personal bests. The microphone speaks on cue and transcription is stubbed. Nothing here calls a model.

const ANSWER = (spanish: string) => {
  const position = SEED_COURSE.questions.find((q) => q.spanish === spanish)!.position;
  return simplestSeedAnswer(position);
};
const PIECES = (spanish: string) => answerPieces(ANSWER(spanish), SEED_COURSE.chunks);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

interface Heard { text?: string; confidence?: number }

async function setup(page: Page, opts: { speakIn?: number; say?: (asked: string) => string } = {}) {
  const asked: string[] = [];
  const queue: Heard[] = [];
  const sent: Record<string, any>[] = [];
  await installCuedMic(page);
  await page.addInitScript((ms) => ((window as any).__speakIn = ms), opts.speakIn ?? 300);
  await signUp(page);
  const ids = await unlockAutomate(page);
  await stubQuestionAudio(page, (spanish) => asked.push(spanish));
  await page.route('**/api/transcribe', (r) => {
    const next = queue.shift() ?? {};
    return r.fulfill({ json: { status: 'ok', text: next.text ?? (opts.say ? opts.say(asked.at(-1)!) : ANSWER(asked.at(-1)!)), confidence: next.confidence ?? 0.9 } });
  });
  page.on('request', (r) => r.url().endsWith('/api/respond') && sent.push(r.postDataJSON()));
  return { asked, queue, sent, ids };
}

/** Puts every answer on the same ladder step (and optionally a response-time best) on this device. */
async function seedDevice(page: Page, ids: string[], ladder: { at: number; met?: number }, bestMs?: number) {
  await page.evaluate(([ids, ladder, best]) => {
    for (const id of ids as string[]) {
      localStorage.setItem(`ladder:${id}`, JSON.stringify({ at: (ladder as any).at, met: (ladder as any).met ?? 0 }));
      if (best) localStorage.setItem(`best-ms:${id}`, String(best));
    }
  }, [ids, ladder, bestMs] as const);
}

const topAt = SEED_COURSE.questions.map((q) => levelsFor(PIECES(q.spanish).length).length - 1);

const open = async (page: Page) => {
  await page.goto('/phases/automate');
  await expect(page.getByTestId('intro')).toBeVisible();
};
const startRound = (page: Page) => page.getByRole('button', { name: 'Start a round' }).click();

test('a new student starts on level one: only the first chunk is asked for and scored, and it shows in its colour (22.1, 22.2)', async ({ page }) => {
  const t = await setup(page, { say: (q) => PIECES(q)[0].text });
  await open(page);
  await startRound(page);
  await expect(page.getByTestId('level')).toHaveText('The first chunk');
  await expect(page.getByTestId('accuracy')).toHaveText('100%', { timeout: 20_000 });
  const chunks = page.getByTestId('chunks').locator('[data-said]');
  await expect(chunks).toHaveCount(1);
  const first = page.getByTestId('chunk-0');
  await expect(first).toHaveAttribute('data-said', 'true');
  await expect(first).toHaveAttribute('data-kind', /opinion|reason|link|time|detail|other/);
  expect(await first.locator('.tile-kind').textContent()).toMatch(/\S/); // a symbol as well as a colour
  // A chunk step is practice: it is saved as assisted, so it never makes the student look test-ready.
  await expect.poll(() => t.sent.length).toBe(1);
  expect(t.sent[0].assisted).toBe(true);
  expect(t.sent[0].blank).toBe(false);
});

test('chunks appear only for the words the recogniser understood, and a miss is a gap, not a penalty (22.2)', async ({ page }) => {
  await setup(page, { say: (q) => PIECES(q).slice(0, 2).map((p) => p.text).join(' ') });
  await open(page);
  await page.getByLabel('Start with').selectOption({ label: 'Whole answer' });
  await startRound(page);
  await expect(page.getByTestId('feedback')).toBeVisible({ timeout: 20_000 });
  const asked = await page.getByTestId('chunks').locator('[data-said]').count();
  expect(asked).toBeGreaterThanOrEqual(3);
  await expect(page.getByTestId('chunk-0')).toHaveAttribute('data-said', 'true');
  await expect(page.getByTestId('chunk-1')).toHaveAttribute('data-said', 'true');
  await expect(page.getByTestId(`chunk-${asked - 1}`)).toHaveAttribute('data-said', 'false');
  await expect(page.getByTestId('feedback-panel')).not.toContainText(/wrong|fail|incorrect/i);
});

test('meeting the target at a level moves the student up, and it is remembered on this device (22.1)', async ({ page }) => {
  const t = await setup(page, { say: (q) => PIECES(q)[0].text });
  await open(page);
  await seedDevice(page, t.ids, { at: 0, met: 1 });
  await page.reload();
  await startRound(page);
  await expect(page.getByTestId('level-up')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('level-up')).toContainText('the first two chunks');
  const stored = await page.evaluate((ids) => ids.map((id) => JSON.parse(localStorage.getItem(`ladder:${id}`) ?? 'null')), t.ids);
  expect(stored.filter((s) => s?.at === 1)).toHaveLength(1);
});

test('starting higher begins at that level for every answer (22.1)', async ({ page }) => {
  const t = await setup(page);
  await open(page);
  await page.getByLabel('Start with').selectOption({ label: 'Whole answer' });
  await startRound(page);
  await expect(page.getByTestId('level')).toHaveText('The whole answer');
  await expect(page.getByTestId('accuracy')).toHaveText('100%', { timeout: 20_000 });
  await expect.poll(() => t.sent.length).toBe(1);
  expect(t.sent[0].assisted).toBe(false); // the whole answer, no hint: a full attempt
  const stored = await page.evaluate((ids) => ids.map((id) => JSON.parse(localStorage.getItem(`ladder:${id}`) ?? 'null')?.at), t.ids);
  expect(stored.every((n) => n >= 1)).toBe(true);
});

test('after 2.5 seconds of silence the first words of the next chunk appear, and the attempt is assisted, not wrong (22.3)', async ({ page }) => {
  const t = await setup(page, { speakIn: 4200, say: (q) => PIECES(q)[0].text });
  await open(page);
  await startRound(page);
  await expect(page.getByTestId('listening')).toBeVisible({ timeout: 20_000 });
  const t0 = Date.now();
  await page.waitForTimeout(2000);
  await expect(page.getByTestId('hint-live')).toHaveCount(0); // not yet
  await expect(page.getByTestId('hint-live')).toBeVisible({ timeout: 1500 });
  const delay = Date.now() - t0;
  // Timed from after the screen was already listening, so this is a loose check; the exact 2.5 s is a unit test with a fake clock.
  expect(delay).toBeGreaterThan(2000);
  expect(delay).toBeLessThan(3600);
  const first = t.asked.at(-1)!;
  const words = PIECES(first)[0].text.split(' ').slice(0, 2).join(' ');
  await expect(page.getByTestId('hint-live')).toHaveText(`Your answer starts: ${words}…`);
  // They speak after the hint: it still scores, it is simply assisted.
  await expect(page.getByTestId('accuracy')).toHaveText('100%', { timeout: 20_000 });
  await expect.poll(() => t.sent.length).toBe(1);
  expect(t.sent[0].assisted).toBe(true);
  expect(t.sent[0].blank).toBe(false);
});

test('starting in time means no hint ever appears, so hints fade as response times fall (22.3)', async ({ page }) => {
  await setup(page, { speakIn: 300 });
  await open(page);
  await startRound(page);
  await expect(page.getByTestId('accuracy')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('hint-live')).toHaveCount(0);
});

test('expert mode is locked until every answer is at the top, and shows no text at all while answering (22.4)', async ({ page }) => {
  const t = await setup(page, { speakIn: 4200 });
  await open(page);
  await expect(page.getByTestId('expert-locked')).toBeVisible();
  await expect(page.getByLabel('Expert mode: no text at all')).toBeDisabled();
  await page.evaluate(([ids, tops]) => (ids as string[]).forEach((id, i) => localStorage.setItem(`ladder:${id}`, JSON.stringify({ at: (tops as number[])[i], met: 0 }))), [t.ids, topAt] as const);
  await page.reload();
  // Ids come in question order, and so do the tops.
  const box = page.getByLabel('Expert mode: no text at all');
  await expect(box).toBeEnabled();
  await box.check();
  await page.getByLabel('Start with').selectOption({ label: 'Whole answer' });
  await startRound(page);
  await expect(page.getByTestId('listening')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(3300); // past the hint delay
  await expect(page.getByTestId('hint-live')).toHaveCount(0);
  await expect(page.getByTestId('level')).toHaveCount(0);
  await expect(page.getByTestId('chunks')).toHaveCount(0);
  const first = t.asked.at(-1)!;
  const body = await page.locator('.practice-body').innerText();
  for (const p of PIECES(first)) expect(body).not.toContain(p.text);
  // The chunks are revealed in the results.
  await expect(page.getByTestId('chunks')).toBeVisible({ timeout: 20_000 });
});

test('a faster whole-answer time than before is celebrated; a first time is not (22.4)', async ({ page }) => {
  const t = await setup(page, { speakIn: 300 });
  await open(page);
  await page.getByLabel('Start with').selectOption({ label: 'Whole answer' });
  await startRound(page);
  await expect(page.getByTestId('accuracy')).toHaveText('100%', { timeout: 20_000 });
  await expect(page.getByTestId('new-best')).toHaveCount(0); // nothing to beat yet
  const saved = await page.evaluate((ids) => ids.map((id) => localStorage.getItem(`best-ms:${id}`)).filter(Boolean), t.ids);
  expect(saved).toHaveLength(1); // it is now on record

  await page.evaluate((ids) => ids.forEach((id) => localStorage.setItem(`best-ms:${id}`, '9000')), t.ids);
  await page.getByRole('button', { name: /Next question/ }).click();
  await expect(page.getByTestId('new-best')).toBeVisible({ timeout: 20_000 });
});

test('the ladder screens fit 360 by 640 with no scrolling (20.1)', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 360, height: 640 });
  const t = await setup(page, { speakIn: 4200, say: (q) => PIECES(q).slice(0, 2).map((p) => p.text).join(' ') });
  await open(page);
  await expectFits(page, 'intro');
  await page.getByLabel('Start with').selectOption({ label: 'Whole answer' });
  await startRound(page);
  await expect(page.getByTestId('listening')).toBeVisible({ timeout: 20_000 });
  await expectFits(page, 'listening');
  await expect(page.getByTestId('hint-live')).toBeVisible({ timeout: 4000 });
  await expectFits(page, 'listening with a hint');
  await expect(page.getByTestId('feedback')).toBeVisible({ timeout: 20_000 });
  await expectFits(page, 'results with chunks');
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: /Next question|See how I did/ }).click();
    if (i < 4) await expect(page.getByTestId('feedback')).toBeVisible({ timeout: 25_000 });
  }
  await expect(page.getByTestId('summary')).toBeVisible();
  await expectFits(page, 'summary');
  expect(t.sent.length).toBeGreaterThan(0);
});
