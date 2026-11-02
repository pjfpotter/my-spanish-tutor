import { expect, test, type Page } from '@playwright/test';

// Task 12.6: reduced motion (device setting) and the calm switch (student's choice) both stop idle
// motion, glitches and effects, while the caption still follows the voice.
//
// "Still" means the picture stops changing between frames. Tele still blinks now and then (a brief
// shut of the lids, no travel), so we look for at least one identical pair among several samples
// rather than all of them.

async function picture(page: Page) {
  return page.locator('canvas').first().evaluate((c) => (c as HTMLCanvasElement).toDataURL());
}
async function samples(page: Page, count = 6, gap = 350) {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(await picture(page));
    await page.waitForTimeout(gap);
  }
  return out;
}
const identicalPairs = (s: string[]) => s.slice(1).filter((v, i) => v === s[i]).length;

async function lockedStaticDuration(page: Page) {
  return page.locator('.phase-static').first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { duration: parseFloat(s.animationDuration), iterations: s.animationIterationCount };
  });
}

test.describe('device asks for reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('stops idle motion and the locked-phase static, and the calm switch cannot turn it back on', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('calm', 'off'));
    await page.goto('/');
    await page.waitForTimeout(1500); // power-on finishes quickly when still

    const d = await lockedStaticDuration(page);
    expect(d.duration).toBeLessThan(0.001);
    expect(d.iterations).toBe('1');

    expect(identicalPairs(await samples(page))).toBeGreaterThanOrEqual(1);
  });

  test('the caption still follows the voice', async ({ page }) => {
    await page.goto('/lab/tele');
    await page.getByRole('button', { name: 'Play stub line' }).click();
    const seen = new Set<string>();
    const end = Date.now() + 3000;
    while (Date.now() < end) {
      for (const w of await page.locator('.cw[data-active="true"]').allTextContents()) seen.add(w);
      await page.waitForTimeout(50);
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
});

test.describe('the calm switch', () => {
  test('is off by default: Tele and the static keep moving', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('calm', 'off'));
    await page.goto('/');
    await page.waitForTimeout(1500);

    const s = await samples(page);
    expect(identicalPairs(s)).toBeLessThanOrEqual(1);
    expect((await lockedStaticDuration(page)).duration).toBeGreaterThan(0.1);
  });

  test('turns idle motion and the static off, and the choice survives a reload', async ({ page }) => {
    await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'off'));
    await page.goto('/');
    await page.waitForTimeout(1200);

    const sw = page.getByRole('switch', { name: /Calm mode/ });
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-calm', 'on');
    await page.waitForTimeout(800);

    expect(identicalPairs(await samples(page))).toBeGreaterThanOrEqual(1);
    expect((await lockedStaticDuration(page)).duration).toBeLessThan(0.001);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-calm', 'on'); // applied before first paint
    await expect(page.getByRole('switch', { name: /Calm mode/ })).toHaveAttribute('aria-checked', 'true');
  });

  test('can be turned off again and motion returns', async ({ page }) => {
    await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
    await page.goto('/');
    const sw = page.getByRole('switch', { name: /Calm mode/ });
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await sw.click();
    await expect(page.locator('html')).not.toHaveAttribute('data-calm', 'on');
    await page.waitForTimeout(1500);
    expect(identicalPairs(await samples(page))).toBeLessThanOrEqual(1);
  });

  test('the caption still follows the voice with calm on', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('calm', 'on'));
    await page.goto('/lab/tele');
    await page.getByRole('button', { name: 'Play stub line' }).click();
    const seen = new Set<string>();
    const end = Date.now() + 3000;
    while (Date.now() < end) {
      for (const w of await page.locator('.cw[data-active="true"]').allTextContents()) seen.add(w);
      await page.waitForTimeout(50);
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });

  test('can be used from the keyboard', async ({ page }) => {
    await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'off'));
    await page.goto('/');
    const sw = page.getByRole('switch', { name: /Calm mode/ });
    await sw.focus();
    await page.keyboard.press('Space');
    await expect(sw).toHaveAttribute('aria-checked', 'true');
  });
});
