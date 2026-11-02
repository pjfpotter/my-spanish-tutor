import { expect, test } from '@playwright/test';
import { signUp } from './helpers';

// Task 3.4: anonymous profile, nickname picker, fixed interest tags, recovery code.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

test('signing up needs no typing: a nickname from a list and interests from a fixed list', async ({ page }) => {
  await page.goto('/welcome');
  // No text field of any kind on the sign-up screen: no name, no email, no free-text interests.
  await expect(page.locator('input[type="text"], input[type="email"], input[type="tel"], input:not([type]), textarea')).toHaveCount(0);
  await expect(page.getByRole('radio')).toHaveCount(6);
  await expect(page.getByRole('checkbox').first()).toBeVisible();
  // A nickname is required.
  await page.getByRole('button', { name: 'Create my profile' }).click();
  await expect(page.locator('p.error')).toContainText('Pick a nickname');
});

test('at most five interests can be picked', async ({ page }) => {
  await page.goto('/welcome');
  const boxes = page.getByRole('checkbox');
  for (let i = 0; i < 7; i++) await boxes.nth(i).check({ force: true }).catch(() => {});
  expect(await page.locator('input[type="checkbox"]:checked').count()).toBe(5);
});

test('shows a recovery code once, then the home screen greets the nickname', async ({ page }) => {
  const code = await signUp(page);
  expect(code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  await expect(page.getByTestId('nickname')).toContainText('Hola,');
  // Back on the sign-up page a signed-in device goes home.
  await page.goto('/welcome');
  await expect(page).toHaveURL('/');
});

test('restores on a second browser with the recovery code', async ({ page, browser }) => {
  const code = await signUp(page);
  const nickname = (await page.getByTestId('nickname').textContent())!;

  const other = await browser.newContext();
  const page2 = await other.newPage();
  await page2.goto('/');
  await expect(page2.getByRole('link', { name: 'I have a code' })).toBeVisible(); // not signed in there
  await page2.goto('/restore');
  await page2.getByRole('textbox').fill(code.toLowerCase());
  await page2.getByRole('button', { name: 'Get my progress' }).click();
  await expect(page2).toHaveURL('/');
  await expect(page2.getByTestId('nickname')).toHaveText(nickname);
  await other.close();
});

test('a wrong code explains itself and offers a fresh start', async ({ page }) => {
  await page.goto('/restore');
  await page.getByRole('textbox').fill('AAAAA-AAAAA');
  await page.getByRole('button', { name: 'Get my progress' }).click();
  await expect(page.locator('p.error')).toContainText('did not match');
  await expect(page.getByRole('link', { name: 'start fresh' })).toBeVisible();
});

test('phase pages send a device with no profile to sign up', async ({ page }) => {
  await page.goto('/phases/understand');
  await expect(page).toHaveURL('/welcome');
});
