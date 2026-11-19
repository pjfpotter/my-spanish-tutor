import { expect, test, type Page } from '@playwright/test';

// The ghost whisper in El Pasillo (ghost whisper change, tasks 4.2 and 4.3). A stand-in recogniser keeps what it "heard", so each
// door counts only the words said after it opened. Sound is on, because the Whisper button is only offered with sound.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    localStorage.setItem('calm', 'on');
    class R { onstart: any; onresult: any; constructor() { w.__rec = this; } start() { setTimeout(() => this.onstart?.(), 10); } stop() {} abort() {} }
    w.SpeechRecognition = R;
    w.__heard = '';
    w.__say = (text: string) => { w.__heard = `${w.__heard} ${text}`.trim(); w.__rec.onresult({ results: [Object.assign([{ transcript: w.__heard }], { isFinal: false })] }); };
  });
});

const ALL = 'Me encantan las películas de miedo porque son muy divertidas, aunque me dan miedo. Lo siento, no puedo porque tengo que hacer los deberes. Normalmente llevo unos vaqueros negros y una camiseta blanca porque quiero estar cómodo. Voy a llevar una camiseta blanca para la fiesta porque quiero estar guay. Los fines de semana juego a los videojuegos y escucho música.';

function watch(page: Page) {
  const ghost: string[] = [];
  const posts: string[] = [];
  page.on('request', (r) => {
    if (/\/audio\/ghost\/[0-9a-f]+\.mp3/.test(r.url())) ghost.push(r.url());
    if (r.method() === 'POST') posts.push(r.url());
  });
  return { ghost, posts };
}
const start = async (page: Page) => {
  await page.goto('/lab/dreamcore');
  await page.getByTestId('dc-start').click();
  await expect(page.getByTestId('dreamcore')).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 });
};
const gap = async (page: Page) => Number(await page.getByTestId('dc-gap').getAttribute('aria-valuenow'));

test('Whisper is offered for a word not yet said, costs a whisper and some ground, never fetches early, and the door still opens', async ({ page }) => {
  const seen = watch(page);
  await start(page);
  const whisper = page.getByTestId('dc-whisper');
  await expect(whisper).toBeVisible();
  await expect(whisper).toContainText('Whisper · 3 left');
  await expect(page.getByTestId('dc-whisper-note')).toContainText('monster');
  expect(seen.ghost).toEqual([]); // the file is fetched only when tapped

  // A missed word does not charge anything, and the word is still on offer.
  await page.evaluate(() => (window as any).__say('blah blah zzz'));
  await expect(whisper).toContainText('3 left');

  const before = await gap(page);
  await whisper.click();
  await expect(whisper).toContainText('2 left');
  await expect.poll(() => seen.ghost.length).toBe(1);
  await expect.poll(async () => before - (await gap(page))).toBeGreaterThanOrEqual(5); // it let the monster closer
  await expect(whisper).toBeEnabled({ timeout: 10_000 }); // the whisper has finished

  // Saying the words after the whisper still opens the door.
  await page.evaluate((t) => (window as any).__say(t), ALL);
  await expect(page.getByTestId('dreamcore')).not.toHaveAttribute('data-phase', 'ready');
  expect(seen.posts).toEqual([]); // nothing was sent anywhere
});

test('the supply runs out: three whispers, then "No whispers left"', async ({ page }) => {
  await start(page);
  const whisper = page.getByTestId('dc-whisper');
  for (const left of [2, 1, 0]) {
    await expect(whisper).toBeEnabled({ timeout: 10_000 });
    await whisper.click();
    await expect(whisper).toContainText(left === 0 ? 'No whispers left' : `${left} left`);
  }
  await expect(whisper).toBeDisabled();
  await expect(page.getByTestId('dc-whisper-note')).toHaveCount(0);
});

test('the plain whisper still plays when Web Audio is missing', async ({ page }) => {
  await page.addInitScript(() => { const w = window as any; delete w.AudioContext; delete w.webkitAudioContext; });
  const seen = watch(page);
  await start(page);
  await page.getByTestId('dc-whisper').click();
  await expect(page.getByTestId('dc-whisper')).toContainText('2 left');
  await expect.poll(() => seen.ghost.length).toBeGreaterThanOrEqual(1); // the plain file was asked for
});

test('no Whisper button with sound off', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sound', 'off'));
  await start(page);
  await expect(page.getByTestId('dc-whisper')).toHaveCount(0);
});

test('a whispered no-help door opens but does not count towards the way out, and the plaque never shows the word', async ({ page }) => {
  test.setTimeout(300_000);
  await start(page);
  const game = page.getByTestId('dreamcore');
  const whisper = page.getByTestId('dc-whisper');
  // Tele speaks the question from stage 3, and the recogniser's words are ignored meanwhile, so keep saying it until the door opens.
  const clear = async () => {
    for (let i = 0; i < 10; i++) {
      await page.evaluate((t) => (window as any).__say(t), ALL);
      try { await expect(game).not.toHaveAttribute('data-phase', 'ready', { timeout: 2500 }); return; } catch { /* Tele was still speaking */ }
    }
    throw new Error('the door did not open');
  };
  const ready = () => expect(game).toHaveAttribute('data-phase', 'ready', { timeout: 40_000 });

  for (let door = 0; door < 8; door++) { await ready(); await clear(); }

  // First no-help door: whisper, check the plaque, clear it.
  await ready();
  await expect(page.getByTestId('dc-plaque')).toContainText('No help');
  await expect(whisper).toBeEnabled({ timeout: 15_000 });
  await whisper.click();
  await expect(whisper).toContainText('2 left');
  await expect(whisper).toBeEnabled({ timeout: 15_000 });
  const words = (await page.locator('.dc-words').innerText()).replace(/[•\s]/g, '');
  expect(words).toBe(''); // every word is still hidden: the whisper is heard, not shown
  await clear();

  // Two clean doors: with the whispered one not counted, that is two, so the run goes on.
  for (let door = 0; door < 2; door++) { await ready(); await clear(); }
  await ready();
  await expect(page.getByTestId('dc-result')).toHaveCount(0);
  await clear(); // the third clean door
  await expect(page.getByTestId('dc-result')).toBeVisible({ timeout: 30_000 });
});
