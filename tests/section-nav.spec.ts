import { expect, test } from '@playwright/test';
import { signUp, unlockAutomate } from './helpers';

// Task 19.3: every screen inside a section has a visible way back to the desktop, and leaving keeps progress.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

test('every section screen has an exit to the desktop that works', async ({ page }) => {
  await signUp(page);
  await unlockAutomate(page); // opens all four sections
  await page.route('**/api/clips', (r) => r.fulfill({ json: [] }));
  for (const path of ['/baseline', '/phases/write', '/phases/understand', '/phases/memorise', '/phases/automate']) {
    await page.goto(path);
    await expect(page.getByTestId('section-exit'), path).toBeVisible();
    await page.getByTestId('section-exit').click();
    await expect(page, path).toHaveURL('/');
  }
});

test('leaving the write section keeps a confirmed answer, and Previous question goes back without losing it', async ({ page }) => {
  await signUp(page);
  await page.goto('/phases/write');
  await expect(page.getByTestId('section-back')).toHaveCount(0); // nothing before the first question
  await page.getByRole('button', { name: 'Confirm this answer' }).click();
  await expect(page.getByRole('button', { name: 'Confirmed', exact: true })).toBeVisible();

  await page.getByRole('button', { name: /^2/ }).first().click();
  await page.getByTestId('section-back').click();
  await expect(page.getByRole('button', { name: 'Confirmed', exact: true })).toBeVisible(); // question 1, still confirmed

  await page.getByTestId('section-exit').click();
  await expect(page).toHaveURL('/');
  await page.goto('/phases/write');
  await expect(page.getByRole('button', { name: 'Confirmed', exact: true })).toBeVisible(); // kept
});

test('leaving part-way through understand keeps the attempts already made', async ({ page }) => {
  await signUp(page);
  const attempts: unknown[] = [];
  page.on('request', (r) => r.url().endsWith('/api/attempts') && attempts.push(r.postDataJSON()));
  await page.goto('/phases/understand');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await page.locator('.options button:not([disabled])').first().click();
  await expect.poll(() => attempts.length).toBe(1);
  await page.getByTestId('section-exit').click();
  await expect(page).toHaveURL('/');
  expect(attempts).toHaveLength(1);
});
