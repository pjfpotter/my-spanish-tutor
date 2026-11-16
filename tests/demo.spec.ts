import { expect, test, type Page } from '@playwright/test';

/**
 * Demo mode (tasks 24.1 to 24.3, design D22): one tap in, six stops, real voice on every spoken step with a labelled fallback, nothing
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

const STOPS = ['hear', 'memorise', 'pasillo', 'tutor', 'rewards', 'teacher'];

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

// A recogniser that hears the visitor say the answer, so the demo is driven by voice and not by a button.
const SAY = (words: string) => `
  class Fake {
    continuous = true; interimResults = true; lang = 'es-ES'; maxAlternatives = 1;
    onstart = null; onend = null; onresult = null; onerror = null; onspeechstart = null; onsoundstart = null;
    start() { setTimeout(() => { this.onstart && this.onstart(); this.onspeechstart && this.onspeechstart();
      const r = [{ 0: { transcript: ${JSON.stringify(words)}, confidence: 0.9 }, isFinal: true, length: 1 }];
      this.onresult && this.onresult({ resultIndex: 0, results: r }); }, 50); }
    stop() { this.onend && this.onend(); } abort() {}
  }
  Object.assign(window, { SpeechRecognition: Fake, webkitSpeechRecognition: Fake });
`;

test('24.1 the hear stop listens to the visitor and scores by rules', async ({ page }) => {
  await page.addInitScript(SAY('Me llamo Ana y tengo trece años'));
  await page.goto('/demo/hear');
  await page.getByTestId('hear-play').click();
  await expect(page.getByTestId('pretend')).toHaveCount(0);
  await page.getByTestId('hear-answer').click();
  await expect(page.getByTestId('hear-heard')).toContainText('Ana');
  await page.getByTestId('hear-done').click();
  await expect(page.getByTestId('hear-result')).toBeVisible();
  await expect(page.getByTestId('accuracy')).toBeVisible();
  expect(writes).toEqual([]);
});

test('24.1 the hear stop with no speech recognition offers a labelled example, not a pretend', async ({ page }) => {
  await page.addInitScript(() => { Object.assign(window, { SpeechRecognition: undefined, webkitSpeechRecognition: undefined }); });
  await page.goto('/demo/hear');
  await page.getByTestId('hear-play').click();
  await expect(page.getByTestId('hear-nomic')).toContainText('example answer, not you');
  await page.getByTestId('pretend').click();
  await expect(page.getByTestId('hear-result')).toContainText('Example answer');
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

test('24.2 El Pasillo opens on the sample answers with the real microphone prompt and saves nothing', async ({ page }) => {
  await page.goto('/demo/pasillo');
  await expect(page.getByTestId('dc-title')).toBeVisible();
  await page.getByTestId('dc-start').click();
  await expect(page.getByTestId('dreamcore')).toHaveAttribute('data-phase', /travel|ready/);
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

});

test('24.1 demo screens fit a 360 by 640 phone with the Demo label showing', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  for (const id of ['hear', 'pasillo']) {
    await page.goto(`/demo/${id}`);
    await expect(page.getByTestId('demo-bar')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
});
