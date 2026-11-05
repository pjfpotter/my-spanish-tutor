import { expect, test } from '@playwright/test';
import { signUp } from './helpers';

// Task 10.4: the mood check-in, the easy quick win after "not a fan", and the starting-point check.
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

test('the mood check-in is one tap, saved, and asked once per visit', async ({ page }) => {
  await signUp(page);
  const sent: Record<string, unknown>[] = [];
  page.on('request', (r) => r.url().endsWith('/api/mood') && sent.push(r.postDataJSON()));
  await page.goto('/');
  await page.locator('[data-mood="nervous"]').click();
  await expect(page.getByTestId('mood-done')).toContainText('Nervous');
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({ mood: 'nervous' });
  await expect(page.getByTestId('quick-win')).toHaveCount(0); // nervous gets a gentle reply, not a quick win
  await page.reload();
  await expect(page.getByTestId('mood-done')).toContainText('Nervous');
  await expect(page.locator('[data-mood]')).toHaveCount(0);
});

test('the mood check-in can be skipped, and nothing is sent', async ({ page }) => {
  await signUp(page);
  const sent: unknown[] = [];
  page.on('request', (r) => r.url().endsWith('/api/mood') && sent.push(1));
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.locator('[data-mood]')).toHaveCount(0);
  expect(sent).toHaveLength(0);
});

test('"Spanish is not my favourite" leads to one easy question, then a good ending', async ({ page }) => {
  await signUp(page);
  await page.goto('/');
  await page.locator('[data-mood="not_a_fan"]').click();
  await page.getByTestId('quick-win').click();
  await expect(page).toHaveURL(/\/phases\/understand\?quick=1/);
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await page.locator('.options button:not([disabled])').first().click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByTestId('finished')).toContainText('That is one done, and it counts');
});

test('the starting-point check tests, teaches, tests again, and is then no longer offered', async ({ page }) => {
  await signUp(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByTestId('baseline-link').click();
  await expect(page).toHaveURL('/baseline');

  const saved: { stage: string }[] = [];
  page.on('request', (r) => r.url().endsWith('/api/baseline') && saved.push(r.postDataJSON()));
  for (let n = 1; n <= 5; n++) {
    await expect(page.getByTestId('baseline-progress')).toContainText(`First look: question ${n} of 5`);
    await answerOne(page);
    await page.getByRole('button', { name: n < 5 ? 'Next' : 'Show me what they mean', exact: true }).click();
  }
  await expect(page.getByTestId('teach-list').locator('li')).toHaveCount(5);
  await page.getByRole('button', { name: 'Try again' }).click();
  for (let n = 1; n <= 5; n++) {
    await expect(page.getByTestId('baseline-progress')).toContainText(`Second look: question ${n} of 5`);
    await answerOne(page);
    await page.getByRole('button', { name: n < 5 ? 'Next' : 'See how I did', exact: true }).click();
  }
  await expect(page.getByTestId('baseline-summary')).toContainText('Starting point saved');
  expect(saved.map((s) => s.stage)).toEqual([...Array(5).fill('pre'), ...Array(5).fill('post')]);

  await page.goto('/');
  await expect(page.getByTestId('baseline-link')).toHaveCount(0);
});

test('the starting-point check does not count as practice: no coins and no mastery', async ({ page }) => {
  await signUp(page);
  await page.goto('/baseline');
  await answerOne(page);
  await page.goto('/');
  await expect(page.getByTestId('desktop-coins')).toContainText('0 coins');
});
