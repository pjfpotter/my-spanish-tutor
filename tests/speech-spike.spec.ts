import { test, expect, type Page } from '@playwright/test';

// Task 2.1 spike page. The recogniser is mocked, so these tests check the page's own logic.
// They say nothing about how well a real device recognises Spanish; that is the optional
// manual device check.

async function mockRecogniser(page: Page, script: 'ok' | 'error' | 'absent') {
  await page.addInitScript((mode) => {
    const w = window as any;
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
    if (mode === 'absent') return;
    w.webkitSpeechRecognition = class {
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        setTimeout(() => {
          if (mode === 'error') {
            this.onerror?.({ error: 'not-allowed' });
            this.onend?.();
            return;
          }
          const alt = (transcript: string, confidence: number) => ({ transcript, confidence });
          const interim = Object.assign([alt('me llamo', 0)], { isFinal: false });
          this.onresult?.({ resultIndex: 0, results: [interim] });
          setTimeout(() => {
            const final = Object.assign([alt('Me llamo Ana', 0.91), alt('me llamo Anna', 0.4)], { isFinal: true });
            this.onresult?.({ resultIndex: 0, results: [final] });
            this.onend?.();
          }, 40);
        }, 30);
      }
      stop() {
        this.onend?.();
      }
    };
  }, script);
}

test('shows the transcript, alternatives and timings for a successful run', async ({ page }) => {
  await mockRecogniser(page, 'ok');
  await page.goto('/spike/speech');
  await expect(page.getByText(/Browser recognition:\s*available/)).toBeVisible();

  await page.getByRole('button', { name: 'Start speaking' }).click();
  const results = page.getByRole('list').last();
  await expect(results.getByText('Me llamo Ana')).toBeVisible();
  await expect(results.getByText('me llamo Anna')).toBeVisible();
  await expect(results.getByText('(0.91)')).toBeVisible();
  await expect(results.getByText(/first result \d+ ms/)).toBeVisible();
  // The button returns to its idle label once the recogniser ends.
  await expect(page.getByRole('button', { name: 'Start speaking' })).toBeVisible();
});

test('records the recogniser error and keeps going', async ({ page }) => {
  await mockRecogniser(page, 'error');
  await page.goto('/spike/speech');
  await page.getByRole('button', { name: 'Start speaking' }).click();
  await expect(page.getByText('error: not-allowed').first()).toBeVisible();
  await expect(page.getByRole('list').last().getByText('no result')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start speaking' })).toBeEnabled();
});

test('says so and disables the button when the browser has no recogniser', async ({ page }) => {
  await mockRecogniser(page, 'absent');
  await page.goto('/spike/speech');
  await expect(page.getByText('NOT available on this device')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start speaking' })).toBeDisabled();
});

test('puts the user agent and microphone in the copyable device-matrix block', async ({ page }) => {
  await mockRecogniser(page, 'ok');
  await page.goto('/spike/speech');
  await page.getByRole('button', { name: 'Read microphone' }).click();
  const block = page.locator('pre');
  await expect(block).toContainText('Mozilla/5.0');
  // The fake microphone has a label, so the block must not still say "not read yet".
  await expect(block).not.toContainText('(not read yet)');
});

test('loads without console errors or horizontal scroll on the real browser', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/spike/speech');
  await expect(page.getByRole('heading', { name: /Speech spike/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  expect(errors).toEqual([]);
});

// Informational: what headless Chromium's real recogniser does with a fake microphone.
// It usually fails with a network or no-speech error; the point is to record it, not to assert success.
test('real recogniser in headless Chromium (informational)', async ({ page }, info) => {
  await page.goto('/spike/speech');
  const supported = await page.evaluate(() => Boolean((window as any).webkitSpeechRecognition));
  info.annotations.push({ type: 'webkitSpeechRecognition present', description: String(supported) });
  test.skip(!supported, 'no recogniser in this browser');
  await page.getByRole('button', { name: 'Start speaking' }).click();
  const outcome = page.getByRole('list').last().getByRole('listitem').first();
  const got = await outcome.waitFor({ timeout: 15_000 }).then(() => true, () => false);
  info.annotations.push({
    type: 'outcome',
    description: got ? (await outcome.innerText()).replace(/\s+/g, ' ') : 'no result or error within 15s (recogniser never ended)',
  });
});
