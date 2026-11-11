import { expect, test, type Page } from '@playwright/test';

// Task 5.1/5.3: the writing screen on the engine, at the smallest phone sizes. The sheet stays at least
// 45% of the height, Spanish text on the sheet is at least 14px on screen, Check it stays visible, and
// the result fits without scrolling the page.
const SIZES = [{ width: 340, height: 640 }, { width: 360, height: 640 }];

async function pickByText(page: Page, es: string) {
  const cell = page.locator('.ws-view .ws-cell:not(.static)', { hasText: es }).first();
  await cell.scrollIntoViewIfNeeded().catch(() => undefined);
  await cell.dispatchEvent('click');
}

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test('layout: sheet is large, Check it visible, no page scroll', async ({ page }) => {
      await page.goto('/lab/write-sheet');
      const view = await page.getByTestId('sheet-view').boundingBox();
      expect(view!.height).toBeGreaterThanOrEqual(size.height * 0.45);
      const check = page.getByRole('button', { name: 'Check it' });
      await expect(check).toBeVisible();
      const cb = await check.boundingBox();
      expect(cb!.y + cb!.height).toBeLessThanOrEqual(size.height);
      const overflow = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test('guided camera makes the Spanish at least 14px on screen', async ({ page }) => {
      await page.goto('/lab/write-sheet');
      await expect(page.locator('.ws-col.live').first()).toBeVisible();
      await page.waitForTimeout(700);
      const px = await page.evaluate(() => {
        const el = document.querySelector('.ws-view > .ws-paper .ws-col.live .ws-es') as HTMLElement | null;
        if (!el) return 0;
        const k = el.getBoundingClientRect().height / el.offsetHeight;
        return parseFloat(getComputedStyle(el).fontSize) * k;
      });
      expect(px).toBeGreaterThanOrEqual(13.5);
    });

    test('the owner walkthrough builds a sentence, passes the check, and the result fits', async ({ page }) => {
      await page.goto('/lab/write-sheet');
      for (const t of ['Me encanta', 'jugar al baloncesto', 'dado que', 'es divertido']) {
        await pickByText(page, t);
        await page.waitForTimeout(150);
      }
      await expect(page.getByTestId('sentence')).toContainText('Me encanta jugar al baloncesto');
      await page.getByRole('button', { name: 'Check it' }).click();
      const result = page.getByTestId('result');
      await expect(result).toBeVisible();
      const rb = await result.boundingBox();
      expect(rb!.y + rb!.height).toBeLessThanOrEqual(size.height + 1);
      const overflow = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test('a half-built sentence says what to add; a clash is not tappable', async ({ page }) => {
      await page.goto('/lab/write-sheet');
      await pickByText(page, 'Me encanta');
      await page.getByRole('button', { name: 'Check it' }).click();
      await expect(page.getByTestId('result')).toHaveAttribute('data-code', 'incomplete');
      await expect(page.getByTestId('result')).toContainText('Add');
      await page.getByRole('button', { name: 'Keep editing' }).click();
      await pickByText(page, 'jugar al baloncesto');
      await pickByText(page, 'dado que');
      const bad = page.locator('.ws-view .ws-cell.clash').first();
      if (await bad.count()) await expect(bad).toHaveAttribute('aria-disabled', 'true');
    });
  });
}

test('pick-up mode is off by default and available with ?pickup=1', async ({ page }) => {
  await page.goto('/lab/write-sheet');
  await expect(page.getByTestId('write-sheet')).not.toHaveClass(/ws--pickup/);
  await page.goto('/lab/write-sheet?pickup=1');
  await expect(page.getByTestId('write-sheet')).toHaveClass(/ws--pickup/);
});
