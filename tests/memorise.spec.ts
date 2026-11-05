import { expect, test, type Page } from '@playwright/test';
import { SEED_COURSE } from '../lib/course/seed';
import { signUp, unlockMemorise } from './helpers';

// Tasks 8.1 to 8.4 and 5.3 to 5.5: say a confirmed answer from memory. The transcription call is stubbed
// (these tests cost nothing) and the fake microphone supplies the audio. Nothing here calls a model.

const ROCK = (n: number) => SEED_COURSE.modelAnswers.find((a) => a.questionPosition === n && a.level === 'rock_solid')!.text;
const SHOWING_OFF_1 = SEED_COURSE.modelAnswers.find((a) => a.questionPosition === 1 && a.level === 'showing_off')!.text;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

/** What the stubbed recogniser will hear next. */
function hear(page: Page) {
  const heard = { text: '', confidence: 0.9 };
  void page.route('**/api/transcribe', (r) => r.fulfill({ json: { status: 'ok', text: heard.text, confidence: heard.confidence } }));
  return heard;
}

async function speak(page: Page) {
  await page.getByRole('button', { name: /Start speaking|Try again/ }).first().click();
  await expect(page.getByTestId('listening')).toBeVisible();
  await page.waitForTimeout(400); // let the fake microphone record something
  await page.getByRole('button', { name: 'Done' }).click();
}

const recallCalls = (page: Page) => {
  const sent: Record<string, unknown>[] = [];
  const replies: Record<string, any>[] = [];
  page.on('request', (r) => r.url().endsWith('/api/recall') && sent.push(r.postDataJSON()));
  page.on('response', async (res) => res.url().endsWith('/api/recall') && res.ok() && replies.push(await res.json().catch(() => null)));
  return { sent, replies };
};

test('memorise stays locked until the answers are confirmed and the questions mastered, then opens', async ({ page }) => {
  await signUp(page);
  await page.goto('/phases/memorise');
  await expect(page).toHaveURL('/');
  await unlockMemorise(page);
  await page.goto('/phases/memorise');
  await expect(page).toHaveURL('/phases/memorise');
  await expect(page.getByTestId('english-prompt')).toHaveText(SEED_COURSE.questions[0].english);
  await expect(page.getByTestId('best')).toContainText('No personal best yet');
});

test('an attempt shows its accuracy within two seconds of the end of speech, and calls no model (8.1)', async ({ page }) => {
  const modelCalls: string[] = [];
  page.on('request', (r) => /openai|anthropic|elevenlabs/.test(r.url()) && modelCalls.push(r.url()));
  await signUp(page);
  await unlockMemorise(page);
  const heard = hear(page);
  heard.text = ROCK(1);
  await page.goto('/phases/memorise');

  await page.getByRole('button', { name: 'Start speaking' }).click();
  await expect(page.getByTestId('listening')).toBeVisible();
  await page.waitForTimeout(400);
  const t0 = Date.now();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByTestId('accuracy')).toHaveText('100%', { timeout: 2000 });
  expect(Date.now() - t0).toBeLessThan(2000);
  await expect(page.getByTestId('best')).toHaveText('Your best: 100%');
  expect(modelCalls).toEqual([]);
});

test('the prompt gives less of the script after two good attempts in a row, and the first reads do not count toward mastery (8.2, 8.3, 8.4)', async ({ page }) => {
  test.setTimeout(90_000);
  await signUp(page);
  await unlockMemorise(page);
  const heard = hear(page);
  const recall = recallCalls(page);
  heard.text = ROCK(1);
  await page.goto('/phases/memorise');

  await expect(page.getByTestId('support')).toHaveText('Showing: whole script');
  await expect(page.locator('[data-testid="prompt"] .gap')).toHaveCount(0);
  await speak(page);
  await expect(page.getByTestId('accuracy')).toHaveText('100%');
  await page.getByRole('button', { name: 'Say it again' }).click();
  await speak(page);
  await expect(page.getByTestId('accuracy')).toHaveText('100%');

  // Reading the whole script is not remembering: it earned effort coins but no mastery.
  await expect.poll(() => recall.replies.length).toBe(2);
  expect(recall.replies.every((r) => r.mastery.qualifyingSuccesses === 0 && r.coinsAwarded > 0)).toBe(true);
  expect(recall.sent.every((s) => s.level === 0)).toBe(true);

  // Now some words dim out. The prompt says so in words as well.
  await page.getByRole('button', { name: 'Say it again' }).click();
  await expect(page.getByTestId('support')).toHaveText('Showing: most of the script');
  const dimmed = await page.locator('[data-testid="prompt"] .gap').count();
  expect(dimmed).toBeGreaterThan(0);
  // And the level carries over to the next visit.
  await page.reload();
  await expect(page.getByTestId('support')).toHaveText('Showing: most of the script');
});

test('three good recalls in one session leave the answer in progress, and a later session memorises it (8.3)', async ({ page }) => {
  test.setTimeout(90_000);
  await signUp(page);
  const ids = await unlockMemorise(page);
  const heard = hear(page);
  const recall = recallCalls(page);
  heard.text = ROCK(1);
  await page.goto('/phases/memorise');

  for (let i = 0; i < 5; i++) {
    if (i) await page.getByRole('button', { name: 'Say it again' }).click();
    await speak(page);
    await expect(page.getByTestId('accuracy')).toBeVisible();
  }
  await expect.poll(() => recall.replies.length).toBe(5);
  const last = recall.replies[4];
  expect(last.mastery.qualifyingSuccesses).toBe(3); // the two whole-script reads did not count
  expect(last.mastered).toBe(false); // one session is not enough
  await expect(page.getByTestId('memorised-count')).toHaveText('0 of 5 answers memorised');

  // A later session confirms it.
  const later = await page.request.post('/api/recall', { data: { itemId: ids[0], sessionId: crypto.randomUUID(), accuracy: 90, level: 2 } });
  expect((await later.json()).mastered).toBe(true);
  await page.reload();
  await expect(page.getByTestId('memorised-count')).toHaveText('1 of 5 answers memorised');
});

test('feedback leads with what was right and names one thing to fix, with a tip only when one fits (8.3, 5.3)', async ({ page }) => {
  await signUp(page);
  await unlockMemorise(page);
  const heard = hear(page);
  await page.goto('/phases/memorise');

  // A missed word with no matching confusion: a plain pointer, no tip.
  heard.text = 'Me gustan las películas de acción porque son';
  await speak(page);
  await expect(page.getByTestId('strongest')).toContainText('Me gustan las películas de acción porque son');
  await expect(page.getByTestId('fix')).toContainText('divertidas');
  await expect(page.getByTestId('fix')).toContainText('Tap it to hear it slowly');
  await expect(page.getByTestId('fix')).not.toContainText('may');
  await expect(page.getByTestId('fix')).toHaveCount(1);

  // me heard as mi: the one-line tip.
  await page.getByRole('button', { name: 'Say it again' }).click();
  heard.text = 'mi gustan las películas de acción porque son divertidas';
  await speak(page);
  await expect(page.getByTestId('fix')).toContainText('“me” sounds like English “may”');
  await expect(page.locator('body')).not.toContainText(/fail|incorrect/i);
});

test('a missed word shows its syllables, plays slowly, and can be repeated (5.4)', async ({ page }) => {
  await page.addInitScript(() => {
    const spoken: { text: string; rate: number; lang: string }[] = [];
    (window as any).__spoken = spoken;
    Object.defineProperty(window.speechSynthesis, 'speak', { value: (u: SpeechSynthesisUtterance) => spoken.push({ text: u.text, rate: u.rate, lang: u.lang }) });
  });
  await signUp(page);
  await unlockMemorise(page);
  const heard = hear(page);
  await page.goto('/phases/memorise');
  heard.text = 'Me gustan las películas de acción porque son';
  await speak(page);

  await page.getByRole('button', { name: /divertidas, missed/ }).click();
  await expect(page.getByTestId('syllables')).toHaveText('di-ver-ti-das');
  await expect(page.getByTestId('word-practice')).toContainText('The loud part is ti.');
  await expect(page.getByTestId('word-practice')).toHaveAttribute('data-audio-source', 'voice');
  const spoken = await page.evaluate(() => (window as any).__spoken);
  expect(spoken).toHaveLength(1); // only the word, once
  expect(spoken[0]).toMatchObject({ text: 'divertidas', lang: 'es-ES' });
  expect(spoken[0].rate).toBeCloseTo(0.7, 2); // slow

  // Repeat it: a clear attempt is "Got it", an unclear word asks for another go. Neither touches the score or mastery.
  heard.text = 'otra';
  await page.getByRole('button', { name: 'Say the word' }).click();
  await expect(page.getByTestId('listening')).toBeVisible();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByTestId('word-again')).toBeVisible();
  heard.text = 'divertidas';
  await page.getByRole('button', { name: 'Say the word' }).click();
  await expect(page.getByTestId('listening')).toBeVisible();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByTestId('word-got')).toBeVisible();
});

test('with no voice on the device, the syllables still show and the student carries on (5.4)', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }));
  await signUp(page);
  await unlockMemorise(page);
  const heard = hear(page);
  await page.goto('/phases/memorise');
  heard.text = 'Me gustan las películas de acción porque son';
  await speak(page);
  await page.getByRole('button', { name: /divertidas, missed/ }).click();
  await expect(page.getByTestId('syllables')).toHaveText('di-ver-ti-das');
  await expect(page.getByTestId('word-practice')).toHaveAttribute('data-audio-source', 'silent');
});

test('a noisy or unclear recording is not scored, saved or counted, and a retry is offered (5.5)', async ({ page }) => {
  await signUp(page);
  await unlockMemorise(page);
  const heard = hear(page);
  const recall = recallCalls(page);
  await page.goto('/phases/memorise');

  // Low confidence: the recogniser is guessing.
  heard.text = 'brr mmm';
  heard.confidence = 0.1;
  await speak(page);
  await expect(page.getByTestId('unclear')).toContainText('could not hear that clearly');
  await expect(page.getByTestId('unclear')).toContainText('not scored');
  await expect(page.getByTestId('accuracy')).toHaveCount(0);

  // Nothing heard at all.
  heard.text = '';
  heard.confidence = 0.9;
  await speak(page);
  await expect(page.getByTestId('unclear')).toBeVisible();

  expect(recall.sent).toEqual([]); // nothing was logged
  await expect(page.getByTestId('best')).toContainText('No personal best yet');

  // Retry works and is scored normally.
  heard.text = ROCK(1);
  await speak(page);
  await expect(page.getByTestId('accuracy')).toHaveText('100%');
  await expect(page.getByTestId('unclear')).toHaveCount(0);
  expect(recall.sent).toHaveLength(1);
});

test('a sentence missed three times in a row is isolated for short practice, then the whole answer returns (8.2)', async ({ page }) => {
  test.setTimeout(90_000);
  await signUp(page);
  await unlockMemorise(page, { 1: SHOWING_OFF_1 });
  const heard = hear(page);
  const sentences = SHOWING_OFF_1.split(/(?<=[.!?])\s+/);
  await page.goto('/phases/memorise');

  // Say every sentence except the second, three attempts running.
  heard.text = sentences.filter((_, i) => i !== 1).join(' ');
  for (let i = 0; i < 3; i++) {
    if (i) await page.getByRole('button', { name: 'Say it again' }).click();
    await speak(page);
    await expect(page.getByTestId('accuracy')).toBeVisible();
  }
  await expect(page.getByTestId('drill-note')).toContainText('keep tripping on one sentence');
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  // Just that sentence, with all its words showing.
  await expect(page.getByTestId('drill-banner')).toBeVisible();
  await expect(page.getByTestId('prompt')).toHaveText(sentences[1].replace(/\s+/g, ' ') + ' ');
  heard.text = sentences[1];
  await speak(page);
  await expect(page.getByTestId('accuracy')).toHaveText('100%');
  await page.getByRole('button', { name: 'Say it again' }).click();
  await speak(page);
  await expect(page.getByTestId('drill-note')).toHaveText('Good. Now the whole answer again.');

  // Back to the whole answer, on the same question.
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByTestId('drill-banner')).toHaveCount(0);
  await expect(page.getByTestId('english-prompt')).toHaveText(SEED_COURSE.questions[0].english);
  await expect(page.getByTestId('prompt')).toContainText(sentences[0].split(' ')[0]);
});
