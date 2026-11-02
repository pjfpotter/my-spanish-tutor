import { expect, type Page } from '@playwright/test';

/** Creates an anonymous profile through the real sign-up screen and returns its recovery code. */
export async function signUp(page: Page): Promise<string> {
  await page.goto('/welcome');
  await page.getByRole('radio').first().check();
  await page.getByRole('checkbox', { name: 'football' }).check();
  await page.getByRole('button', { name: 'Create my profile' }).click();
  const code = (await page.getByTestId('recovery-code').textContent())!.trim();
  await page.getByRole('button', { name: /Let's go/ }).click();
  await expect(page).toHaveURL('/');
  return code;
}
