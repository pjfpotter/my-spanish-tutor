import { expect, test, type Page } from '@playwright/test';

// Task 18.5: poking Tele plays a stock Spanish line with its English subtitle. It earns nothing:
// no coins, no progress, and no request to the server.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

/**
 * Records, from inside the page, every line shown in the caption (and whether a word was ever
 * highlighted). Polling from the test can miss a short line when the machine is busy.
 */
async function recordCaptions(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __lines: { es: string; en: string }[]; __wordSeen: boolean };
    w.__lines = [];
    w.__wordSeen = false;
    const read = () => {
      const es = document.querySelector('[data-testid="caption-es"]')?.textContent?.trim() ?? '';
      const en = document.querySelector('[data-testid="caption-en"]')?.textContent?.trim() ?? '';
      if (document.querySelector('.cw[data-active="true"]')) w.__wordSeen = true;
      if (es && !es.includes('señal débil') && w.__lines.at(-1)?.es !== es) w.__lines.push({ es, en });
    };
    new MutationObserver(read).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
  });
}
const lines = (page: Page) =>
  page.evaluate(() => (window as unknown as { __lines: { es: string; en: string }[] }).__lines);

test('poking Tele shows a Spanish line with an English subtitle, then returns to idle', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('caption-es')).toContainText('señal débil');
  await recordCaptions(page);

  await page.getByRole('button', { name: 'Poke Tele to hear a line' }).click();
  await expect.poll(async () => (await lines(page)).length).toBe(1); // the line started
  await expect(page.getByTestId('caption-es')).toContainText('señal débil', { timeout: 10_000 }); // and ended

  const [line] = await lines(page);
  expect(line.es.length).toBeGreaterThan(5);
  expect(line.en).not.toBe('');
  expect(line.en).not.toBe(line.es); // the spoken line is Spanish; English is the subtitle
  expect(await page.evaluate(() => (window as unknown as { __wordSeen: boolean }).__wordSeen)).toBe(true);
  await expect(page.getByTestId('caption-es')).toHaveAttribute('lang', 'es');
});

test('does not repeat the line just played', async ({ page }) => {
  await page.goto('/');
  await recordCaptions(page);
  const poke = page.getByRole('button', { name: 'Poke Tele to hear a line' });

  for (let i = 1; i <= 4; i++) {
    await poke.click();
    await expect.poll(async () => (await lines(page)).length).toBe(i);
    await expect(page.getByTestId('caption-es')).toContainText('señal débil', { timeout: 10_000 });
  }
  const shown = (await lines(page)).map((l) => l.es);
  for (let i = 1; i < shown.length; i++) expect(shown[i]).not.toBe(shown[i - 1]);
});

test('earns nothing: no requests to the server and nothing saved beyond display settings', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const requests: string[] = [];
  page.on('request', (r) => {
    // Reading a static clip is fine. Anything that writes, or calls the API, would be earning something.
    if (r.method() !== 'GET' || r.url().includes('/api/')) requests.push(`${r.method()} ${r.url()}`);
  });
  const before = await page.evaluate(() => JSON.stringify({ ...localStorage }));

  await page.getByRole('button', { name: 'Poke Tele to hear a line' }).click();
  await expect(page.getByTestId('caption-es')).not.toContainText('señal débil');
  await expect(page.getByTestId('caption-es')).toContainText('señal débil', { timeout: 10_000 });

  expect(requests).toEqual([]);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(before);
  await expect(page.getByTestId('readiness')).toHaveText('Readiness: 0%');
});

test('can be poked from the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Poke Tele to hear a line' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('caption-es')).not.toContainText('señal débil');
});
