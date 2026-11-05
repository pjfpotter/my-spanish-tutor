import { expect, test, type Page } from '@playwright/test';
import { SEED_COURSE } from '../lib/course/seed';
import { installCuedMic, signUp, stubQuestionAudio, unlockAutomate } from './helpers';

// Tasks 9.1 to 9.5 and 13.2: hear a question with no text, answer it against the clock. Clips are stubs, the
// microphone speaks on cue so response time can be checked against a known delay, and transcription is stubbed.
// Nothing here calls a model.

const QUESTIONS = SEED_COURSE.questions.map((q) => q.spanish);
const ANSWER = (spanish: string) => {
  const position = SEED_COURSE.questions.find((q) => q.spanish === spanish)!.position;
  return SEED_COURSE.modelAnswers.find((a) => a.questionPosition === position && a.level === 'rock_solid')!.text;
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

interface Heard { text?: string; confidence?: number }

/** Sets up stubs. The student says the right answer to whatever was asked unless `queue` says otherwise. */
async function setup(page: Page, opts: { speakIn?: number } = {}) {
  const asked: string[] = [];
  const queue: Heard[] = [];
  const sent: Record<string, any>[] = [];
  const replies: Record<string, any>[] = [];
  await installCuedMic(page);
  if (opts.speakIn !== undefined) await page.addInitScript((ms) => ((window as any).__speakIn = ms), opts.speakIn);
  await signUp(page);
  const ids = await unlockAutomate(page);
  await stubQuestionAudio(page, (spanish) => asked.push(spanish));
  await page.route('**/api/transcribe', (r) => {
    const next = queue.shift() ?? {};
    return r.fulfill({ json: { status: 'ok', text: next.text ?? ANSWER(asked.at(-1)!), confidence: next.confidence ?? 0.9 } });
  });
  page.on('request', (r) => r.url().endsWith('/api/respond') && sent.push(r.postDataJSON()));
  page.on('response', async (res) => res.url().endsWith('/api/respond') && res.ok() && replies.push(await res.json().catch(() => null)));
  return { asked, queue, sent, replies, ids };
}

/** Seeds timed attempts through the app's own route. */
const seed = (page: Page, itemId: string, sessionId: string, over: Record<string, unknown> = {}) =>
  page.request.post('/api/respond', { data: { itemId, sessionId, blank: false, accuracy: 95, responseTimeMs: 1000, speed: 1, repeats: 0, assisted: false, ...over } });

const startRound = async (page: Page) => {
  await page.goto('/phases/automate');
  await page.getByRole('button', { name: 'Start a round' }).click();
};

test('automate stays locked until the answers are memorised, then opens', async ({ page }) => {
  await signUp(page);
  await page.goto('/phases/automate');
  await expect(page).toHaveURL('/');
  await unlockAutomate(page);
  await page.goto('/phases/automate');
  await expect(page).toHaveURL('/phases/automate');
  await expect(page.getByTestId('intro')).toBeVisible();
});

test('a round asks all five questions with no text shown, and the next round is in a different order (9.1)', async ({ page }) => {
  test.setTimeout(240_000);
  const modelCalls: string[] = [];
  page.on('request', (r) => /openai|anthropic|elevenlabs/.test(r.url()) && modelCalls.push(r.url()));
  // Watch the whole round: a question's words must never appear on the screen while it is asked or answered.
  await page.addInitScript((questions) => {
    (window as any).__questionTextSeen = false;
    new MutationObserver(() => {
      const text = document.body?.innerText ?? '';
      if (questions.some((q) => text.includes(q))) (window as any).__questionTextSeen = true;
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  }, QUESTIONS);
  const t = await setup(page, { speakIn: 300 });
  await startRound(page);

  const runRound = async () => {
    for (let i = 0; i < 5; i++) {
      await expect(page.getByTestId('feedback')).toBeVisible({ timeout: 20_000 });
      await page.getByRole('button', { name: /Next question|See how I did/ }).click();
    }
    await expect(page.getByTestId('summary')).toBeVisible();
  };
  await runRound();
  const first = t.sent.map((s) => s.itemId);
  expect(new Set(first).size).toBe(5); // every question, once, including the recycled one

  await page.getByRole('button', { name: 'Another round' }).click();
  await page.getByRole('button', { name: 'Start a round' }).click();
  await runRound();
  const second = t.sent.slice(5).map((s) => s.itemId);
  expect(new Set(second).size).toBe(5);
  expect(second).not.toEqual(first);
  expect(await page.evaluate(() => (window as any).__questionTextSeen)).toBe(false);
  expect(modelCalls).toEqual([]);
});

test('response time is measured from the end of the question to the start of speech (9.2)', async ({ page }) => {
  const t = await setup(page, { speakIn: 2300 });
  await startRound(page);
  await expect(page.getByTestId('accuracy')).toHaveText('100%', { timeout: 20_000 });
  expect(t.sent).toHaveLength(1);
  // A stopwatch: speech started 2.3 s after the question audio ended, so the stored time is about 2.3 s.
  expect(t.sent[0].responseTimeMs).toBeGreaterThan(2000);
  expect(t.sent[0].responseTimeMs).toBeLessThan(2600);
  expect(t.sent[0].blank).toBe(false);
  await expect(page.getByTestId('response-time')).toHaveText(/after 2\.[0-5] seconds/);
});

test('the window shortens after several fast, accurate answers (9.3)', async ({ page }) => {
  const t = await setup(page); // never speaks: the test only reads the window
  const session = crypto.randomUUID();
  await page.goto('/phases/automate');
  await page.getByRole('button', { name: 'Start a round' }).click();
  await expect(page.getByTestId('listening')).toContainText('You have 8.0 seconds');
  void t;
  for (let i = 0; i < 3; i++) expect((await seed(page, t.ids[0], session)).ok()).toBe(true);
  await page.goto('/phases/automate');
  await page.getByRole('button', { name: 'Start a round' }).click();
  await expect(page.getByTestId('listening')).toContainText('You have 6.8 seconds'); // 8.0 s x 0.85
});

test('a blank offers the first words, is saved as a blank, and is never called wrong (9.3)', async ({ page }) => {
  test.setTimeout(120_000);
  const t = await setup(page); // says nothing
  const session = crypto.randomUUID();
  for (let i = 0; i < 18; i++) await seed(page, t.ids[i % 5], session); // fast answers shrink the window to its floor
  await startRound(page);
  await expect(page.getByTestId('listening')).toContainText('You have 3.0 seconds');

  await expect(page.getByTestId('blank')).toBeVisible({ timeout: 10_000 });
  const asked = t.asked.at(-1)!;
  const words = ANSWER(asked).split(' ').slice(0, 2).join(' ');
  await expect(page.getByTestId('hint')).toHaveText(`${words}…`);
  await expect(page.getByTestId('feedback')).not.toContainText(/wrong|incorrect|fail/i);
  await expect.poll(() => t.sent.length).toBe(1);
  expect(t.sent[0]).toMatchObject({ blank: true, accuracy: null, responseTimeMs: null });
});

test('asking for the question again in Spanish plays it again, and is rewarded (9.3)', async ({ page }) => {
  const t = await setup(page, { speakIn: 300 });
  t.queue.push({ text: '¿Puede repetir, por favor?' });
  await startRound(page);

  await expect(page.getByTestId('repeat-note')).toContainText('Good test technique', { timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => (window as any).__questionEnds.length), { timeout: 20_000 }).toBe(2); // the question played twice
  await expect(page.getByTestId('accuracy')).toHaveText('100%', { timeout: 20_000 });
  expect(t.sent).toHaveLength(1); // the request itself is not an attempt
  expect(t.sent[0].repeats).toBe(1);
  await expect.poll(() => t.replies.length).toBe(1);
  expect(t.replies[0].bonusCoins).toBe(1);
});

test('an unclear recording is not scored or saved, and the question is asked again (5.5)', async ({ page }) => {
  const t = await setup(page, { speakIn: 300 });
  t.queue.push({ text: 'brr mmm', confidence: 0.1 });
  await startRound(page);

  await expect(page.getByTestId('unclear')).toContainText('not scored', { timeout: 20_000 });
  expect(t.sent).toEqual([]);
  await page.getByRole('button', { name: 'Ask it again' }).click();
  await expect(page.getByTestId('accuracy')).toHaveText('100%', { timeout: 20_000 });
  expect(t.sent).toHaveLength(1);
});

test('test-ready needs every question accurate and quick in two separate sessions, and the rank ladder shows the student\'s own history (9.4, 9.5)', async ({ page }) => {
  const t = await setup(page);
  const [a, b] = [crypto.randomUUID(), crypto.randomUUID()];
  await page.goto('/phases/automate');
  await expect(page.getByTestId('rank')).toContainText('No speed rank yet');
  await expect(page.getByTestId('rank')).toContainText('3 more timed answers');

  for (const id of t.ids) await seed(page, id, a);
  await page.reload();
  await expect(page.getByTestId('test-ready')).toHaveCount(0); // one session is not enough
  await expect(page.getByTestId('rank')).toContainText('Gato'); // 1.0 s average is the top step
  await expect(page.locator('.ladder li[aria-current="step"]')).toHaveText(/Gato/);
  await expect(page.locator('.ladder li')).toHaveCount(6);

  await seed(page, t.ids[0], b, { responseTimeMs: 9000 }); // right, but too slow for the target
  for (const id of t.ids.slice(1)) await seed(page, id, b);
  await page.reload();
  await expect(page.getByTestId('test-ready')).toHaveCount(0); // question one has met the target in one session only

  await seed(page, t.ids[0], b);
  await page.reload();
  await expect(page.getByTestId('test-ready')).toBeVisible();
  await expect(page.getByTestId('history')).toContainText('Your recent sessions:');
  await expect(page.getByTestId('history')).toContainText('→'); // two sessions of their own
});
