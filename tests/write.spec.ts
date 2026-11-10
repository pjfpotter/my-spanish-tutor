import { expect, test } from '@playwright/test';
import { assessAnswer } from '../lib/coach/rubric';
import { SEED_COURSE } from '../lib/course/seed';
import { expectFits, signUp } from './helpers';

// Tasks 7.4, 7.6 and 26.1b: the write phase end to end. Every question opens on empty coloured slots, a tap
// shows only the chunks that fit, joining words come from a cement tray, a starter answer is optional, and a
// confirmed answer can be changed. No model is called anywhere on this screen.

const Q1 = SEED_COURSE.questions[0];
const value = (text: string) => assessAnswer(SEED_COURSE.calibration, text).value;

test('opens on empty slots with no target, builds an answer from fitting chunks and shows its value', async ({ page }) => {
  const modelCalls: string[] = [];
  page.on('request', (r) => /openai|anthropic|elevenlabs/.test(r.url()) && modelCalls.push(r.url()));
  await signUp(page);
  await page.goto('/phases/write');

  // Empty, coloured, nothing pre-filled, and no level, target or grade asked for.
  const blocks = page.getByTestId('block');
  await expect(blocks).toHaveCount(Q1.template!.length);
  for (const b of await blocks.all()) await expect(b).toHaveAttribute('data-empty', 'true');
  await expect(page.getByTestId('answer-value')).toContainText('Worth 0');
  await expect(page.locator('body')).not.toContainText(/rock solid|stepping out|showing off|grade|WTG|choose a style|target/i);
  await expectFits(page, 'empty write screen');

  // Tapping a slot shows only the chunks that fit it, in place.
  await blocks.nth(1).click(); // film type
  const fits = page.getByTestId('fit');
  const filmTypes = SEED_COURSE.chunks.filter((c) => c.category === 'film type').map((c) => c.spanish);
  for (const t of await fits.allTextContents()) expect(filmTypes.some((f) => t.startsWith(f)), t).toBe(true);
  await expect(fits).toHaveCount(filmTypes.length);
  await expectFits(page, 'tray open');
  await fits.filter({ hasText: 'acción' }).click();
  await blocks.nth(0).click(); // film opinion
  await page.getByTestId('fit').filter({ hasText: /^Me gustan las películas de/ }).click();
  await blocks.nth(2).click(); // reason
  await page.getByTestId('fit').filter({ hasText: /^porque son/ }).click();
  await blocks.nth(3).click(); // reason adjective
  await page.getByTestId('fit').filter({ hasText: /^divertidas/ }).click();

  const text = 'Me gustan las películas de acción porque son divertidas.';
  await expect(page.getByTestId('answer-text')).toHaveText(text);
  await expect(page.getByTestId('answer-value')).toContainText(`Worth ${value(text)}`);

  // A used chunk is not offered again within the answer.
  await page.getByTestId('add-block').click();
  await page.getByRole('button', { name: /film type/ }).click();
  await expect(page.getByTestId('fit').filter({ hasText: 'acción' })).toHaveCount(0);
  expect(modelCalls).toEqual([]);
});

test('joining words come from the cement tray and add no value', async ({ page }) => {
  await signUp(page);
  await page.goto('/phases/write');
  await page.getByTestId('starter').click();
  const before = await page.getByTestId('answer-value').textContent();
  await page.getByTestId('block').first().click();
  await page.getByRole('button', { name: 'Add a joining word after' }).click();
  await page.getByTestId('glue').filter({ hasText: /^pero$/ }).click();
  await expect(page.getByTestId('block-glue')).toHaveText(/pero/);
  await expect(page.getByTestId('answer-text')).toContainText(' pero ');
  await expect(page.getByTestId('answer-value')).toHaveText(before!);
});

test('a starter answer is optional, and there is no starter shown unless asked for', async ({ page }) => {
  await signUp(page);
  await page.goto('/phases/write');
  await expect(page.getByTestId('answer-text')).toHaveCount(0);
  await page.getByTestId('starter').click();
  const text = (await page.getByTestId('answer-text').textContent())!;
  expect(SEED_COURSE.modelAnswers.some((a) => a.questionPosition === 1 && a.text.replace(/[,.]/g, '') === text.replace(/[,.]/g, ''))).toBe(true);
  await expect(page.getByTestId('answer-value')).toContainText(`Worth ${value(text)}`);
  await page.getByTestId('confirm').click();
  await expect(page.getByRole('button', { name: 'Confirmed', exact: true })).toBeVisible();
  await expectFits(page, 'confirmed answer');
});

test('confirms all five answers, and changing a confirmed answer reopens it', async ({ page }) => {
  await signUp(page);
  await page.goto('/phases/write');
  for (let n = 1; n <= 5; n++) {
    await page.getByRole('button', { name: new RegExp(`^${n}`) }).first().click();
    await page.getByTestId('starter').click();
    await page.getByTestId('confirm').click();
    await expect(page.getByRole('button', { name: 'Confirmed', exact: true })).toBeVisible();
    if (n < 5) {
      await page.goto('/phases/memorise');
      await expect(page).toHaveURL('/');
      await page.goto('/phases/write');
    }
  }
  await expect(page.getByTestId('all-confirmed')).toBeVisible();

  // Take a block out of a confirmed answer: it reopens.
  await page.getByRole('button', { name: /^5/ }).first().click();
  await page.getByTestId('block').first().click();
  await page.getByRole('button', { name: 'Take out' }).click();
  await expect(page.getByTestId('confirm')).toBeEnabled();
  await expect(page.getByTestId('all-confirmed')).toHaveCount(0);
});

test('fits one screen on a phone with a long tray open', async ({ page }) => {
  await signUp(page);
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/phases/write');
  await page.getByRole('button', { name: /^5/ }).first().click();
  await page.getByTestId('block').nth(1).click(); // free time activity: the biggest tray
  await expectFits(page, 'biggest tray at 360 by 640');
});
