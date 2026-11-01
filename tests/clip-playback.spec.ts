import { expect, test, type Page } from '@playwright/test';

// Task 18.8: a tutor clip plays through Tele with its caption and a baked feeling.
// A stub clip stands in for the real ElevenLabs voice, so these tests do not depend on it and cost
// nothing. How the real voice sounds is the optional manual check.

const WORDS = ['¡Hola!', 'Soy', 'Tele.'];
const CLIP = {
  id: 'hola', text: '¡Hola! Soy Tele.', en: "Hi! I'm Tele.", end: 1.5,
  words: [{ text: '¡Hola!', t0: 0.1 }, { text: 'Soy', t0: 0.6 }, { text: 'Tele.', t0: 0.9 }],
  envelope: Array.from({ length: 50 }, (_, i) => (i % 6 < 3 ? 0.9 : 0.2)), envelopeHop: 0.03,
  feelings: [{ t0: 0, feelings: { joy: 0.7 } }, { t0: 0.75, feelings: { surprise: 0.8 } }],
  source: { provider: 'test', voiceId: 'stub', model: 'stub', speed: 1, hash: 'stub' },
};

/** A 1.6 second 440 Hz tone as a WAV file. */
function wav(seconds = 1.6, rate = 8000) {
  const n = Math.round(seconds * rate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 8000), 44 + i * 2);
  return buf;
}

async function stubClip(page: Page, opts: { audio?: 'ok' | 'fail'; json?: 'ok' | 'missing' } = {}) {
  const { audio = 'ok', json = 'ok' } = opts;
  await page.route('**/audio/tele/hola.json', (r) =>
    json === 'ok' ? r.fulfill({ json: CLIP }) : r.fulfill({ status: 404, body: 'no' }),
  );
  await page.route('**/audio/tele/hola.mp3', (r) =>
    audio === 'ok' ? r.fulfill({ contentType: 'audio/wav', body: wav() }) : r.abort(),
  );
}

async function recordHighlights(page: Page) {
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { __seen: string[] }).__seen = seen;
    new MutationObserver(() => {
      const text = document.querySelector('.cw[data-active="true"]')?.textContent;
      if (text && seen.at(-1) !== text) seen.push(text);
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-active'] });
  });
}
const highlighted = (page: Page) => page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

test('plays the clip: audio drives the caption, the baked feelings and the English subtitle', async ({ page }) => {
  await stubClip(page);
  await page.goto('/lab/tele');
  await recordHighlights(page);

  await page.getByRole('button', { name: 'Play ElevenLabs line' }).click();
  await expect(page.getByTestId('clip-source')).toContainText('Source: audio');
  await expect(page.getByTestId('feeling-readout')).toContainText('Joy');
  await expect(page.getByTestId('caption-en')).toHaveText("Hi! I'm Tele.");
  await expect(page.getByTestId('feeling-readout')).toContainText('Surprise'); // the feeling changes mid-line
  await expect(page.getByTestId('caption-es')).toContainText('señal débil', { timeout: 10_000 }); // line finished

  expect(await highlighted(page)).toEqual(WORDS);
  await expect(page.getByTestId('clip-source')).toContainText('Source: idle');
});

test('the audio is really requested and played, and stops when the line ends', async ({ page }) => {
  let audioRequests = 0;
  await stubClip(page);
  await page.route('**/audio/tele/hola.mp3', (r) => {
    audioRequests++;
    return r.fulfill({ contentType: 'audio/wav', body: wav() });
  });
  await page.goto('/lab/tele');
  await page.getByRole('button', { name: 'Play ElevenLabs line' }).click();
  await expect(page.getByTestId('clip-source')).toContainText('Source: audio');
  await expect(page.getByTestId('clip-source')).toContainText('Source: idle', { timeout: 10_000 });
  expect(audioRequests).toBeGreaterThan(0);
});

test('if the audio cannot load, the line still shows on a timer with its subtitle', async ({ page }) => {
  await stubClip(page, { audio: 'fail' });
  await page.goto('/lab/tele');
  await recordHighlights(page);

  await page.getByRole('button', { name: 'Play ElevenLabs line' }).click();
  await expect(page.getByTestId('clip-source')).toContainText('timer (no audio)');
  await expect(page.getByTestId('caption-en')).toHaveText("Hi! I'm Tele.");
  await expect(page.getByTestId('caption-es')).toContainText('señal débil', { timeout: 10_000 });

  expect(await highlighted(page)).toEqual(WORDS);
});

test('if the audio never starts (a stalled request), the line falls back to the timer instead of freezing', async ({ page }) => {
  await stubClip(page);
  // The audio request hangs and is never answered.
  await page.route('**/audio/tele/hola.mp3', () => new Promise(() => {}));
  await page.goto('/lab/tele');
  await recordHighlights(page);

  await page.getByRole('button', { name: 'Play ElevenLabs line' }).click();
  await expect(page.getByTestId('caption-es')).not.toContainText('señal débil');
  await expect(page.getByTestId('clip-source')).toContainText('timer (no audio)', { timeout: 4000 });
  await expect(page.getByTestId('caption-es')).toContainText('señal débil', { timeout: 10_000 });
  expect(await highlighted(page)).toEqual(WORDS);
});

test('if the clip file is missing, the line still shows silently and says why', async ({ page }) => {
  await stubClip(page, { json: 'missing' });
  await page.goto('/lab/tele');

  await page.getByRole('button', { name: 'Play ElevenLabs line' }).click();
  await expect(page.getByTestId('clip-source')).toContainText('not found (404)');
  await expect(page.getByTestId('caption-es')).not.toContainText('señal débil');
  await expect(page.getByTestId('caption-en')).toBeVisible();
  await expect(page.getByTestId('caption-es')).toContainText('señal débil', { timeout: 10_000 });
});

test('poking Tele on the desktop plays the clip with its audio when the line has one', async ({ page }) => {
  let audioRequests = 0;
  await stubClip(page);
  await page.route('**/audio/tele/hola.mp3', (r) => {
    audioRequests++;
    return r.fulfill({ contentType: 'audio/wav', body: wav() });
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle'); // the timeline is preloaded so audio can start in the tap

  // Make the pick deterministic: random() of 0 takes the first line, which has the clip. Pinned only
  // now, because pinning it for the whole page load stops the page hydrating properly.
  await page.evaluate(() => {
    Math.random = () => 0;
  });
  await page.getByRole('button', { name: 'Poke Tele to hear a line' }).click();
  await expect(page.getByTestId('caption-es')).toContainText('Soy Tele');
  await expect(page.getByTestId('caption-en')).toHaveText("Hi! I'm Tele.");
  await expect(page.getByTestId('caption-es')).toContainText('señal débil', { timeout: 10_000 });
  expect(audioRequests).toBeGreaterThan(0);
});
