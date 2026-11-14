import { expect, test, type Page } from '@playwright/test';

/**
 * Demo mode (tasks 24.1 to 24.3, design D22): one tap in, six stops, a Pretend button on every spoken step, nothing
 * written to the server, a Demo label on every screen, and a reset. No microphone is available in these tests.
 */
const writes: string[] = [];
test.beforeEach(async ({ page }) => {
  writes.length = 0;
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith('/api/') && r.method() !== 'GET') writes.push(`${r.method()} ${u.pathname}`);
  });
  await page.addInitScript(() => { try { localStorage.setItem('sound', 'off'); localStorage.setItem('memorise-demo-v1', JSON.stringify({ meter: false })); } catch { /* no storage */ } });
});

const STOPS = ['hear', 'memorise', 'round', 'tutor', 'rewards', 'teacher'];

test('24.1 the front page offers the demo, which opens with no class code, and every stop is reachable directly', async ({ page }) => {
  await page.goto('/welcome');
  await page.getByTestId('demo-entry').click();
  await expect(page.getByTestId('demo-hub')).toBeVisible();
  for (const id of STOPS) await expect(page.getByTestId(`demo-stop-${id}`)).toBeVisible();
  for (const id of STOPS) {
    await page.goto(`/demo/${id}`);
    await expect(page.getByTestId('demo-bar')).toContainText('Demo');
    await expect(page.getByTestId('demo-bar')).toContainText(`stop ${STOPS.indexOf(id) + 1} of 6`);
  }
  expect(writes).toEqual([]);
});

test('24.1 the hear stop works with the pretend button and scores by rules', async ({ page }) => {
  await page.goto('/demo/hear');
  await page.getByTestId('hear-play').click();
  await page.getByTestId('pretend').click();
  await expect(page.getByTestId('hear-result')).toBeVisible();
  await expect(page.getByTestId('accuracy')).toBeVisible();
  await expect(page.getByTestId('fix')).toContainText('One thing to fix');
  expect(writes).toEqual([]);
});

test('24.2 the memorise stop: the pretend button says the screen for the visitor, and with no recogniser at all the screen still moves on', async ({ page }) => {
  // A recogniser that opens but never hears anything: the visitor is in a noisy room.
  await page.addInitScript(() => {
    class Deaf { onstart: (() => void) | null = null; onend: (() => void) | null = null; start() { setTimeout(() => this.onstart?.(), 0); } stop() { this.onend?.(); } abort() {} }
    Object.assign(window, { SpeechRecognition: Deaf, webkitSpeechRecognition: Deaf });
  });
  await page.goto('/demo/memorise');
  await page.getByTestId('lab-start').click();
  await page.getByTestId('demo-pretend').click({ timeout: 15_000 });
  await expect(page.getByTestId('lab-fb')).toBeVisible();
  expect(writes).toEqual([]);
});

test('24.2 the memorise stop with no speech recognition at all marks itself and still moves on', async ({ page }) => {
  await page.addInitScript(() => { Object.assign(window, { SpeechRecognition: undefined, webkitSpeechRecognition: undefined }); });
  await page.goto('/demo/memorise');
  await page.getByTestId('lab-start').click();
  await page.getByTestId('lab-said').click({ timeout: 15_000 });
  await expect(page.getByTestId('lab-fb')).toBeVisible();
  expect(writes).toEqual([]);
});

test('24.2 a timed round runs from the pretend button with no microphone and saves nothing', async ({ page }) => {
  await page.goto('/demo/round');
  await page.getByRole('button', { name: 'Start a round' }).click();
  for (let i = 0; i < 5; i++) {
    await page.getByTestId('demo-pretend').click({ timeout: 20_000 });
    await expect(page.getByTestId('feedback')).toBeVisible();
    await page.getByRole('button', { name: /Next question|See how I did/ }).click();
  }
  await expect(page.getByTestId('summary')).toBeVisible();
  await expect(page.getByTestId('rank')).toContainText('speed rank');
  expect(writes).toEqual([]);
});

test('24.2 the tutor, rewards and teacher stops work, and the teacher stop is marked as sample data', async ({ page }) => {
  await page.goto('/demo/tutor');
  await page.getByTestId('feeling-joy').click();
  await expect(page.getByTestId('feeling-joy')).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/demo/rewards');
  await expect(page.getByTestId('demo-euros')).toHaveText('€35');
  await page.getByTestId('demo-practise').click();
  await expect(page.getByTestId('demo-euros')).toHaveText('€40');
  await page.goto('/demo/teacher');
  await expect(page.getByTestId('sample-banner')).toBeVisible();
  await expect(page.getByTestId('demo-bar')).toContainText('Demo');
  expect(writes).toEqual([]);
});

test('24.3 reset returns to the hub and clears what the demo kept; recording mode removes the countdown', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/demo/rewards');
  await page.evaluate(() => { localStorage.setItem('ladder:demo-1', '{"at":2,"met":0}'); localStorage.setItem('ladder:keep', '{"at":1,"met":0}'); });
  await page.getByTestId('demo-bar').locator('summary').click();
  await Promise.all([page.waitForEvent('load'), page.getByTestId('demo-recording').click()]); // each stop reads the switch as it opens
  await page.getByTestId('demo-bar').locator('summary').click();
  await page.getByTestId('demo-reset').click();
  await expect(page.getByTestId('demo-hub')).toBeVisible();
  expect(await page.evaluate(() => [localStorage.getItem('ladder:demo-1'), localStorage.getItem('ladder:keep'), sessionStorage.getItem('demo-recording')])).toEqual([null, '{"at":1,"met":0}', 'on']);

  await page.goto('/demo/round');
  await page.getByRole('button', { name: 'Start a round' }).click();
  await expect(page.getByTestId('demo-pretend')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.window-bar')).toBeHidden();
  await page.waitForTimeout(5000); // past the first window: nothing times out in recording mode
  await expect(page.getByTestId('demo-pretend')).toBeVisible();
});

test('24.1 demo screens fit a 360 by 640 phone with the Demo label showing', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  for (const id of ['hear', 'round']) {
    await page.goto(`/demo/${id}`);
    await expect(page.getByTestId('demo-bar')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
});
