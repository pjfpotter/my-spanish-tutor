import { expect, test } from '@playwright/test';
import { SEED_COURSE } from '../lib/course/seed';
import { installCuedMic, SEED_CLASS_CODE, stubQuestionAudio, unlockAutomate, unlockMemorise } from './helpers';

// Task 16.1: one scripted pass of all four phases on the seeded course, from joining to test-ready, on the phone and
// Chromebook profiles. Joining and the final timed round go through the real screens; the writing, hearing and
// memorising steps are advanced through the same routes those screens call (each has its own spec), so the whole
// path stays inside the time budget. The teacher overview is checked at the end, and no model or paid service is called.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

const state = (page: import('@playwright/test').Page, phase: string) => page.locator(`[data-phase="${phase}"]`);

test('join, write, understand, memorise and automate on the seeded course, then see the student at "Test ready"', async ({ page }) => {
  test.setTimeout(240_000);
  const paid: string[] = [];
  page.on('request', (r) => /openai|anthropic|elevenlabs/.test(r.url()) && paid.push(r.url()));
  const asked: string[] = [];
  await installCuedMic(page);
  await page.addInitScript(() => ((window as any).__speakIn = 300));
  await stubQuestionAudio(page, (spanish) => asked.push(spanish));
  await page.route('**/api/transcribe', (r) => {
    const q = SEED_COURSE.questions.find((x) => x.spanish === asked.at(-1))!;
    const text = SEED_COURSE.modelAnswers.find((a) => a.questionPosition === q.position && a.level === 'rock_solid')!.text;
    return r.fulfill({ json: { status: 'ok', text, confidence: 0.9 } });
  });

  // 1. Join with the class code, read the notice, pick a nickname.
  await page.goto('/welcome');
  await page.getByRole('textbox').fill(SEED_CLASS_CODE);
  await page.getByRole('button', { name: 'Find my class' }).click();
  await expect(page.getByTestId('course-found')).toContainText(SEED_COURSE.title);
  await page.getByRole('checkbox', { name: 'I have read this' }).check();
  await page.getByRole('button', { name: 'Carry on' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Create my profile' }).click();
  await expect(page.getByTestId('recovery-code')).toBeVisible();
  await page.getByRole('button', { name: /Let's go/ }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByTestId('readiness')).toHaveText('Readiness: 0%');
  await expect(state(page, 'write')).toHaveAttribute('data-state', 'open');
  await expect(state(page, 'understand')).toHaveAttribute('data-state', 'open');
  await expect(state(page, 'memorise')).toHaveAttribute('data-state', 'locked');
  await expect(state(page, 'automate')).toHaveAttribute('data-state', 'locked');

  // 2. Write and understand done: memorise opens.
  const ids = await unlockMemorise(page);
  await page.goto('/');
  await expect(state(page, 'memorise')).toHaveAttribute('data-state', 'open');
  await expect(state(page, 'automate')).toHaveAttribute('data-state', 'locked');
  await expect(page.getByTestId('readiness')).toHaveText('Readiness: 33%');
  await expect(page.getByTestId('readiness-next')).toContainText('Memoriza');

  // 3. Memorised: automate opens.
  await unlockAutomate(page);
  await page.goto('/');
  await expect(state(page, 'automate')).toHaveAttribute('data-state', 'open');
  await expect(page.getByTestId('readiness')).toHaveText('Readiness: 67%');

  // 4. A real timed round through the screen: five questions, each answered by voice against the clock.
  await page.goto('/phases/automate');
  await page.getByRole('button', { name: 'Start a round' }).click();
  for (let i = 0; i < 5; i++) {
    await expect(page.getByTestId('feedback')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /Next question|See how I did/ }).click();
  }
  await expect(page.getByTestId('summary')).toBeVisible();

  // 5. Two quick, accurate sessions on every question make the student test-ready.
  const [a, b] = [crypto.randomUUID(), crypto.randomUUID()];
  for (const sessionId of [a, b]) {
    for (const itemId of ids) {
      const r = await page.request.post('/api/respond', { data: { itemId, sessionId, blank: false, accuracy: 95, responseTimeMs: 1000, speed: 1, repeats: 0, assisted: false } });
      expect(r.ok()).toBe(true);
    }
  }
  await page.goto('/');
  await expect(page.getByTestId('readiness')).toHaveText('Readiness: 100%');
  for (const phase of ['write', 'understand', 'memorise', 'automate']) await expect(state(page, phase)).toContainText('Done');
  await expect(page.getByTestId('days-to-test')).toBeVisible();

  // 6. The teacher sees one student, ready, by nickname only.
  await page.goto('/owner/e2e-owner-token-0123456789');
  await expect(page.getByTestId('student-row').filter({ hasText: 'Test ready' }).first()).toContainText('100%');
  expect(paid).toEqual([]); // the real services were never reached
});
