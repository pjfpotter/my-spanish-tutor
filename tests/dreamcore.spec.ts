import { expect, test } from '@playwright/test';

// A stand-in recogniser the test feeds words to, so the game can be played without a microphone.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    class R { onstart: any; onresult: any; constructor() { w.__rec = this; } start() { setTimeout(() => this.onstart?.(), 10); } stop() {} abort() {} }
    w.SpeechRecognition = R;
    w.__say = (text: string) => w.__rec.onresult({ results: [Object.assign([{ transcript: text }], { isFinal: false })] });
  });
});

const ALL = 'Me encantan las películas de miedo porque son muy divertidas, aunque me dan miedo. Lo siento, no puedo porque tengo que hacer los deberes. Normalmente llevo unos vaqueros negros y una camiseta blanca porque quiero estar cómodo. Voy a llevar una camiseta blanca para la fiesta porque quiero estar guay.';

test('the corridor game opens doors by speech and the look-behind toggle works', async ({ page }) => {
  await page.goto('/lab/dreamcore');
  await expect(page.getByTestId('dc-title')).toBeVisible();
  await page.getByTestId('dc-start').click();
  const game = page.getByTestId('dreamcore');
  await expect(game).toHaveAttribute('data-phase', 'ready', { timeout: 20_000 });
  await expect(page.getByTestId('dc-plaque')).toContainText('Read it out');
  // Turning round hides the door text, and turning back shows it again.
  await page.getByTestId('dc-look').click();
  await expect(page.getByTestId('dc-plaque')).toBeHidden();
  await page.getByTestId('dc-look').click();
  await expect(page.getByTestId('dc-plaque')).toBeVisible();
  // Saying the words opens the door and the walk to the next one starts.
  await page.evaluate((t) => (window as any).__say(t), ALL);
  await expect(game).not.toHaveAttribute('data-phase', 'ready');
  await expect(game).toHaveAttribute('data-phase', 'ready', { timeout: 20_000 });
});

test('with no speech recogniser the chase waits and the student can carry on', async ({ page }) => {
  await page.addInitScript(() => { const w = window as any; delete w.SpeechRecognition; delete w.webkitSpeechRecognition; });
  await page.goto('/lab/dreamcore');
  await page.getByTestId('dc-start').click();
  await expect(page.getByTestId('dreamcore')).toHaveAttribute('data-phase', 'ready', { timeout: 20_000 });
  const before = await page.getByTestId('dc-gap').getAttribute('aria-valuenow');
  await page.waitForTimeout(1500);
  expect(await page.getByTestId('dc-gap').getAttribute('aria-valuenow')).toBe(before);
  await page.getByTestId('dc-nomic').click();
  await expect(page.getByTestId('dreamcore')).not.toHaveAttribute('data-phase', 'ready');
});
