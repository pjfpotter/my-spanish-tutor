import { expect, test, type Page } from '@playwright/test';

/**
 * The memorise lab's live listening, with a stand-in recogniser that the test speaks through.
 * The rule under test: while the microphone is open the screen shows what it hears, it moves on by itself
 * when the answer has been said, and a pause brings a hint, never a timeout.
 */
async function open(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, any>;
    // The level meter is on by default on desktop, and the fake microphone beeps every second or so, which would
    // keep restarting the quiet period these tests wait for. These tests are about the recogniser, so no meter.
    try { localStorage.setItem('sound', 'off'); localStorage.setItem('memorise-lab-v1', JSON.stringify({ meter: false })); } catch { /* no storage */ }
    class FakeRecogniser {
      onstart: (() => void) | null = null;
      onresult: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      constructor() { w.__rec = this; w.__recCount = (w.__recCount ?? 0) + 1; }
      start() { setTimeout(() => this.onstart?.(), 0); }
      stop() { this.onend?.(); }
      abort() {}
    }
    w.SpeechRecognition = w.webkitSpeechRecognition = FakeRecogniser;
    // A stand-in screen wake lock that counts how often it was taken and let go.
    w.__locks = 0; w.__unlocks = 0;
    try {
      Object.defineProperty(navigator, 'wakeLock', {
        configurable: true,
        value: { request: async () => { w.__locks++; return { released: false, addEventListener() {}, release: async () => { w.__unlocks++; } }; } },
      });
    } catch { /* keep the real one */ }
    /** What the recogniser has understood so far, as one interim result. */
    w.__hear = (text: string) => w.__rec?.onresult?.({ results: [Object.assign([{ transcript: text }], { isFinal: false })] });
  });
  await page.goto('/lab/memorise');
  await expect(page.getByTestId('lab-home')).toBeVisible();
}
const hear = (page: Page, text: string) => page.evaluate((t) => (window as unknown as { __hear: (t: string) => void }).__hear(t), text);
const lit = (page: Page) => page.locator('[data-testid="lab-word"][data-s="lit"]');

test('words light up as they are heard and the screen moves on by itself', async ({ page }) => {
  await open(page);
  await page.getByTestId('lab-start').click();
  await expect(page.getByTestId('lab-title')).toHaveText('Listen, then say it out loud');
  await expect(page.getByTestId('lab-listen')).toBeVisible();
  await expect(lit(page)).toHaveCount(0);

  await hear(page, 'lo siento');
  await expect(lit(page)).toHaveCount(2);
  await expect(page.getByTestId('lab-heard')).toHaveText('lo siento');

  await hear(page, 'lo siento no puedo');
  await expect(lit(page)).toHaveCount(4);
  // No Done button: the result shows, then the next bit arrives.
  await expect(page.getByTestId('lab-fb')).toBeVisible();
  await expect(page.locator('.ml-tile').first()).toContainText('porque tengo que');
  await expect(page.getByTestId('lab-listen')).toBeVisible();
});

test('a pause brings a hint and a way to move on, never a timeout', async ({ page }) => {
  await open(page);
  await page.locator('.ml-tools summary').click();
  await page.getByRole('button', { name: 'First letters', exact: true }).click();
  await expect(page.getByTestId('lab-title')).toHaveText('Say it from the first letters');
  await expect(page.getByTestId('lab-listen')).toBeVisible();
  await expect(page.getByTestId('lab-offer')).toHaveCount(0);

  await expect(page.getByTestId('lab-offer')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('lab-lesson')).toHaveAttribute('data-phase', 'listening'); // still listening, nothing marked

  // A hint shows the next word. It is shown, not lit: the student still has to say it.
  await page.getByTestId('lab-hint').click();
  await expect(page.locator('[data-testid="lab-word"][data-s="plain"]')).toHaveCount(1);
  await expect(page.getByTestId('lab-offer')).toHaveCount(0);

  await hear(page, 'lo siento no puedo');
  await expect(page.getByTestId('lab-fb')).toContainText('That works');
});

test('keeping going after a fudged bit still counts what came after', async ({ page }) => {
  await open(page);
  await page.locator('.ml-tools summary').click();
  await page.getByRole('button', { name: 'From memory', exact: true }).click();
  await expect(page.getByTestId('lab-listen')).toBeVisible();

  // The middle bit is mangled, the end is said.
  await hear(page, 'lo siento no puedo por que tango hacer los deberes');
  await expect(lit(page)).toHaveCount(8); // every word of the first and last bits, and the one word of the middle bit that was understood
  await expect(page.getByTestId('lab-fb')).toContainText('You kept going', { timeout: 5000 });
  await expect(page.getByTestId('lab-fb')).toContainText('porque tengo que');
  await page.getByTestId('lab-continue').click();
  await expect(page.locator('.ml-tag')).toHaveText('Fixing one bit');
});

test('a lesson screen fits a small phone without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await open(page);
  await page.locator('.ml-row').nth(4).click();
  await page.locator('.ml-tools summary').click();
  await page.getByRole('button', { name: 'From memory', exact: true }).click();
  await expect(page.getByTestId('lab-listen')).toBeVisible();
  const over = await page.evaluate(() => {
    const mid = document.querySelector('.ml-mid')!;
    return { page: document.documentElement.scrollHeight - innerHeight, card: mid.scrollHeight - mid.clientHeight, wide: document.documentElement.scrollWidth - innerWidth };
  });
  expect(over).toEqual({ page: 0, card: 0, wide: 0 });
});

const answer = 'lo siento no puedo porque tengo que hacer los deberes';
/** Says the whole answer from memory and carries on past the result, until the next screen is up. */
async function sayAndContinue(page: Page) {
  await hear(page, answer);
  await expect(page.getByTestId('lab-fb')).toBeVisible({ timeout: 5000 });
  const next = page.getByTestId('lab-continue');
  if (await next.isVisible()) await next.click();
  await expect(page.getByTestId('lab-fb')).toHaveCount(0, { timeout: 8000 });
}
async function toFirstTapScreen(page: Page) {
  await open(page);
  await page.locator('.ml-tools summary').click();
  await page.getByRole('button', { name: 'From memory', exact: true }).click();
  await expect(page.getByTestId('lab-listen')).toBeVisible();
  await sayAndContinue(page); // the first-letters screen
  await expect(page.getByTestId('lab-listen')).toBeVisible();
  await sayAndContinue(page); // the letters-gone screen; a tapping screen follows
}

test('27.10 speaking and tapping screens are told apart without reading, and nothing interrupts', async ({ page }) => {
  await open(page);
  await page.locator('.ml-tools summary').click();
  await page.getByRole('button', { name: 'From memory', exact: true }).click();
  await expect(page.getByTestId('lab-listen')).toBeVisible();
  await expect(page.getByTestId('lab-kind')).toHaveAttribute('data-kind', 'speak');
  await expect(page.getByTestId('lab-kind')).toHaveAttribute('aria-label', 'Speaking screen');

  await sayAndContinue(page);
  await expect(page.getByTestId('lab-kind')).toHaveAttribute('data-kind', 'speak');
  await sayAndContinue(page);

  // A tapping screen: a different badge and no microphone indicator.
  await expect(page.getByTestId('lab-kind')).toHaveAttribute('data-kind', 'tap');
  await expect(page.getByTestId('lab-kind')).toHaveAttribute('aria-label', 'Tapping screen');
  await expect(page.getByTestId('lab-listen')).toHaveCount(0);
  // Nothing is drawn over the screen, so a tap goes straight through.
  await expect(page.getByTestId('lab-switch')).toHaveCount(0);
  await page.getByTestId('lab-opt').first().click({ timeout: 2000 });
});

test('27.10 a tapping screen shows a mouse pointer with a mouse and a pointing hand when touched', async ({ page }) => {
  await toFirstTapScreen(page);
  const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  const badge = page.getByTestId('lab-kind');
  await expect(badge).toHaveAttribute('data-kind', 'tap');
  await expect(badge.locator(touch ? '.ml-hand' : '.ml-ptr')).toBeVisible();
  await expect(badge.locator(touch ? '.ml-ptr' : '.ml-hand')).toBeHidden();
});

test('27.11 the screen is kept awake while a lesson listens and let go afterwards', async ({ page }) => {
  await open(page);
  const locks = () => page.evaluate(() => (window as unknown as { __locks: number }).__locks);
  const unlocks = () => page.evaluate(() => (window as unknown as { __unlocks: number }).__unlocks);
  expect(await locks()).toBe(0);
  await page.locator('.ml-tools summary').click();
  await page.getByRole('button', { name: 'From memory', exact: true }).click();
  await expect(page.getByTestId('lab-listen')).toBeVisible();
  await expect.poll(locks).toBeGreaterThanOrEqual(1);
  await page.getByRole('button', { name: 'Leave this lesson' }).click();
  await expect.poll(unlocks).toBeGreaterThanOrEqual(1);
});

test('27.11 listening comes back after the screen locks, with nothing marked and no switch to self-marking', async ({ page }) => {
  await open(page);
  await page.locator('.ml-tools summary').click();
  await page.getByRole('button', { name: 'From memory', exact: true }).click();
  await expect(page.getByTestId('lab-listen')).toBeVisible();
  await hear(page, 'lo siento');
  await expect(lit(page)).toHaveCount(2);
  const sessions = () => page.evaluate(() => (window as unknown as { __recCount: number }).__recCount);
  const before = await sessions();

  // The phone locks: the page is hidden and the browser takes the microphone, reporting an error and ending the session.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    const r = (window as unknown as { __rec: { onerror?: (e: unknown) => void; onend?: () => void } }).__rec;
    r.onerror?.({ error: 'audio-capture' });
    r.onend?.();
  });
  await page.waitForTimeout(300);
  expect(await sessions()).toBe(before); // nothing restarts while hidden

  // Unlocked: the same screen is listening again.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(sessions).toBeGreaterThan(before);
  await expect(page.getByTestId('lab-lesson')).toHaveAttribute('data-phase', 'listening');
  await expect(page.getByTestId('lab-listen')).toBeVisible();
  await expect(page.getByText('check your answer yourself')).toHaveCount(0);
  await expect(lit(page)).toHaveCount(2); // what was already heard is still lit, and nothing was marked
  await hear(page, answer);
  await expect(page.getByTestId('lab-fb')).toBeVisible({ timeout: 5000 });
});

test('27.9 and 27.12 the tester can copy a device report with timings', async ({ page }) => {
  await open(page);
  await page.locator('.ml-tools summary').click();
  await page.getByRole('button', { name: 'From memory', exact: true }).click();
  await expect(page.getByTestId('lab-listen')).toBeVisible();
  await hear(page, 'lo siento');
  await expect(lit(page)).toHaveCount(2);
  await hear(page, 'lo siento no');
  await page.waitForTimeout(100);
  await page.getByRole('button', { name: 'Leave this lesson' }).click();
  await expect(page.getByTestId('lab-home')).toBeVisible();
  if (!(await page.getByTestId('lab-report').isVisible())) await page.locator('.ml-tools summary').click();
  await page.getByTestId('lab-report').click();
  const text = page.getByTestId('lab-report-text');
  await expect(text).toContainText('Built-in recogniser present: yes');
  await expect(text).toContainText('Results while speaking: ');
  await expect(text).toContainText('Result to screen: median');
  await expect(text).toContainText('Screen stays awake: supported');
});
