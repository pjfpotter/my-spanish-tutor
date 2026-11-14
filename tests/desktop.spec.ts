import { expect, test } from '@playwright/test';
import { SEED_COURSE } from '../lib/course/seed';
import { daysUntil } from '../lib/progress/progress';
import { signUp } from './helpers';

// Task 18.4: the desktop home. Countdown (from the course test date), a can-do row per question, four steps in their
// fixed order, and locked steps that cannot be opened. Every window title is plain English.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

test('shows Tele, the countdown, a can-do row per question and the four steps in order', async ({ page }) => {
  await signUp(page);
  const problems: string[] = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  page.on('pageerror', (e) => problems.push(e.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'My Spanish Tutor' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Tele, a 1970s television/ })).toBeVisible();
  await expect(page.getByTestId('days-to-test')).toContainText(`${daysUntil(SEED_COURSE.testDate)} day`);
  await expect(page.getByTestId('can-do-row')).toHaveCount(5);
  await expect(page.getByTestId('can-do-row').first()).toContainText('I can answer');

  const order = await page.locator('[data-phase]').evaluateAll((els) => els.map((e) => e.getAttribute('data-phase')));
  expect(order).toEqual(['understand', 'write', 'memorise', 'automate']);
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
  await expect(memorise).toContainText('First confirm an answer and master all five questions by ear.');
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
  await expect(page.getByRole('heading', { name: 'Write' })).toBeVisible();

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

test('every window has a plain-English title, with no .exe and no Spanish label', async ({ page }) => {
  await signUp(page);
  const titles = await page.locator('.win-bar > span:first-child').allTextContents();
  expect(titles).toEqual(['What Tele says', "What's next?", 'What I can do', 'Your speaking test', 'Your four steps', 'Your streak']);
  for (const t of titles) expect(t).not.toMatch(/\.exe|preguntas/i);
  await expect(page.getByRole('link', { name: 'My progress' })).toHaveCount(0); // there is no progress page
});

test("What's next? points a new student at Understand, and the can-do rows start at Not yet", async ({ page }) => {
  await signUp(page);
  await expect(page.getByTestId('whats-next-text')).toContainText('first session');
  await expect(page.getByTestId('whats-next-text')).toContainText('what the test questions mean');
  await page.getByTestId('whats-next-go').click();
  await expect(page).toHaveURL(/\/phases\/understand/);
  await page.goto('/');
  await expect(page.getByTestId('cando-count')).toHaveText('0 of 5 ready');
  await expect(page.locator('.cando-tick[data-state="not-yet"]')).toHaveCount(20);
  await expect(page.getByTestId('can-do-sticker')).toHaveCount(0);
});

test("a can-do row opens that question's next step", async ({ page }) => {
  await signUp(page);
  await page.getByTestId('can-do-link').first().click();
  await expect(page).toHaveURL(/\/phases\/understand/);
});

test('the greeting shows the nickname as text on the dusk sky', async ({ page }) => {
  await signUp(page);
  await expect(page.getByTestId('greeting')).toBeVisible();
  await expect(page.getByTestId('greeting-hello')).toHaveText(/^(Hello|Good (morning|afternoon|evening)),$/);
  await expect(page.getByTestId('nickname')).not.toBeEmpty();
});

test('the greeting cloud does not move when the device asks for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signUp(page);
  const animation = await page.locator('.greeting-cloud').evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe('none');
});
