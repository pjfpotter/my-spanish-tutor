import { expect, test, type Page } from '@playwright/test';
import { SEED_COURSE } from '../lib/course/seed';
import { SPEEDS } from '../lib/audio/manifest';
import { signUp } from './helpers';

// Tasks 6.1, 4.6 and 6.3: the hear-then-choose screen, the missing-clip fallback and the gate.
// Stub clips stand in for the real voice, so these tests cost nothing.

const SPEED_LIST = Object.values(SPEEDS);
const slotOf = (qIndex: number, speedIndex: number) => String(qIndex * 3 + speedIndex + 1).padStart(12, '0');
const INDEX = SEED_COURSE.questions.flatMap((q, qi) => SPEED_LIST.map((speed, si) => ({ slot: slotOf(qi, si), text: q.spanish, speed })));
const STUB_CLIP = (text: string) => ({
  id: 'x', text, en: 'stub', end: 1.2,
  words: text.split(' ').map((t, i) => ({ text: t, t0: 0.1 + i * 0.1 })),
  envelope: Array.from({ length: 40 }, (_, i) => (i % 4 < 2 ? 0.8 : 0.2)), envelopeHop: 0.03,
  feelings: [{ t0: 0, feelings: {} }], source: { provider: 'test', voiceId: 'stub', model: 'stub', speed: 1, hash: 'stub' },
});

function wav(): Buffer {
  const rate = 8000, n = rate; // one second
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  return buf;
}

interface Sent { itemId: string; outcome: string; speed: number; replays: number; usedSlow: boolean; revealed: boolean }

async function stubAudio(page: Page, opts: { brokenSlot?: string } = {}) {
  await page.route('**/api/clips', (r) => r.fulfill({ json: INDEX }));
  await page.route('**/audio/clips/*.json', (r) => {
    const slot = r.request().url().split('/').pop()!.replace('.json', '');
    if (slot === opts.brokenSlot) return r.fulfill({ status: 404, body: 'no' });
    const entry = INDEX.find((e) => e.slot === slot);
    if (!entry) return r.fallback(); // a real clip (the desktop's poke lines) is left alone
    return r.fulfill({ json: STUB_CLIP(entry.text) });
  });
  await page.route('**/audio/clips/*.mp3', (r) => {
    const slot = r.request().url().split('/').pop()!.replace('.mp3', '');
    return INDEX.some((e) => e.slot === slot) ? r.fulfill({ contentType: 'audio/wav', body: wav() }) : r.fallback();
  });
}

/** Records every attempt the page sends and the server's reply. */
function recordAttempts(page: Page) {
  const sent: Sent[] = [];
  const replies: { mastered: boolean; mastery: { qualifyingSuccesses: number }; coinsAwarded: number }[] = [];
  page.on('request', (r) => r.url().endsWith('/api/attempts') && sent.push(r.postDataJSON()));
  page.on('response', async (res) => {
    if (res.url().endsWith('/api/attempts') && res.ok()) replies.push(await res.json().catch(() => null));
  });
  return { sent, replies };
}

const english = (qIndex: number) => SEED_COURSE.questions[qIndex].english;
const optionFor = (page: Page, text: string) => page.getByRole('button', { name: text, exact: true });
const next = (page: Page) => page.getByRole('button', { name: 'Next', exact: true });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
  await stubAudio(page);
  await signUp(page);
});

async function open(page: Page) {
  await page.goto('/phases/understand');
  await expect(page.getByRole('button', { name: 'Listen', exact: true })).toBeVisible();
}

/** Presses Listen and works out which question and speed played, from the clip that was requested. */
async function listen(page: Page, button = 'Listen') {
  const req = page.waitForRequest('**/audio/clips/*.mp3');
  await page.getByRole('button', { name: button, exact: true }).click();
  const slot = Number((await req).url().split('/').pop()!.replace('.mp3', ''));
  return { q: Math.floor((slot - 1) / 3), speedIndex: (slot - 1) % 3 };
}

/** Listens, then picks the right meaning (or a wrong one). */
async function answer(page: Page, rec: ReturnType<typeof recordAttempts>, right = true) {
  const { q, speedIndex } = await listen(page);
  const n = rec.sent.length;
  if (right) await optionFor(page, english(q)).click();
  else await page.locator('.options button:not([disabled])').filter({ hasNotText: english(q) }).first().click();
  await expect.poll(() => rec.sent.length).toBe(n + 1);
  return { q, speedIndex };
}

test('plays the question with its words hidden, then the student picks what it means', async ({ page }) => {
  const rec = recordAttempts(page);
  await open(page);
  await expect(page.getByTestId('question-text')).toHaveCount(0);
  // The options cannot be used until the question has been heard.
  await expect(page.locator('.options button').first()).toBeDisabled();

  const { q } = await listen(page);
  // While it plays, the caption shows no Spanish words and the text stays hidden.
  await expect(page.getByTestId('caption-es')).toContainText('señal débil');
  await expect(page.getByTestId('question-text')).toHaveCount(0);

  await optionFor(page, english(q)).click();
  await expect(page.getByTestId('coins')).toContainText('+2 coins');
  await expect(page.getByTestId('question-text')).toBeVisible(); // the words appear after answering
  expect(rec.sent[0]).toMatchObject({ outcome: 'correct', revealed: false, speed: SPEEDS.slow });
  expect(rec.replies[0].coinsAwarded).toBe(2);
});

test('a wrong choice still earns coins and brings the question back within a few questions', async ({ page }) => {
  const rec = recordAttempts(page);
  await open(page);
  const first = await answer(page, rec, false);
  expect(rec.sent[0].outcome).toBe('wrong');
  await expect(page.getByTestId('coins')).toContainText('+2 coins');

  const seen: number[] = [];
  for (let i = 0; i < 3; i++) {
    await next(page).click();
    seen.push((await answer(page, rec)).q);
  }
  expect(seen).toContain(first.q);
  expect(seen[0]).not.toBe(first.q); // after a short gap, not straight away
});

test('replay, slower and reveal are each recorded, and a revealed attempt does not count toward mastery', async ({ page }) => {
  const rec = recordAttempts(page);
  await open(page);
  const { q } = await listen(page);
  await expect(page.getByRole('button', { name: 'Play again', exact: true })).toBeEnabled();
  await listen(page, 'Play again');
  await expect(page.getByRole('button', { name: 'Slower', exact: true })).toBeEnabled();
  const slow = await listen(page, 'Slower');
  expect(slow.speedIndex).toBe(0);
  await expect(page.getByRole('button', { name: 'Slower', exact: true })).toBeEnabled(); // finished playing
  await page.getByRole('button', { name: 'Show the words' }).click();
  await expect(page.getByTestId('question-text')).toContainText(SEED_COURSE.questions[q].spanish);

  await optionFor(page, english(q)).click(); // the right meaning, but it was assisted
  await expect(page.getByTestId('coins')).toBeVisible();
  await expect.poll(() => rec.sent.length).toBe(1);
  expect(rec.sent[0]).toMatchObject({ outcome: 'assisted', revealed: true, usedSlow: true, replays: 1 });
  await expect.poll(() => rec.replies.length).toBe(1);
  expect(rec.replies[0].mastery.qualifyingSuccesses).toBe(0); // did not count
  await expect(page.getByTestId('mastered-count')).toContainText('0 of 5');
});

test('speed rises after a correct answer on the same question', async ({ page }) => {
  const rec = recordAttempts(page);
  await open(page);
  const plays: { q: number; speedIndex: number }[] = [];
  for (let i = 0; i < 6; i++) {
    plays.push(await answer(page, rec));
    await next(page).click();
  }
  const first = plays[0];
  const again = plays.slice(1).find((p) => p.q === first.q);
  expect(again, 'the first question comes back within six presentations').toBeTruthy();
  expect(first.speedIndex).toBe(0); // starts slow
  expect(again!.speedIndex).toBe(1); // one step faster after a correct answer
});

test('shows the question as text and records the failure when its clip will not load (task 4.6)', async ({ page }) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await stubAudio(page, { brokenSlot: slotOf(0, 0) }); // Q1 slow, the first thing played
  const failures: unknown[] = [];
  page.on('request', (r) => r.url().endsWith('/api/clip-failure') && failures.push(r.postDataJSON()));
  const rec = recordAttempts(page);

  await open(page);
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(page.getByTestId('text-fallback')).toBeVisible();
  await expect(page.getByTestId('question-text')).toContainText(SEED_COURSE.questions[0].spanish);
  await expect(page.getByTestId('question-text')).toContainText(SEED_COURSE.questions[0].english);
  expect(failures).toEqual([{ slot: slotOf(0, 0) }]);

  // The student can carry on, and a text-only attempt does not count toward mastery.
  await optionFor(page, english(0)).click();
  await expect(page.getByTestId('coins')).toBeVisible();
  await expect.poll(() => rec.sent.length).toBe(1);
  expect(rec.sent[0].revealed).toBe(true);
});

test('with no clips built at all, the question is shown as text and the student can carry on', async ({ page }) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await page.route('**/api/clips', (r) => r.fulfill({ json: [] }));
  await open(page);
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(page.getByTestId('text-fallback')).toBeVisible();
  await optionFor(page, english(0)).click();
  await expect(page.getByTestId('coins')).toBeVisible();
});

test('the next phase stays locked until all five questions are mastered (task 6.3)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-phase="memorise"]')).toHaveAttribute('data-state', 'locked');
  await page.goto('/phases/memorise'); // and typing the address does not get in
  await expect(page).toHaveURL('/');
  await expect(page.locator('[data-phase="understand"]')).toHaveAttribute('data-state', 'open');
});

test('three correct in one session is not mastery: the student is done for today and told to come back', async ({ page }) => {
  test.setTimeout(180_000); // about fifteen clips are played in a row
  const rec = recordAttempts(page);
  await open(page);
  const listenButton = page.getByRole('button', { name: 'Listen', exact: true });
  for (let guard = 0; guard < 40; guard++) {
    await answer(page, rec);
    await next(page).click();
    await expect(listenButton.or(page.getByTestId('finished'))).toBeVisible();
    if ((await page.getByTestId('finished').count()) > 0) break;
  }
  await expect(page.getByTestId('finished')).toContainText('come back tomorrow');
  await expect(page.getByTestId('mastered-count')).toContainText('0 of 5'); // one session is not mastery
});

test("a question's channel on the desktop clears from static after a correct answer (task 6.4)", async ({ page }) => {
  const rec = recordAttempts(page);
  await open(page);
  const { q } = await answer(page, rec);
  await page.goto('/');
  const file = page.getByTestId('question-file').nth(q);
  await expect(file).toHaveAttribute('data-clarity', 'clearing');
  await expect(file).toContainText('clearing'); // said in words too
  const other = page.getByTestId('question-file').nth((q + 1) % 5);
  await expect(other).toHaveAttribute('data-clarity', 'static');
});
