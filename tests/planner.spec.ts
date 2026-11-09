import { expect, test } from '@playwright/test';

// Tasks 11.1 to 11.3: readiness meter that names its next action, reminders that stay off until the student opts in.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on');
    // Record every notification the page tries to show.
    (window as unknown as { shown: string[] }).shown = [];
    class FakeNotification { static permission = 'granted'; static requestPermission = async () => 'granted'; constructor(t: string) { (window as unknown as { shown: string[] }).shown.push(t); } }
    (window as unknown as { Notification: unknown }).Notification = FakeNotification;
  });
});

test('shows readiness with its next action, and no session plan or timings', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('readiness')).toHaveText('Readiness: 0%');
  await expect(page.getByTestId('readiness-next')).toContainText('Listen to the questions');
  await expect(page.getByRole('progressbar', { name: 'Readiness' })).toHaveAttribute('aria-valuenow', '0');

  await expect(page.getByTestId('plan-message')).toHaveCount(0);
  await expect(page.locator('[data-minutes]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/\d+ min|How long can you do/);
});

test('sends no notification unless the student opts in', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => (window as unknown as { shown: string[] }).shown)).toEqual([]);
  await page.getByTestId('reminder-toggle').click();
  await expect(page.getByTestId('reminder-toggle')).toHaveText('Turn reminder off');
  // Opting in does not itself send one: it waits for the chosen time on a later visit.
  expect(await page.evaluate(() => (window as unknown as { shown: string[] }).shown)).toEqual([]);
});

test('reminder fires once on a later visit when opted in and the time has passed', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('planner:prefs', JSON.stringify({ enabled: true, time: '00:00' })));
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as unknown as { shown: string[] }).shown.length)).toBe(1);
  await page.reload();
  // The recorder restarts on each load, so zero here means it was not shown a second time today.
  expect(await page.evaluate(() => (window as unknown as { shown: string[] }).shown.length)).toBe(0);
});
