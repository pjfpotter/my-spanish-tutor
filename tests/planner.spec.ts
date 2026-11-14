import { expect, test } from '@playwright/test';
import { signUp } from './helpers';

// Tasks 11.1 to 11.3: the readiness meter. There is no reminder in version one.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on');
    // Record every notification the page tries to show.
    (window as unknown as { shown: string[] }).shown = [];
    class FakeNotification { static permission = 'granted'; static requestPermission = async () => 'granted'; constructor(t: string) { (window as unknown as { shown: string[] }).shown.push(t); } }
    (window as unknown as { Notification: unknown }).Notification = FakeNotification;
  });
});

test("shows readiness, with the next action in What's next? and no session plan or timings", async ({ page }) => {
  await signUp(page);
  await expect(page.getByTestId('readiness')).toHaveText('Readiness: 0%');
  await expect(page.getByTestId('readiness-next')).toHaveCount(0); // the meter no longer repeats the next action
  await expect(page.getByTestId('whats-next-text')).toContainText('what the test questions mean');
  await expect(page.getByRole('progressbar', { name: 'Readiness' })).toHaveAttribute('aria-valuenow', '0');

  await expect(page.getByTestId('plan-message')).toHaveCount(0);
  await expect(page.locator('[data-minutes]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/\d+ min|How long can you do/);
});

test('offers no reminder, and shows no notification even for a device with old saved settings', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('planner:prefs', JSON.stringify({ enabled: true, time: '00:00' })));
  await page.goto('/');
  await expect(page.getByTestId('reminder-toggle')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/remind/i);
  expect(await page.evaluate(() => (window as unknown as { shown: string[] }).shown)).toEqual([]);
  // The old saved settings are cleared from the device.
  expect(await page.evaluate(() => localStorage.getItem('planner:prefs'))).toBeNull();
});
