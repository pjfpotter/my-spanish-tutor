import { expect, test } from '@playwright/test';
import { FAKE_STUDENTS } from '../lib/lab/fake-students';
import { installCuedMic, stubQuestionAudio } from './helpers';

// automate-lab: the real timed round on a fake student, with nothing sent to the server and notes kept on the device.
// Clips and transcription are stubbed, as in the other specs. Nothing here calls a model.

const SERVER_ROUTES = ['/api/respond', '/api/attempts', '/api/recall', '/api/profile', '/api/answers', '/api/memorise', '/api/clip-failure'];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

async function playOneAnswer(page: import('@playwright/test').Page, student: 'short' | 'mixed' | 'long' = 'short') {
  const asked: string[] = [];
  await installCuedMic(page);
  await page.addInitScript(() => ((window as unknown as { __speakIn: number }).__speakIn = 300));
  await stubQuestionAudio(page, (spanish) => asked.push(spanish));
  await page.route('**/api/transcribe', (r) => {
    const item = FAKE_STUDENTS[student].items.find((i) => i.question === asked.at(-1));
    return r.fulfill({ json: { status: 'ok', text: item?.answer ?? '', confidence: 0.9 } });
  });
  await page.goto(`/lab/automate?student=${student}`);
  await page.getByRole('button', { name: 'Start a round' }).click();
  await expect(page.getByTestId('feedback')).toBeVisible({ timeout: 20_000 });
}

test('the lab runs a real round without joining, and sends nothing to the server', async ({ page }) => {
  test.setTimeout(120_000);
  const hits: string[] = [];
  page.on('request', (r) => {
    const path = new URL(r.url()).pathname;
    if (SERVER_ROUTES.some((p) => path.startsWith(p))) hits.push(`${r.method()} ${path}`);
  });
  await playOneAnswer(page);
  await expect(page.getByTestId('lab-bar')).toContainText('Real transcription is used and paid for');
  expect(hits).toEqual([]);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('the student can be chosen on the page or by address, and setup can come from the address', async ({ page }) => {
  await page.goto('/lab/automate?student=long&startAt=2&expert=1');
  await expect(page.getByTestId('student-long')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('start-with')).toHaveValue('2');
  await expect(page.getByTestId('expert-choice').locator('input')).toBeChecked();
  await page.getByTestId('student-short').click();
  await expect(page.getByTestId('student-short')).toHaveAttribute('aria-checked', 'true');
  await page.goto('/lab/automate?student=nobody&startAt=9&expert=maybe');
  await expect(page.getByTestId('student-short')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('start-with')).toHaveValue('0');
  await expect(page.getByTestId('expert-choice').locator('input')).not.toBeChecked();
});

test('every attempt is logged, a note is stamped with the figures, and the notes can be copied out', async ({ page, context }) => {
  test.setTimeout(120_000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await playOneAnswer(page);

  await page.getByTestId('notes-open').click();
  await expect(page.getByTestId('notes-stamp')).toContainText('question');
  await expect(page.getByTestId('log-count')).toContainText('1 attempt logged');
  await page.getByRole('button', { name: 'too fast' }).click();
  await page.getByTestId('note-text').fill('The window closed before I had finished the first chunk.');
  await page.getByTestId('note-add').click();
  await expect(page.getByTestId('log-count')).toContainText('1 note');

  await page.getByTestId('notes-copy').click();
  const text = await page.getByTestId('report-text').inputValue();
  expect(text).toContain('The window closed before I had finished the first chunk.');
  expect(text).toContain('tags: too fast');
  expect(text).toContain('Attempts (1)');
  expect(text).toMatch(/window \d/);

  // Notes and the log survive a reload, because they live on the device.
  await page.reload();
  await page.getByTestId('notes-open').click();
  await expect(page.getByTestId('log-count')).toContainText('1 note');
  await page.getByTestId('notes-clear').click();
  await page.getByTestId('log-clear').click();
  await expect(page.getByTestId('log-count')).toContainText('0 notes, 0 attempts');
});

test('start again clears the lab\'s own level and bests, keeps the notes, and never touches the real phase\'s keys', async ({ page }) => {
  test.setTimeout(120_000);
  await playOneAnswer(page);
  await page.evaluate(() => {
    localStorage.setItem('ladder:11111111-1111-1111-1111-111111111111', JSON.stringify({ at: 2, met: 1 }));
    localStorage.setItem('best-ms:11111111-1111-1111-1111-111111111111', '1800');
  });
  const labKeys = () => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('ladder:lab:') || k.startsWith('best-ms:lab:') || k.startsWith('lab:automate:rows:')));
  expect((await labKeys()).length).toBeGreaterThan(0);

  await page.getByTestId('notes-open').click();
  await page.getByTestId('note-text').fill('keep me');
  await page.getByTestId('note-add').click();
  await page.getByTestId('notes-close').click();

  await page.getByTestId('start-again').click();
  expect(await labKeys()).toEqual([]);
  const real = await page.evaluate(() => [localStorage.getItem('ladder:11111111-1111-1111-1111-111111111111'), localStorage.getItem('best-ms:11111111-1111-1111-1111-111111111111')]);
  expect(real[0]).toContain('"at":2');
  expect(real[1]).toBe('1800');
  await page.getByTestId('notes-open').click();
  await expect(page.getByTestId('log-count')).toContainText('1 note');
});

test('nothing on the student desktop leads to the lab', async ({ page }) => {
  await page.goto('/welcome');
  expect(await page.locator('a[href*="/lab"]').count()).toBe(0);
});
