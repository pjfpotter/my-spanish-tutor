import { expect, test } from '@playwright/test';
import { SEED_COURSE } from '../lib/course/seed';
import { signUp } from './helpers';

// Task 10.4 and 19.2: the starting-point check. The mood check-in and the quick win were removed in 19.4.
// No clips are stubbed: a question with no clip is shown as text, so these tests need no audio and cost nothing.

/** Hears the question if there is a clip (options unlock after listening), then picks the first option. */
async function answerOne(page: import('@playwright/test').Page) {
  const listen = page.getByRole('button', { name: 'Listen', exact: true });
  if (await listen.count()) await listen.click();
  await page.locator('.options button:not([disabled])').first().click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

test('there is no mood check-in, and no timing or session plan, on the desktop or in a section', async ({ page }) => {
  await signUp(page);
  const asked: string[] = [];
  page.on('request', (r) => /\/api\/mood/.test(r.url()) && asked.push(r.url()));
  for (const path of ['/', '/phases/write', '/phases/understand', '/baseline']) {
    await page.goto(path);
    await expect(page.locator('[data-mood]'), path).toHaveCount(0);
    await expect(page.locator('body'), path).not.toContainText(/how are you (feeling|today)|¿Cómo estás hoy|Mood today|One easy one first/i);
    await expect(page.locator('body'), path).not.toContainText(/\d+\s*min(ute)?s?|How long can you do|Today: about/i);
  }
  expect(asked).toHaveLength(0);
  expect((await page.request.post('/api/mood', { data: { mood: 'good', sessionId: crypto.randomUUID() } })).status()).toBe(404);
});

/** Answers the question on screen. With no clips, the question is shown as Spanish text, so the right meaning can be looked up. */
async function answerBaseline(page: import('@playwright/test').Page, right: boolean) {
  const spanish = (await page.getByTestId('baseline-text').textContent())!.trim();
  const english = SEED_COURSE.questions.find((q) => q.spanish === spanish)!.english;
  const options = page.locator('.options button:not([disabled])');
  const option = right ? options.filter({ hasText: english }) : options.filter({ hasNotText: english });
  await option.first().click();
}

async function runBaseline(page: import('@playwright/test').Page, rights: boolean[]) {
  const saved: { stage: string; correct: boolean }[] = [];
  page.on('request', (r) => r.url().endsWith('/api/baseline') && saved.push(r.postDataJSON()));
  await page.route('**/api/clips', (r) => r.fulfill({ json: [] })); // no clips: the question shows as text
  await page.goto('/baseline');
  await expect(page.getByRole('heading', { name: 'Find your starting point' })).toBeVisible();
  for (const [n, right] of rights.entries()) {
    await expect(page.getByTestId('baseline-progress')).toContainText(`Question ${n + 1} of 5`);
    await expect(page.getByTestId('section-exit')).toBeVisible(); // never without navigation
    await answerBaseline(page, right);
    // Positive on every outcome, and nothing left to press twice.
    await expect(page.getByTestId('baseline-feedback')).toContainText(right ? 'You know this one' : 'We will learn this one together');
    await expect(page.locator('.options button:not([disabled])')).toHaveCount(0);
    await page.getByRole('button', { name: n < 4 ? 'Next question' : 'See my results' }).click();
  }
  return saved;
}

test('placement check, all correct: one pass, success message, comprehension skipped, next step offered', async ({ page }) => {
  await signUp(page);
  const saved = await runBaseline(page, [true, true, true, true, true]);
  await expect(page.getByTestId('baseline-summary')).toContainText('Starting point saved');
  await expect(page.getByTestId('baseline-score')).toContainText('all 5');
  expect(saved).toHaveLength(5); // a single pass: no second look
  expect(saved.every((s) => s.stage === 'pre' && s.correct)).toBe(true);
  await expect(page.getByTestId('baseline-next')).toHaveAttribute('href', '/phases/write');
  await expect(page.getByRole('link', { name: 'Back to the desktop' })).toBeVisible();

  await page.goto('/phases/understand');
  await expect(page.getByTestId('finished')).toBeVisible(); // nothing left to learn by ear
  await page.goto('/');
  await expect(page.getByTestId('baseline-link')).toHaveCount(0);
});

test('placement check, some wrong: results name the questions to learn, and comprehension holds only those', async ({ page }) => {
  await signUp(page);
  await runBaseline(page, [true, false, true, false, true]);
  await expect(page.getByTestId('baseline-score')).toContainText('3');
  await expect(page.getByTestId('to-learn').locator('li')).toHaveCount(2);
  await expect(page.getByTestId('baseline-next')).toHaveAttribute('href', '/phases/understand');

  await page.getByTestId('baseline-next').click();
  await expect(page).toHaveURL('/phases/understand');
  await expect(page.getByTestId('mastered-count')).toContainText('3 of 5'); // the three proved ones are skipped here, and only here
  await expect(page.getByTestId('finished')).toHaveCount(0);
});

test('placement check, all wrong: still positive, all five to learn, and the page always has navigation', async ({ page }) => {
  await signUp(page);
  await runBaseline(page, [false, false, false, false, false]);
  await expect(page.getByTestId('to-learn').locator('li')).toHaveCount(5);
  await expect(page.getByTestId('baseline-summary')).toContainText('Starting point saved');
  await expect(page.getByTestId('baseline-next')).toBeVisible();
  await page.getByRole('link', { name: 'Back to the desktop' }).click();
  await expect(page).toHaveURL('/');
});

test('placement check: leaving part-way keeps the answers and resumes at the next question', async ({ page }) => {
  await signUp(page);
  await page.route('**/api/clips', (r) => r.fulfill({ json: [] }));
  await page.goto('/baseline');
  await answerBaseline(page, true);
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByTestId('section-exit').click();
  await expect(page).toHaveURL('/');
  await page.goto('/baseline');
  await expect(page.getByTestId('baseline-progress')).toContainText('Question 2 of 5');
});

test('the starting-point check does not count as practice: no coins and no mastery', async ({ page }) => {
  await signUp(page);
  await page.goto('/baseline');
  await answerOne(page);
  await page.goto('/');
  await expect(page.getByTestId('desktop-coins')).toContainText('0 coins');
});
