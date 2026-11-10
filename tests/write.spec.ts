import { expect, test } from '@playwright/test';
import { assessAnswer } from '../lib/coach/rubric';
import { SEED_COURSE, simplestSeedAnswer } from '../lib/course/seed';
import { signUp } from './helpers';

// Tasks 7.4 and 7.6: the write phase end to end. Swap, confirm all five, and the
// features that light up match what the rubric counts. No model is called anywhere on this screen.

const rock = (n: number) => simplestSeedAnswer(n);

test('writes, swaps and confirms all five answers, and memorise stays locked until then', async ({ page }) => {
  const modelCalls: string[] = [];
  page.on('request', (r) => /openai|anthropic|elevenlabs/.test(r.url()) && modelCalls.push(r.url()));
  await signUp(page);
  await page.goto('/phases/write');

  // Starts from the simplest starter answer and shows its value, with no level names or grades.
  await expect(page.locator('.answer-text')).toHaveText(rock(1));
  const value = assessAnswer(SEED_COURSE.calibration, rock(1)).value;
  await expect(page.getByText(`Your answer is worth ${value}.`)).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/grade|WTG|rock solid|stepping out|showing off/i);

  // A swap re-counts the rubric at once, and the lit features equal the rubric's own output.
  await page.getByLabel(/Swap “Los fines de semana”|Swap “aunque”|Swap “acción”/).first().selectOption({ index: 1 });
  const text = (await page.locator('.answer-text').textContent())!;
  const expected = assessAnswer(SEED_COURSE.calibration, text).features.map((f) => f.label).sort();
  const lit = (await page.locator('.file ~ section .features li[data-on="true"]').allTextContents()).map((t) => t.replace(/^✓\s*/, '').replace(/\s*\(used\)$/, '')).sort();
  expect(lit).toEqual(expected);

  // Confirm each question. Memorise is locked until all five are.
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
