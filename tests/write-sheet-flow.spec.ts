import { expect, test } from '@playwright/test';
import { signUp } from './helpers';

// Task 5.1b: the real Write phase on the teacher's sentence builder. Every course has one (the seeded courses
// carry the free-time sample), and it is the only way to write. No model is called anywhere on this screen.
test.use({ viewport: { width: 360, height: 640 } });

const pick = async (page: import('@playwright/test').Page, es: string) => {
  const cell = page.locator('.ws-view .ws-cell:not(.static)', { hasText: es }).first();
  await cell.dispatchEvent('click');
  await page.waitForTimeout(150);
};

test('builds, checks and confirms an answer on the sheet; it survives a reload; the server holds the sentence', async ({ page }) => {
  const modelCalls: string[] = [];
  page.on('request', (r) => /openai|anthropic|elevenlabs/.test(r.url()) && modelCalls.push(r.url()));
  await signUp(page);
  await page.goto('/phases/write');
  await expect(page.getByTestId('write-sheet')).toBeVisible();
  for (const t of ['Me encanta', 'jugar al baloncesto', 'dado que', 'es divertido']) await pick(page, t);
  await page.getByRole('button', { name: 'Check it' }).click();
  await expect(page.getByTestId('result')).toHaveAttribute('data-code', 'ok');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('button', { name: /^1.*confirmed/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^2/ })).toHaveAttribute('aria-current', 'true');

  await page.getByRole('button', { name: /^1/ }).click();
  await page.reload();
  await page.getByRole('button', { name: /^1/ }).click();
  await expect(page.getByTestId('sentence')).toContainText('Me encanta jugar al baloncesto dado que es divertido');
  expect(modelCalls).toEqual([]);
});

test('a half-built answer is saved but cannot be confirmed, and the server refuses a forged one', async ({ page }) => {
  await signUp(page);
  await page.goto('/phases/write');
  await pick(page, 'Me encanta');
  await page.getByRole('button', { name: 'Check it' }).click();
  await expect(page.getByTestId('result')).toHaveAttribute('data-code', 'incomplete');
  await expect(page.getByRole('button', { name: 'Done' })).toHaveCount(0);
  const res = await page.request.post('/api/answers', { data: { questionId: 'x', selection: { starter: { col: 'zzz', i: 1 } }, confirm: true } });
  expect(res.status()).toBe(400);
});
