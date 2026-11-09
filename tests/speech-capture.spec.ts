import { expect, test, type Page } from '@playwright/test';

// Task 5.1: speech capture with permission handling, on the recognition path chosen per device.
// Every device is unverified, so the path is the server fallback. The transcription call is stubbed:
// these tests check the page's own behaviour and cost nothing.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

const stubTranscribe = (page: Page, body: unknown, status = 200) =>
  page.route('**/api/transcribe', (r) => r.fulfill({ status, json: body }));

async function speak(page: Page) {
  await page.getByRole('button', { name: 'Start speaking' }).click();
  await expect(page.getByTestId('listening')).toBeVisible();
  await page.waitForTimeout(400); // let the fake microphone record something
  await page.getByRole('button', { name: 'Done' }).click();
}

test('explains why the microphone is needed before asking, then records and shows the transcript', async ({ page }) => {
  let sent: { type: string | undefined; clipMs: string | undefined; bytes: number } | null = null;
  await page.route('**/api/transcribe', (r) => {
    const req = r.request();
    sent = { type: req.headers()['content-type'], clipMs: req.headers()['x-clip-ms'], bytes: req.postDataBuffer()?.length ?? 0 };
    return r.fulfill({ json: { status: 'ok', text: 'Me llamo Ana', confidence: 0.9 } });
  });
  await page.goto('/lab/speech');
  await expect(page.getByTestId('explain')).toContainText('not saved');
  await expect(page.getByTestId('path')).toContainText('server'); // unverified devices use the fallback

  await speak(page);
  await expect(page.getByTestId('transcript')).toHaveText('Me llamo Ana');
  expect(sent!.type).toMatch(/^audio\//);
  expect(Number(sent!.clipMs)).toBeGreaterThan(0);
  expect(sent!.bytes).toBeGreaterThan(0);
  // Back to idle, ready for another go.
  await expect(page.getByRole('button', { name: 'Start speaking' })).toBeVisible();
});

test('permission denied: says so plainly and offers a retry (task 5.1)', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
  });
  await page.goto('/lab/speech');
  await page.getByRole('button', { name: 'Start speaking' }).click();
  await expect(page.getByTestId('denied')).toContainText('microphone is blocked');
  await expect(page.getByRole('button', { name: 'Start speaking' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByTestId('explain')).toBeVisible(); // back at the explanation, ready to ask again
  await expect(page.getByRole('button', { name: 'Start speaking' })).toBeVisible();
});

test('a browser with no microphone support says so and offers no speaking button', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true }));
  await page.goto('/lab/speech');
  await expect(page.getByTestId('unsupported')).toContainText('cannot use a microphone');
  await expect(page.getByRole('button', { name: 'Start speaking' })).toHaveCount(0);
  await expect(page.getByTestId('path')).toContainText('unsupported');
});

test('a recogniser that cannot be reached is not the student\'s fault and can be retried', async ({ page }) => {
  await stubTranscribe(page, { status: 'unavailable', reason: 'cap_reached' }, 503);
  await page.goto('/lab/speech');
  await speak(page);
  await expect(page.getByTestId('unavailable')).toContainText('not your fault');
  await expect(page.getByTestId('transcript')).toHaveCount(0); // nothing was scored
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: 'Start speaking' })).toBeVisible();
});

test('nothing clear heard: no transcript, an invitation to try again', async ({ page }) => {
  await stubTranscribe(page, { status: 'ok', text: '   ', confidence: null });
  await page.goto('/lab/speech');
  await speak(page);
  await expect(page.getByTestId('unclear')).toContainText('could not hear');
  await expect(page.getByTestId('transcript')).toHaveCount(0);
});

// Task 19.1: when listening fails the student is told in plain English and is never trapped.

test('a 503 from the transcription route gives a plain message with a retry (19.1)', async ({ page }) => {
  await stubTranscribe(page, { status: 'unavailable', reason: 'not_configured' }, 503);
  await page.goto('/lab/speech');
  await speak(page);
  await expect(page.getByTestId('unavailable')).toContainText('Tele could not listen just now');
  await expect(page.getByTestId('unavailable')).not.toContainText('503');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByTestId('transcript')).toHaveCount(0);
});

test('when the server recogniser is down, the next try uses the browser recogniser (19.1)', async ({ page }) => {
  await page.addInitScript(() => {
    class FakeRecognition {
      lang = ''; continuous = false; interimResults = false; maxAlternatives = 1;
      onresult: ((e: unknown) => void) | null = null; onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null; onspeechstart: (() => void) | null = null;
      start() {
        setTimeout(() => {
          const alt = Object.assign([{ transcript: 'me llamo ana', confidence: 0.9 }], { isFinal: true });
          this.onresult?.({ results: [alt] });
          this.onend?.();
        }, 100);
      }
      stop() {}
      abort() {}
    }
    for (const name of ['SpeechRecognition', 'webkitSpeechRecognition']) {
      Object.defineProperty(window, name, { value: FakeRecognition, configurable: true, writable: true });
    }
  });
  await stubTranscribe(page, { status: 'unavailable', reason: 'not_configured' }, 503);
  await page.goto('/lab/speech');
  await expect(page.getByTestId('path')).toContainText('server');
  await speak(page);
  await expect(page.getByTestId('unavailable')).toBeVisible();
  await expect(page.getByTestId('path')).toContainText('browser');
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByRole('button', { name: 'Start speaking' }).click();
  await expect(page.getByTestId('transcript')).toHaveText('me llamo ana');
});
