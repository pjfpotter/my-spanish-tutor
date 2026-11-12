import { expect, test, type Page } from '@playwright/test';

/**
 * The memorise lab's live listening, with a stand-in recogniser that the test speaks through.
 * The rule under test: while the microphone is open the screen shows what it hears, it moves on by itself
 * when the answer has been said, and a pause brings a hint, never a timeout.
 */
async function open(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, any>;
    try { localStorage.setItem('sound', 'off'); } catch { /* no storage */ }
    class FakeRecogniser {
      onstart: (() => void) | null = null;
      onresult: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      constructor() { w.__rec = this; }
      start() { setTimeout(() => this.onstart?.(), 0); }
      stop() { this.onend?.(); }
      abort() {}
    }
    w.SpeechRecognition = w.webkitSpeechRecognition = FakeRecogniser;
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
