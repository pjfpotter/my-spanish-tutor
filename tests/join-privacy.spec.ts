import { expect, test } from '@playwright/test';
import { SEED_COURSE } from '../lib/course/seed';
import { SEED_CLASS_CODE, signUp } from './helpers';

// Tasks 3.3, 3.5, 3.6: class-code joining with the privacy notice, delete-everything, and the linked notice and DPIA.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

test('a valid code shows the course, its test date and the privacy notice, which must be acknowledged', async ({ page }) => {
  await page.goto('/welcome');
  await page.getByRole('textbox').fill(SEED_CLASS_CODE.toLowerCase());
  await page.getByRole('button', { name: 'Find my class' }).click();
  await expect(page.getByTestId('course-found')).toContainText(SEED_COURSE.title);
  await expect(page.getByTestId('course-date')).toContainText('2026');
  await expect(page.getByTestId('course-found')).toContainText('start by writing');
  await expect(page.getByTestId('privacy-notice')).toContainText('What we never keep');
  await expect(page.getByRole('button', { name: 'Carry on' })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'I have read this' }).check();
  await expect(page.getByRole('button', { name: 'Carry on' })).toBeEnabled();
});

test('an unknown code explains itself and sends the student to their teacher', async ({ page }) => {
  await page.goto('/welcome');
  await page.getByRole('textbox').fill('NOPE99');
  await page.getByRole('button', { name: 'Find my class' }).click();
  await expect(page.locator('p.error')).toContainText('could not find that class code');
  await expect(page.locator('p.error')).toContainText('teacher');
  await expect(page.getByTestId('privacy-notice')).toHaveCount(0);
});

test('a repeat code makes no second profile, and a profile cannot be made without the notice acknowledged', async ({ page }) => {
  const data = { classCode: SEED_CLASS_CODE, nickname: (await import('../lib/profile/profile')).nicknameOptions(1)[0], interests: [] };
  const refused = await page.request.post('/api/profile', { data: { ...data, privacyAcknowledged: false } });
  expect(refused.status()).toBe(400);
  const a = await page.request.post('/api/join', { data: { code: SEED_CLASS_CODE } });
  const b = await page.request.post('/api/join', { data: { code: SEED_CLASS_CODE } });
  expect(await a.json()).toEqual(await b.json());
  const bad = await page.request.post('/api/profile', { data: { ...data, classCode: 'NOPE99', privacyAcknowledged: true } });
  expect(bad.status()).toBe(404);
});

test('the privacy notice and impact assessment are linked from the app', async ({ page }) => {
  await signUp(page);
  await page.getByTestId('privacy-link').click();
  await expect(page).toHaveURL('/privacy');
  await expect(page.getByTestId('privacy-notice')).toContainText('How to delete everything');
  await page.getByTestId('dpia-link').click();
  await expect(page).toHaveURL('/privacy/dpia');
  await expect(page.getByTestId('dpia')).toContainText('Data we hold');
});

test('delete everything removes the profile, its recovery code and the device state', async ({ page, browser }) => {
  const code = await signUp(page);
  await page.evaluate(() => localStorage.setItem('planner:minutes', '20'));
  await page.goto('/privacy');
  await page.getByRole('button', { name: 'Delete everything' }).click();
  // Asking is not deleting: backing out keeps the profile.
  await page.getByRole('button', { name: 'Keep my progress' }).click();
  await page.goto('/');
  await expect(page.getByTestId('nickname')).toBeVisible();

  await page.goto('/privacy');
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await page.getByRole('button', { name: 'Yes, delete everything' }).click();
  await expect(page).toHaveURL('/welcome');
  expect(await page.evaluate(() => localStorage.getItem('planner:minutes'))).toBeNull();
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Make my profile' })).toBeVisible();

  // The recovery code no longer works anywhere.
  const other = await browser.newContext();
  const res = await other.request.post('/api/profile/restore', { data: { code } });
  expect(res.status()).toBe(404);
  await other.close();
});
