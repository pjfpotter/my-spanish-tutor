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
  for (const path of ['/phases/understand/check', '/phases/write', '/phases/understand', '/phases/memorise', '/phases/automate']) {
    await page.goto(path);
    await expect(page.getByTestId('section-exit'), path).toBeVisible();
    await page.getByTestId('section-exit').click();
    await expect(page, path).toHaveURL('/');
  }
});

test('leaving the write section keeps a confirmed answer, and Back goes back without losing it', async ({ page }) => {
  await signUp(page);
  await page.goto('/phases/write');
  await expect(page.getByTestId('section-back')).toHaveCount(0); // nothing before the first question
  for (const t of ['Me gusta', 'jugar al baloncesto', 'porque', 'es divertido']) {
    await page.locator('.ws-view .ws-cell:not(.static)', { hasText: t }).first().dispatchEvent('click');
    await page.waitForTimeout(150);
  }
  await page.getByRole('button', { name: 'Check it' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('button', { name: /^1.*confirmed/ })).toBeVisible();

  await page.getByTestId('section-back').click();
  await expect(page.getByRole('button', { name: /^1.*confirmed/ })).toBeVisible(); // question 1, still confirmed

  await page.getByTestId('section-exit').click();
  await expect(page).toHaveURL('/');
  await page.goto('/phases/write');
  await expect(page.getByRole('button', { name: /^1.*confirmed/ })).toBeVisible(); // kept
});

test('leaving part-way through understand keeps the attempts already made', async ({ page }) => {
  await signUp(page);
  const attempts: unknown[] = [];
  page.on('request', (r) => r.url().endsWith('/api/attempts') && attempts.push(r.postDataJSON()));
  await page.goto('/phases/understand?start=1');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await page.locator('.options button:not([disabled])').first().click();
  await expect.poll(() => attempts.length).toBe(1);
  await page.getByTestId('section-exit').click();
  await expect(page).toHaveURL('/');
  expect(attempts).toHaveLength(1);
});
