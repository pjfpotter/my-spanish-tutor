import { expect, type Page } from '@playwright/test';
import { LONG, LONG_TEXT, SHORT, SHORT_TEXT } from '../lib/sheets/samples/free-time-selections';

/** The text of the answer a student confirms on the sheet in these tests: one finished sentence from the sample sheet. */
export const sheetAnswer = (_position: number): string => SHORT_TEXT;
/** A longer confirmed answer: the same sentence with a closing line. */
export const longSheetAnswer = (): string => LONG_TEXT;

/** The class code of the seeded course the tests join. */
export const SEED_CLASS_CODE = 'TELE8';

/** Creates an anonymous profile through the real sign-up screen and returns its recovery code. Only the sign-up tests need this. */
export async function signUpThroughForm(page: Page): Promise<string> {
  await page.goto('/welcome');
  await page.getByRole('textbox').fill(SEED_CLASS_CODE);
  await page.getByRole('button', { name: 'Find my class' }).click();
  await page.getByRole('checkbox', { name: 'I have read this' }).check();
  await page.getByRole('button', { name: 'Carry on' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Create my profile' }).click();
  const code = (await page.getByTestId('recovery-code').textContent())!.trim();
  await page.getByRole('button', { name: /Let's go/ }).click();
  await expect(page).toHaveURL('/');
  return code;
}

/**
 * Creates an anonymous profile through the app's own sign-up route (the cookie lands in the browser, as it does
 * from the form) and opens the desktop. Much faster than the form, which `signUpThroughForm` covers.
 */
export async function signUp(page: Page, classCode: string = SEED_CLASS_CODE): Promise<string> {
  const { nicknameOptions } = await import('../lib/profile/profile');
  const res = await page.request.post('/api/profile', { data: { classCode, privacyAcknowledged: true, nickname: nicknameOptions(1)[0], interests: [] } });
  expect(res.ok()).toBe(true);
  const { recoveryCode } = (await res.json()) as { recoveryCode: string };
  await page.goto('/');
  return recoveryCode;
}

/** The question ids and positions of the course the signed-in student is in, in order. */
export async function questionIdsInOrder(page: Page): Promise<[number, string][]> {
  const html = await (await page.request.get('/phases/write')).text();
  const ids = [...html.matchAll(/\\?"id\\?":\\?"([0-9a-f-]{36})\\?",\\?"position\\?":(\d)/g)].map((m) => ({ id: m[1], position: Number(m[2]) }));
  const ordered = [...new Map(ids.map((q) => [q.position, q.id])).entries()].sort((a, b) => a[0] - b[0]);
  expect(ordered).toHaveLength(5);
  return ordered;
}

/** Masters all five questions by ear on two sessions, through the app's own route, and confirms nothing. */
export async function masterUnderstand(page: Page): Promise<[number, string][]> {
  const ordered = await questionIdsInOrder(page);
  const [sessionA, sessionB] = [crypto.randomUUID(), crypto.randomUUID()];
  for (const [, id] of ordered) {
    for (const sessionId of [sessionA, sessionA, sessionB]) {
      const r = await page.request.post('/api/attempts', { data: { itemId: id, outcome: 'correct', sessionId } });
      expect(r.ok()).toBe(true);
    }
  }
  return ordered;
}

/**
 * Opens the memorise phase for a signed-in student by doing what a student would, through the app's own
 * routes: confirm all five answers on the sentence builder (write phase), and master all five questions by ear on two
 * separate sessions (understand phase). `long` lists the positions confirmed with the longer answer (`longSheetAnswer`).
 * Returns the question ids in order.
 */
export async function unlockMemorise(page: Page, long: number[] = []): Promise<string[]> {
  const html = await (await page.request.get('/phases/write')).text();
  const ids = [...html.matchAll(/\\?"id\\?":\\?"([0-9a-f-]{36})\\?",\\?"position\\?":(\d)/g)].map((m) => ({ id: m[1], position: Number(m[2]) }));
  const ordered = [...new Map(ids.map((q) => [q.position, q.id])).entries()].sort((a, b) => a[0] - b[0]);
  expect(ordered).toHaveLength(5);
  const [sessionA, sessionB] = [crypto.randomUUID(), crypto.randomUUID()];
  for (const [position, id] of ordered) {
    const saved = await page.request.post('/api/answers', { data: { questionId: id, selection: long.includes(position) ? LONG : SHORT, confirm: true } });
    expect(saved.ok()).toBe(true);
    for (const sessionId of [sessionA, sessionA, sessionB]) {
      const r = await page.request.post('/api/attempts', { data: { itemId: id, outcome: 'correct', sessionId } });
      expect(r.ok()).toBe(true);
    }
  }
  return ordered.map(([, id]) => id);
}

/** Memorise-phase mastery for every question, seeded through the app's own route: three good recalls with some of the script hidden, across two sessions. */
export async function unlockAutomate(page: Page, long: number[] = []): Promise<string[]> {
  const ids = await unlockMemorise(page, long);
  const [a, b] = [crypto.randomUUID(), crypto.randomUUID()];
  for (const itemId of ids) {
    for (const sessionId of [a, a, b]) {
      const r = await page.request.post('/api/recall', { data: { itemId, sessionId, accuracy: 90, level: 1 } });
      expect(r.ok()).toBe(true);
    }
  }
  return ids;
}

/** Stub clips for the five seed questions at three speeds. `onAsk` is told which question starts playing. */
export async function stubQuestionAudio(page: Page, onAsk?: (spanish: string, speed: number) => void) {
  const { SEED_COURSE } = await import('../lib/course/seed');
  const { SPEEDS } = await import('../lib/audio/manifest');
  const speeds = Object.values(SPEEDS);
  const slotOf = (q: number, s: number) => String(q * 3 + s + 1).padStart(12, '0');
  const index = SEED_COURSE.questions.flatMap((q, qi) => speeds.map((speed, si) => ({ slot: slotOf(qi, si), text: q.spanish, speed })));
  const wav = () => {
    const rate = 8000, n = rate; // one second of silence
    const buf = Buffer.alloc(44 + n * 2);
    buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8);
    buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
    buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
    return buf;
  };
  await page.route('**/api/clips', (r) => r.fulfill({ json: index }));
  await page.route('**/audio/clips/*.json', (r) => {
    const entry = index.find((e) => e.slot === r.request().url().split('/').pop()!.replace('.json', ''));
    if (!entry) return r.fallback();
    return r.fulfill({
      json: {
        id: 'x', text: entry.text, en: 'stub', end: 1.2,
        words: entry.text.split(' ').map((t, i) => ({ text: t, t0: 0.1 + i * 0.1 })),
        envelope: Array.from({ length: 40 }, (_, i) => (i % 4 < 2 ? 0.8 : 0.2)), envelopeHop: 0.03,
        feelings: [{ t0: 0, feelings: {} }], source: { provider: 'test', voiceId: 'stub', model: 'stub', speed: 1, hash: 'stub' },
      },
    });
  });
  await page.route('**/audio/clips/*.mp3', (r) => {
    const entry = index.find((e) => e.slot === r.request().url().split('/').pop()!.replace('.mp3', ''));
    if (!entry) return r.fallback();
    onAsk?.(entry.text, entry.speed);
    return r.fulfill({ contentType: 'audio/wav', body: wav() });
  });
}

/**
 * A microphone that speaks on cue. Silence until `window.__speakIn` milliseconds after a question's audio ends,
 * then a burst of sound. A stopwatch for response time: the test knows exactly when speech starts.
 * Leave `__speakIn` unset for a student who says nothing.
 */
export async function installCuedMic(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, any>;
    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const osc = ctx.createOscillator();
    osc.frequency.value = 220;
    osc.connect(gain).connect(dest);
    osc.start();
    addEventListener('pointerdown', () => void ctx.resume(), { capture: true });
    // A fresh stream each time, as a real microphone gives, so releasing one does not end the next.
    navigator.mediaDevices.getUserMedia = async () => new MediaStream(dest.stream.getAudioTracks().map((t) => t.clone()));
    w.__questionEnds = [] as number[];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      this.addEventListener('ended', () => {
        w.__questionEnds.push(performance.now());
        if (typeof w.__speakIn === 'number') {
          setTimeout(() => gain.gain.setValueAtTime(0.5, ctx.currentTime), w.__speakIn);
          setTimeout(() => gain.gain.setValueAtTime(0, ctx.currentTime), w.__speakIn + (w.__speakFor ?? 600));
        }
      }, { once: true });
      return play.call(this);
    };
  });
}

/**
 * Each answer in the memorise phase opens with a few short warm-up tasks. A student who already knows the answer can
 * say it straight away; tests of the spoken step use this to get there. It does nothing if the spoken step is already showing.
 */
export async function skipWarmups(page: Page) {
  const know = page.getByTestId('know-it');
  const prompt = page.getByTestId('english-prompt');
  await expect(know.or(prompt)).toBeVisible();
  if (await know.isVisible()) await know.click();
  await expect(prompt).toBeVisible();
}

/** Everything inside the practice screen must sit inside the viewport, and the task card must not need scrolling. */
export async function expectFits(page: Page, where: string) {
  // The panel slides in; measure it where it comes to rest.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
  const bad = await page.evaluate(() => {
    const out: string[] = [];
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    if (document.documentElement.scrollHeight > vh + 1) out.push(`page scrolls (${document.documentElement.scrollHeight} > ${vh})`);
    if (document.documentElement.scrollWidth > vw + 1) out.push('page scrolls sideways');
    const body = document.querySelector('.practice-body');
    if (body && body.scrollHeight > body.clientHeight + 1) out.push(`task card scrolls (${body.scrollHeight} > ${body.clientHeight})`);
    for (const el of document.querySelectorAll('.practice *')) {
      if (el.closest('.sr-only, .sr-only-live, .reward')) continue;
      // A long tray of chunks may scroll inside its own box (the box itself is still checked).
      if (el !== el.closest('.tray') && el.closest('.tray')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      if (r.bottom > vh + 1 || r.right > vw + 1 || r.left < -1) out.push(`${el.tagName}.${(el as HTMLElement).className} ${el.textContent?.slice(0, 30)}`);
    }
    return out;
  });
  expect(bad, where).toEqual([]);
}

