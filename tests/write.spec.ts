import { expect, test } from '@playwright/test';
import { assessAnswer } from '../lib/coach/rubric';
import { SEED_COURSE } from '../lib/course/seed';
import { signUp } from './helpers';

// Tasks 7.4 and 7.6: the write phase end to end. Pick a style, swap, confirm all five, and the
// features that light up match what the rubric counts. No model is called anywhere on this screen.

const rock = (n: number) => SEED_COURSE.modelAnswers.find((a) => a.questionPosition === n && a.level === 'rock_solid')!.text;

test('writes, swaps and confirms all five answers, and memorise stays locked until then', async ({ page }) => {
  const modelCalls: string[] = [];
  page.on('request', (r) => /openai|anthropic|elevenlabs/.test(r.url()) && modelCalls.push(r.url()));
  await signUp(page);
  await page.goto('/phases/write');

  // Starts at Rock solid with the easiest model answer, and names the level without a grade.
  await expect(page.locator('.answer-text')).toHaveText(rock(1));
  await expect(page.getByText('Your answer is Rock solid.')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Rock solid' })).toBeChecked();
  await expect(page.locator('body')).not.toContainText(/grade|WTG/i);

  // A swap re-counts the rubric at once, and the lit features equal the rubric's own output.
  await page.getByLabel(/Swap “Los fines de semana”|Swap “aunque”|Swap “acción”/).first().selectOption({ index: 1 });
  const text = (await page.locator('.answer-text').textContent())!;
  const expected = assessAnswer(SEED_COURSE.calibration, text).features.map((f) => f.label).sort();
  const lit = (await page.locator('.file ~ section .features li[data-on="true"]').allTextContents()).map((t) => t.replace(/^✓\s*/, '').replace(/\s*\(used\)$/, '')).sort();
  expect(lit).toEqual(expected);

  // Switching style offers the matching model answer for untouched answers, and leaves the student's own edit alone.
  await page.getByRole('radio', { name: 'Stepping out' }).check();
  await expect(page.locator('.answer-text')).toHaveText(text);
  await page.getByRole('button', { name: /^2/ }).first().click();
  const stepping = SEED_COURSE.modelAnswers.find((a) => a.questionPosition === 2 && a.level === 'stepping_out')!.text;
  await expect(page.locator('.answer-text')).toHaveText(stepping);
  await page.getByRole('button', { name: /^1/ }).first().click();

  // Confirm each question. Memorise is locked until all five are.
  await page.getByRole('radio', { name: 'Rock solid' }).check();
  for (let n = 1; n <= 5; n++) {
    await page.getByRole('button', { name: new RegExp(`^${n}`) }).first().click();
    await page.getByRole('button', { name: 'Confirm this answer' }).click();
    await expect(page.getByRole('button', { name: 'Confirmed', exact: true })).toBeVisible();
    if (n < 5) {
      await page.goto('/phases/memorise');
      await expect(page).toHaveURL('/');
      await page.goto('/phases/write');
    }
  }
  await expect(page.getByRole('link', { name: /All five confirmed/ })).toBeVisible();
  expect(modelCalls).toEqual([]);

  // Changing a confirmed answer reopens it.
  await page.getByRole('button', { name: /^5/ }).first().click();
  await page.getByLabel(/^Swap /).first().selectOption({ index: 1 });
  await expect(page.getByRole('button', { name: 'Confirm this answer' })).toBeEnabled();
  await expect(page.getByRole('link', { name: /All five confirmed/ })).toHaveCount(0);
});
