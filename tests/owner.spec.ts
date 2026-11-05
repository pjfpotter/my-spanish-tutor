import { expect, test } from '@playwright/test';
import { SEED_COURSE } from '../lib/course/seed';
import { SEED_CLASS_CODE, signUp } from './helpers';

// Tasks 15.1, 15.2, 14.2: the owner overview, reached only through the owner link.
const OWNER = '/owner/e2e-owner-token-0123456789';

test('the owner link opens the class overview with nicknames and progress only', async ({ page }) => {
  await signUp(page);
  const nickname = (await page.getByTestId('nickname').textContent())!.replace('Hola, ', '').trim();
  await page.goto(OWNER);
  await expect(page.getByRole('heading', { name: SEED_COURSE.title })).toBeVisible();
  await expect(page.getByText('Joined:')).toBeVisible();
  const row = page.getByTestId('student-row').filter({ hasText: nickname });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Writing answers');
  await expect(page.getByTestId('sample-banner')).toHaveCount(0);
  await expect(page.getByTestId('cost-per-student')).toContainText('Estimated cost per student');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('the student class code, a wrong token and a missing token show no overview', async ({ page }) => {
  for (const path of [`/owner/${SEED_CLASS_CODE}`, '/owner/not-the-right-token-0123456789', `${OWNER}x`]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
    await expect(page.getByText('Joined:')).toHaveCount(0);
  }
});

test('demo mode shows labelled sample data, every figure is marked, and the real course is not shown', async ({ page }) => {
  await signUp(page); // a real student exists, but the sample view must not read the database
  await page.goto(`${OWNER}?demo=1`);
  await expect(page.getByRole('heading', { name: /sample class/ })).toBeVisible(); // the real course title is not shown
  await expect(page.getByTestId('sample-banner')).toContainText('Sample data');
  const figures = await page.locator('[data-figure]').count();
  expect(figures).toBeGreaterThan(20);
  expect(await page.locator('[data-figure] [data-sample]').count()).toBe(figures);
  await expect(page.getByTestId('student-row')).toHaveCount(12);
});
