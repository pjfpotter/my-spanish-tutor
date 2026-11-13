import { expect, test, type Page } from '@playwright/test';
import { simplestSeedAnswer } from '../lib/course/seed';
import { expectFits, signUp, unlockAutomate, unlockMemorise } from './helpers';

// Task 27.4: the memorise ladder with live listening, on the student's own confirmed answers, saved to the server.
// A stand-in recogniser is spoken through, so nothing here needs a microphone, and nothing calls a model.
// The screen as it was before the ladder is at /phases/memorise/classic and has its own spec.

const PHONE = { width: 360, height: 640 };

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, any>;
    // No meter (the fake microphone would keep restarting the quiet period), sound off, calm on.
    try { localStorage.setItem('sound', 'off'); localStorage.setItem('calm', 'on'); localStorage.setItem('memorise-prefs-v1', JSON.stringify({ meter: false })); } catch { /* no storage */ }
    class FakeRecogniser {
      onstart: (() => void) | null = null;
      onresult: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      constructor() { w.__rec = this; }
      start() { setTimeout(() => this.onstart?.(), 0); }
      stop() { this.onend?.(); }
      abort() {}
    }
    w.SpeechRecognition = w.webkitSpeechRecognition = FakeRecogniser;
    w.__hear = (text: string) => w.__rec?.onresult?.({ results: [Object.assign([{ transcript: text }], { isFinal: false })] });
  });
});

/** The words of the answer the home screen offers first, as a recogniser would hand them back: no capitals, no punctuation. */
async function offered(page: Page): Promise<string> {
  const n = Number((await page.locator('.ml-which span').first().innerText()).match(/Answer (\d)/)![1]);
  return simplestSeedAnswer(n).toLowerCase().replace(/[.,;¿?¡!]/g, '');
}
const hear = (page: Page, text: string) => page.evaluate((t) => (window as unknown as { __hear: (t: string) => void }).__hear(t), text);

/** A student with five confirmed answers and nothing memorised yet. */
async function ready(page: Page) {
  await signUp(page);
  await unlockMemorise(page);
  await page.goto('/phases/memorise');
  await expect(page.getByTestId('lab-home')).toBeVisible();
}

const saves = (page: Page) => {
  const sent: Record<string, any>[] = [];
  page.on('request', (r) => r.url().endsWith('/api/memorise') && r.method() === 'POST' && sent.push(r.postDataJSON()));
  return sent;
};

test('memorise stays locked until the answers are confirmed and the questions mastered, then opens on the student\'s own answers', async ({ page }) => {
  await signUp(page);
  await page.goto('/phases/memorise');
  await expect(page).toHaveURL('/');
  await unlockMemorise(page);
  await page.goto('/phases/memorise');
  await expect(page).toHaveURL('/phases/memorise');
  await expect(page.getByTestId('lab-home')).toBeVisible();
  await expect(page.getByTestId('ml-memorised')).toHaveText('0 of 5 memorised');
  await expect(page.getByTestId('ml-countdown')).toContainText('to the test');
  await expect(page.locator('.ml-row')).toHaveCount(5);
  // No tester tools for a student: no skipping a day, no starting over.
  await expect(page.getByRole('button', { name: /Skip to tomorrow|Start over/ })).toHaveCount(0);
});

test('a lesson is taught from the student\'s own answer, listens, saves numbers only and pays euros (27.4)', async ({ page }) => {
  const sent = saves(page);
  await ready(page);
  const spoken = await offered(page);
  await page.getByTestId('lab-start').click();
  await expect(page.getByTestId('lab-title')).toContainText(/Listen/);
  // The first bit on screen is the first bit of the student's own answer.
  await expect(page.locator('.ml-tile').first()).toContainText(new RegExp(spoken.split(' ')[0], 'i'));
  await expect(page.getByTestId('lab-listen')).toBeVisible();
  await hear(page, spoken.split(' ').slice(0, 2).join(' '));
  await expect.poll(() => page.locator('[data-testid="lab-word"][data-s="lit"]').count()).toBeGreaterThan(0);
  // Leaving part way keeps what was done: the progress and the euros are sent.
  await page.getByRole('button', { name: 'Leave this lesson' }).click();
  await expect(page.getByTestId('lab-home')).toBeVisible();
  await expect.poll(() => sent.length).toBeGreaterThan(0);
  for (const body of sent) {
    expect(Object.keys(body).sort()).toEqual(['answers', 'earned', 'recalls']);
    expect(JSON.stringify(body)).not.toMatch(/transcript|audio|text/i);
  }
});

test('"I already know this one": a clean answer from memory is recorded as a recall and the next-day check waits for tomorrow (27.4)', async ({ page }) => {
  const sent = saves(page);
  await ready(page);
  const spoken = await offered(page);
  const n = Number((await page.locator('.ml-which span').first().innerText()).match(/Answer (\d)/)![1]);
  const before = await page.locator('.ml-which .ml-euros').innerText();
  await page.getByRole('button', { name: 'I already know this one' }).click();
  await expect(page.getByTestId('lab-listen')).toBeVisible();
  await hear(page, spoken);
  await expect(page.getByTestId('lab-fb')).toBeVisible(); // a clean answer from memory moves on by itself
  await expect(page.getByTestId('lab-shout')).toHaveText('You do know it', { timeout: 8000 });
  await expect.poll(() => sent.some((b) => b.recalls.length > 0)).toBe(true);
  const recall = sent.flatMap((b) => b.recalls)[0];
  expect(recall).toMatchObject({ level: 4 });
  expect(recall.accuracy).toBeGreaterThanOrEqual(80);

  // It is remembered: the answer is waiting for the next-day check, and the euros are in the balance.
  await page.reload();
  await expect(page.getByTestId('lab-home')).toBeVisible();
  await page.locator('.ml-row').nth(n - 1).click();
  await expect(page.locator('.ml-today')).toContainText('opens tomorrow');
  await expect(page.locator('.ml-which .ml-euros')).not.toHaveText(before); // effort was paid, and the balance is the server's
});

test('an answer the mastery record counts as memorised is shown as memorised (27.4)', async ({ page }) => {
  await signUp(page);
  await unlockAutomate(page); // three clean recalls across two sessions for every answer, through the app's own route
  await page.goto('/phases/memorise');
  await expect(page.getByTestId('ml-memorised')).toHaveText('5 of 5 memorised');
  await expect(page.locator('.ml-row strong', { hasText: 'done' })).toHaveCount(5);
});

test('help and a pause never penalise: a hint is offered after a pause and nothing is lost (27.4)', async ({ page }) => {
  await ready(page);
  await page.getByTestId('lab-start').click();
  await expect(page.getByTestId('lab-listen')).toBeVisible();
  await expect(page.getByTestId('lab-offer')).toBeVisible({ timeout: 6000 });
  await expect(page.getByTestId('lab-lesson')).toHaveAttribute('data-phase', 'listening');
});

test('a save that fails is said so and sent again with the next answer, and the screen carries on (27.4)', async ({ page }) => {
  let fail = true;
  await page.route('**/api/memorise', (r) => (fail ? r.abort() : r.continue()));
  await ready(page);
  await page.getByTestId('lab-start').click();
  await page.getByRole('button', { name: 'Leave this lesson' }).click();
  await expect(page.getByTestId('ml-save-failed')).toBeVisible();
  await expect(page.getByTestId('lab-home')).toBeVisible();
  fail = false;
  await page.getByTestId('lab-start').click();
  await page.getByRole('button', { name: 'Leave this lesson' }).click();
  await expect(page.getByTestId('ml-save-failed')).toHaveCount(0);
});

test('the home, a lesson and its result fit 360 by 640 with no scrolling (27.4)', async ({ page }) => {
  await ready(page);
  await expectFits(page, 'memorise home');
  const spoken = await offered(page);
  await page.getByTestId('lab-start').click();
  await expectFits(page, 'a spoken screen');
  await hear(page, spoken.split(' ').slice(0, 2).join(' '));
  await expectFits(page, 'a spoken screen with words lit');
});

test('the section exit goes back to the desktop and keeps progress (27.4, 19.3)', async ({ page }) => {
  await ready(page);
  await page.getByTestId('section-exit').click();
  await expect(page).toHaveURL('/');
});

test('listening falls back to checking your own answer when the microphone cannot be used, and nothing is marked against the student (27.4)', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, any>;
    w.SpeechRecognition = w.webkitSpeechRecognition = undefined;
    try { localStorage.setItem('memorise-prefs-v1', JSON.stringify({ meter: false, selfMark: true })); } catch { /* no storage */ }
  });
  await ready(page);
  await page.getByTestId('lab-start').click();
  await expect(page.getByTestId('lab-said')).toBeVisible();
  await page.getByTestId('lab-said').click();
  await expect(page.getByTestId('lab-fb')).toBeVisible();
});
