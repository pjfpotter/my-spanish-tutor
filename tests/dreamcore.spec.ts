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

const ALL = 'Me encantan las películas de miedo porque son muy divertidas, aunque me dan miedo. Lo siento, no puedo porque tengo que hacer los deberes. Normalmente llevo unos vaqueros negros y una camiseta blanca porque quiero estar cómodo. Voy a llevar una camiseta blanca para la fiesta porque quiero estar guay. Los fines de semana juego a los videojuegos y escucho música.';

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

test('sound that matches no word of the door does not slow the monster', async ({ page }) => {
  await page.goto('/lab/dreamcore');
  await page.getByTestId('dc-start').click();
  const game = page.getByTestId('dreamcore');
  await expect(game).toHaveAttribute('data-phase', 'ready', { timeout: 20_000 });
  const gap = async () => Number(await page.getByTestId('dc-gap').getAttribute('aria-valuenow'));
  const before = await gap();
  // Keep "talking" for six seconds with words that are not on the door: the old rule would have slowed the chase to a quarter.
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => (window as any).__say('blah blah zzz blah'));
    await page.waitForTimeout(1000);
  }
  expect(before - (await gap())).toBeGreaterThanOrEqual(4);
});

test('help fades in stages, the question can be heard again, and the way out is three clean no-help doors', async ({ page }) => {
  test.setTimeout(240_000);
  // A recogniser that keeps what it heard, so each door counts the words said after it opened. Sound is off: the question shows as text.
  await page.addInitScript(() => {
    const w = window as any;
    localStorage.setItem('sound', 'off');
    localStorage.setItem('calm', 'on');
    w.__heard = '';
    w.__say = (text: string) => { w.__heard = `${w.__heard} ${text}`.trim(); w.__rec.onresult({ results: [Object.assign([{ transcript: w.__heard }], { isFinal: false })] }); };
  });
  await page.goto('/lab/dreamcore');
  await page.getByTestId('dc-start').click();
  const game = page.getByTestId('dreamcore');
  const plaque = page.getByTestId('dc-plaque');
  const clear = async (help = false) => {
    await expect(game).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 });
    if (help) await page.getByTestId('dc-help').click();
    await page.evaluate((t) => (window as any).__say(t), ALL);
    await expect(game).not.toHaveAttribute('data-phase', 'ready');
  };
  const stages = ['Read it out', 'Read it out', 'Read the whole answer', 'Read the whole answer', 'Hear it, see the ends', 'Hear it, see the ends', 'Hear it, see the start', 'Hear it, see the start'];
  for (const [i, name] of stages.entries()) {
    await expect(game).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 });
    await expect(plaque).toContainText(name);
    if (i >= 4) {
      await expect(page.getByTestId('dc-hear')).toBeVisible();
      await expect(plaque.locator('.dc-main')).toContainText('?'); // sound is off, so the Spanish question is shown as text
      await expect(plaque.locator('.dc-sub')).toBeVisible(); // its English subtitle
    } else {
      await expect(page.getByTestId('dc-hear')).toHaveCount(0);
    }
    await clear();
  }
  // From here only no-help doors come, until three are cleared without Show me. One cleared with help does not count.
  const sequence = [true, false, false];
  for (const help of sequence) {
    await expect(game).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 });
    await expect(plaque).toContainText('No help');
    await expect(page.getByTestId('dc-hear')).toBeVisible();
    await clear(help);
  }
  // Two clean doors and one with help: the way out is not earned yet, so another no-help door follows.
  await expect(game).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 });
  await expect(plaque).toContainText('No help');
  await expect(page.getByTestId('dc-result')).toHaveCount(0);
  await clear();
  await expect(page.getByTestId('dc-result')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('dc-result')).toContainText('You wake up.');
  await expect(page.getByTestId('dc-stage-line')).toContainText('all five stages');
  await expect(page.getByTestId('dc-try')).toHaveCount(0); // got out: nothing to fix
});
