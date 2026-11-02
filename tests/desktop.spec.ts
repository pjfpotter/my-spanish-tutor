import { expect, test } from '@playwright/test';
import { SEED_COURSE } from '../lib/course/seed';
import { daysUntil } from '../lib/progress/progress';
import { signUp } from './helpers';

// Task 18.4: the desktop home. Countdown (from the course test date), five question files, four phases in their fixed
// order, and locked phases that show as static and cannot be opened.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

test('shows Tele, the countdown, the five question files and the four phases in order', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  page.on('pageerror', (e) => problems.push(e.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'My Spanish Tutor' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Tele, a cream television/ })).toBeVisible();
  await expect(page.getByTestId('days-to-test')).toContainText(`${daysUntil(SEED_COURSE.testDate)} días`);
  await expect(page.getByTestId('question-file')).toHaveCount(5);
  await expect(page.getByTestId('question-file').first()).toContainText('Pregunta1.txt');

  const order = await page.locator('[data-phase]').evaluateAll((els) => els.map((e) => e.getAttribute('data-phase')));
  expect(order).toEqual(['write', 'understand', 'memorise', 'automate']);
  expect(problems).toEqual([]);
});

test('write and understand are open; memorise and automate are locked with a reason', async ({ page }) => {
  await page.goto('/');
  for (const id of ['write', 'understand']) {
    await expect(page.locator(`[data-phase="${id}"]`)).toHaveAttribute('data-state', 'open');
  }
  const memorise = page.locator('[data-phase="memorise"]');
  await expect(memorise).toHaveAttribute('data-state', 'locked');
  await expect(memorise).toHaveAttribute('aria-disabled', 'true');
  await expect(memorise).toContainText('First confirm all five answers and master all five questions by ear.');
  await expect(page.locator('[data-phase="automate"]')).toContainText('First memorise all five answers.');
});

test('a locked phase says so in words and a shape, not by colour alone', async ({ page }) => {
  await page.goto('/');
  const locked = page.locator('[data-phase="memorise"]');
  await expect(locked.getByText('Locked', { exact: true })).toBeVisible();
  await expect(locked.locator('svg[data-shape="locked"]')).toHaveCount(1);
});

test('clicking a locked phase does nothing', async ({ page }) => {
  await page.goto('/');
  // Playwright treats aria-disabled as unclickable; force the tap a real finger would make.
  await page.locator('[data-phase="memorise"]').click({ force: true });
  await page.locator('[data-phase="automate"]').click({ force: true });
  await expect(page).toHaveURL(/\/$/);
});

test('typing the address of a locked phase sends you back to the desktop', async ({ page }) => {
  await signUp(page); // a device with no profile is sent to sign up instead
  await page.goto('/phases/memorise');
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/phases/automate');
  await expect(page).toHaveURL(/\/$/);
});

test('an open phase opens, and an unknown phase is not found', async ({ page }) => {
  await signUp(page);
  await page.locator('[data-phase="write"]').click();
  await expect(page).toHaveURL(/\/phases\/write$/);
  await expect(page.getByText('This step is built in a later milestone.')).toBeVisible();

  const res = await page.goto('/phases/cheat');
  expect(res?.status()).toBe(404);
});

test('a locked phase can be reached and read from the keyboard', async ({ page }) => {
  await page.goto('/');
  const locked = page.locator('[data-phase="memorise"]');
  await locked.focus();
  await expect(locked).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/$/);
});

test('fits the screen without sideways scrolling', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
