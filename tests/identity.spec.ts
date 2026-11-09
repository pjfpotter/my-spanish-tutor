import { expect, test } from '@playwright/test';
import { SEED_CLASS_CODE, signUpThroughForm as signUp } from './helpers';

// Task 3.4: anonymous profile, nickname picker, recovery code. Interest tags are not asked for at sign-up (19.4).

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

test('signing up types only a code: the nickname step has no text field', async ({ page }) => {
  await page.goto('/welcome');
  // The first step takes the class code, one short code and nothing else.
  await expect(page.locator('input[type="text"], input[type="email"], input[type="tel"], input:not([type]), textarea')).toHaveCount(1);
  await page.getByRole('textbox').fill(SEED_CLASS_CODE);
  await page.getByRole('button', { name: 'Find my class' }).click();
  await page.getByRole('checkbox', { name: 'I have read this' }).check();
  await page.getByRole('button', { name: 'Carry on' }).click();
  // No text field of any kind where the nickname is chosen: no name, no email.
  await expect(page.locator('input[type="text"], input[type="email"], input[type="tel"], input:not([type]), textarea')).toHaveCount(0);
  await expect(page.getByRole('radio')).toHaveCount(6);
  await expect(page.getByRole('checkbox')).toHaveCount(0); // no interest tags in the join flow
  // A nickname is required.
  await page.getByRole('button', { name: 'Create my profile' }).click();
  await expect(page.locator('p.error')).toContainText('Pick a nickname');
});

test('shows a recovery code once, then the home screen greets the nickname', async ({ page }) => {
  const code = await signUp(page);
  expect(code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  await expect(page.getByTestId('nickname')).toContainText('Hi,');
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
  await expect(page2.getByRole('link', { name: 'I lost my account' })).toBeVisible(); // not signed in there
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

test('the first screen offers "Sign up for a new account" and "I lost my account", each explained in a line (19.6)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('sign-up')).toHaveText('Sign up for a new account');
  await expect(page.getByTestId('lost-account')).toHaveText('I lost my account');
  await expect(page.locator('body')).toContainText('You do not need a name or an email');
  await expect(page.locator('body')).toContainText('Type the code you were given');
  await expect(page.locator('body')).not.toContainText(/Make my profile|I have a code/);
  await page.getByTestId('lost-account').click();
  await expect(page).toHaveURL('/restore');
  await page.goBack();
  await page.getByTestId('sign-up').click();
  await expect(page).toHaveURL('/welcome');
});
