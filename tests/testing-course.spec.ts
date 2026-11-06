import { expect, test } from '@playwright/test';
import { SEED_COURSE, TESTING_COURSE } from '../lib/course/seed';
import { installCuedMic, signUp, stubQuestionAudio } from './helpers';

// course-unlock-testing: the testing course opens every phase, and the real course does not. Clips are stubs and
// transcription is stubbed, as in the other specs. Nothing here calls a model.

const TESTING = TESTING_COURSE.classCode;
const modelAnswer = (spanish: string) => {
  const position = SEED_COURSE.questions.find((q) => q.spanish === spanish)!.position;
  return SEED_COURSE.modelAnswers.find((a) => a.questionPosition === position && a.level === 'rock_solid')!.text;
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

test('a tester in the testing course sees every step open and labelled, with nothing written yet (4.1)', async ({ page }) => {
  await signUp(page, TESTING);
  await expect(page.getByTestId('testing-label')).toContainText('Testing course');
  await expect(page.locator('[data-phase][data-state="open"]')).toHaveCount(4);
  await expect(page.locator('[data-phase][data-state="locked"]')).toHaveCount(0);

  // Memorise opens on the model answers instead of an empty or "all done" screen.
  await page.goto('/phases/memorise');
  await expect(page).toHaveURL('/phases/memorise');
  await expect(page.getByTestId('memorised-count')).toHaveText('0 of 5 answers memorised');
  await expect(page.getByTestId('nothing-to-practise')).toHaveCount(0);
});

test('a tester can run a timed round straight away, and the attempt is recorded (4.1)', async ({ page }) => {
  test.setTimeout(120_000);
  const asked: string[] = [];
  await installCuedMic(page);
  await page.addInitScript(() => ((window as any).__speakIn = 300));
  await signUp(page, TESTING);
  await stubQuestionAudio(page, (spanish) => asked.push(spanish));
  await page.route('**/api/transcribe', (r) => r.fulfill({ json: { status: 'ok', text: modelAnswer(asked.at(-1)!), confidence: 0.9 } }));

  await page.goto('/phases/automate');
  await expect(page).toHaveURL('/phases/automate');
  await expect(page.getByTestId('nothing-to-practise')).toHaveCount(0);
  const respond = page.waitForResponse((r) => r.url().endsWith('/api/respond'), { timeout: 30_000 });
  await page.getByRole('button', { name: 'Start a round' }).click();
  const reply = await respond;
  expect(reply.ok()).toBe(true);
  expect(await reply.json()).toMatchObject({ ok: true });
  await expect(page.getByTestId('feedback')).toBeVisible({ timeout: 20_000 });
});

test('the real course stays gated, and nothing a student adds to the address or headers unlocks it (4.2)', async ({ page }) => {
  await signUp(page, SEED_COURSE.classCode);
  await expect(page.getByTestId('testing-label')).toHaveCount(0);
  await expect(page.locator('[data-phase="memorise"][data-state="locked"]')).toBeVisible();
  await expect(page.locator('[data-phase="automate"][data-state="locked"]')).toBeVisible();

  await page.setExtraHTTPHeaders({ 'x-unlock-all': '1', 'x-testing': 'true', unlock: '1' });
  for (const phase of ['memorise', 'automate']) {
    for (const query of ['', '?unlock=1', '?unlockAll=true', '?testing=1']) {
      await page.goto(`/phases/${phase}${query}`);
      await expect(page).toHaveURL('/');
    }
  }
  await page.goto('/?unlock=1&unlockAll=true');
  await expect(page.locator('[data-phase][data-state="locked"]')).toHaveCount(2);
});

test('delete everything works for a tester like any student (4.3)', async ({ page, browser }) => {
  const code = await signUp(page, TESTING);
  await page.goto('/privacy');
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await page.getByRole('button', { name: 'Yes, delete everything' }).click();
  await expect(page).toHaveURL('/welcome');
  const other = await browser.newContext();
  expect((await other.request.post('/api/profile/restore', { data: { code } })).status()).toBe(404);
  await other.close();
});
