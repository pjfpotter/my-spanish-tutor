import { expect, test } from '@playwright/test';
import { CHEEKY_POOL } from '../lib/tele/cheeky';
import { signUp, unlockAutomate } from './helpers';

// Task 13.5: the cheeky pool is off until the course owner switches it on; it is bought with coins; and with the switch
// off no cheeky line is sent to the student at all. Tests in this file change a course-wide setting, so they run one at a time.
test.describe.configure({ mode: 'serial' });

const OWNER_TOKEN = 'e2e-owner-token-0123456789';
const setPool = (page: import('@playwright/test').Page, enabled: boolean) => page.request.post('/api/owner/cheeky', { data: { token: OWNER_TOKEN, enabled } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});
test.afterAll(async ({ request }) => {
  await request.post('/api/owner/cheeky', { data: { token: OWNER_TOKEN, enabled: false } });
});

test('the owner can switch the pool on and off, and only with the owner token', async ({ page }) => {
  expect((await page.request.post('/api/owner/cheeky', { data: { token: 'TELE8', enabled: true } })).status()).toBe(404);
  await page.goto(`/owner/${OWNER_TOKEN}`);
  await expect(page.getByTestId('cheeky-state')).toContainText('off');
  await page.getByTestId('cheeky-toggle').click();
  await expect(page.getByTestId('cheeky-state')).toContainText('on');
  await page.reload();
  await expect(page.getByTestId('cheeky-state')).toContainText('on');
  await page.getByTestId('cheeky-toggle').click();
  await expect(page.getByTestId('cheeky-state')).toContainText('off');
});

test('with the pool off the shop does not offer it; on, a student buys it and Tele can say its lines; off again, they vanish', async ({ page }) => {
  test.setTimeout(120_000);
  await signUp(page);
  await unlockAutomate(page); // plenty of practice, so plenty of coins
  const lineTexts = CHEEKY_POOL.map((l) => l.es);
  const seen = async () => {
    await page.goto('/');
    const html = await page.content();
    return lineTexts.some((t) => html.includes(t));
  };

  await setPool(page, false);
  await page.goto('/shop');
  await expect(page.getByTestId('item-phrases-traviesas')).toHaveCount(0);
  expect(await seen()).toBe(false);

  await setPool(page, true);
  await page.goto('/shop');
  await expect(page.getByTestId('item-phrases-traviesas')).toBeVisible();
  expect(await seen()).toBe(false); // on, but not bought: still nothing
  await page.goto('/shop');
  await page.getByTestId('item-phrases-traviesas').getByRole('button').click();
  await expect(page.getByTestId('message')).toContainText('You got Cheeky phrases');
  expect(await seen()).toBe(true); // bought: the lines are now part of the page for this student

  await setPool(page, false);
  expect(await seen()).toBe(false); // switched off: gone, though they still own it
});
