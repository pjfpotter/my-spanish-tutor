import { expect, test } from '@playwright/test';

// Tasks 4.8 and 4.9: the upload screen shows Tele reading the sheet with Spanish messages and English
// subtitles, tied to the real stages; a failure is plain English with a retry; reduced motion stops the
// movement but the words still change; the correction notice lists what was changed.
const lab = (q: string) => `/lab/sheet-upload?${q}`;

test('a successful upload: Spanish messages with English subtitles, a moving bar, then the notice', async ({ page }) => {
  await page.goto(lab('scenario=success&ms=700'));
  const es = page.getByTestId('message-es'), en = page.getByTestId('message-en'), bar = page.getByRole('progressbar');
  await expect(es).toContainText(/[A-Za-záéíóúñ¡]{3}/);
  await expect(en).not.toHaveText('');
  const first = await es.textContent();
  const start = Number(await bar.getAttribute('aria-valuenow'));
  await expect(page.locator('.up[data-stage="draft"]')).toBeVisible();
  expect(Number(await bar.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(start);
  await expect(page.locator('.up[data-state="ready"]')).toBeVisible({ timeout: 10_000 });
  await expect(es).toHaveText('¡Listo!');
  await expect(en).toHaveText('Ready!');
  await expect(bar).toHaveAttribute('aria-valuenow', '100');
  expect(first).not.toBe('¡Listo!');
  const notice = page.locator('.notice');
  await expect(notice).toContainText('3 corrections were made.');
  await expect(notice).toContainText('Spelling: “marrónes” is now “marrones”');
  await expect(notice).toContainText('Agreement: “un pared” is now “una pared”');
});

test('the messages change within a stage, and only move forward between stages', async ({ page }) => {
  await page.goto(lab('scenario=repair&ms=1500'));
  const es = page.getByTestId('message-es');
  const seen = new Set<string>();
  for (let i = 0; i < 6; i++) { seen.add((await es.textContent()) ?? ''); await page.waitForTimeout(450); }
  expect(seen.size).toBeGreaterThan(1);
  const bar = page.getByRole('progressbar');
  let last = 0;
  for (let i = 0; i < 12; i++) { const v = Number(await bar.getAttribute('aria-valuenow')); expect(v).toBeGreaterThanOrEqual(last); last = v; await page.waitForTimeout(400); }
});

test('a failure is plain English with a way to try again, and trying again works', async ({ page }) => {
  await page.goto(lab('scenario=fail-then-ok&ms=300'));
  const alert = page.locator('.up-problem');
  await expect(alert).toHaveText('Something went wrong while reading the sheet. Try again in a minute.');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.up[data-state="ready"]')).toBeVisible({ timeout: 10_000 });
  await expect(alert).toHaveCount(0);
});

test('an unreadable file offers a retry; a blocked document does not', async ({ page }) => {
  await page.goto(lab('scenario=unreadable&ms=300'));
  await expect(page.locator('.up-problem')).toContainText('could not be read as a Word document');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await page.goto(lab('scenario=blocked&ms=300'));
  await expect(page.locator('.up-problem')).toContainText('cannot be used with students');
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
});

test('the fallback says so, and the sheet is still ready', async ({ page }) => {
  await page.goto(lab('scenario=fallback&ms=300'));
  await expect(page.locator('.up[data-state="fallback"]')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.up-note')).toContainText('basic help');
});

test('reduced motion: no animation, but the messages and the bar still update', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(lab('scenario=success&ms=800'));
  const fill = page.locator('.up-fill');
  await expect(fill).toBeVisible();
  expect(await fill.evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
  const es = page.getByTestId('message-es');
  const first = await es.textContent();
  await expect.poll(async () => es.textContent(), { timeout: 5000 }).not.toBe(first);
  await expect(page.locator('.up[data-state="ready"]')).toBeVisible({ timeout: 10_000 });
});

test('the calm switch also stops the movement', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('calm', 'on'));
  await page.goto(lab('scenario=success&ms=800'));
  expect(await page.locator('.up-fill').evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
});

test('works on a phone: nothing runs off the screen', async ({ page }) => {
  await page.goto(lab('scenario=success&ms=300'));
  await expect(page.locator('.up[data-state="ready"]')).toBeVisible({ timeout: 10_000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('the notice says plainly when nothing needed correcting', async ({ page }) => {
  await page.goto(lab('scenario=success&ms=300&corrections=0'));
  await expect(page.locator('.notice')).toContainText('No corrections were needed.');
  await expect(page.locator('.notice li')).toHaveCount(0);
});
