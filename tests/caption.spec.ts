import { expect, test, type Page } from '@playwright/test';

// Task 18.3: the caption window shows the Spanish line with an English subtitle, highlights the
// spoken word as a stub timeline plays, and lets the student hide the subtitle.

const WORDS = ['Me', 'llamo', 'Tele', 'y', 'vivo', 'en', 'la', 'tele'];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

/**
 * Records every word that becomes highlighted, in order, from inside the page. Polling from the
 * test can miss a word when the machine is busy; a MutationObserver cannot.
 */
async function recordHighlights(page: Page) {
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { __seen: string[] }).__seen = seen;
    const read = () => {
      const active = document.querySelectorAll('.cw[data-active="true"]');
      if (active.length > 1) seen.push('MORE THAN ONE');
      const text = active[0]?.textContent;
      if (text && seen.at(-1) !== text) seen.push(text);
    };
    new MutationObserver(read).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-active'] });
  });
}
const highlighted = (page: Page) => page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);

test('shows the idle message with a subtitle, then the line, in Spanish with English beneath', async ({ page }) => {
  await page.goto('/lab/tele');
  await expect(page.getByTestId('caption-es')).toContainText('señal débil');
  await expect(page.getByTestId('caption-en')).toHaveText('weak signal');

  await page.getByRole('button', { name: 'Play stub line' }).click();
  await expect(page.getByTestId('caption-es')).toContainText('Me llamo Tele y vivo en la tele');
  await expect(page.getByTestId('caption-es')).toHaveAttribute('lang', 'es');
  await expect(page.getByTestId('caption-en')).toHaveText('My name is Tele and I live in the TV.');
});

test('highlights each word in order as the timeline plays, then clears', async ({ page }) => {
  await page.goto('/lab/tele');
  await recordHighlights(page);
  await page.getByRole('button', { name: 'Play stub line' }).click();
  await expect(page.getByTestId('caption-es')).toContainText('señal débil', { timeout: 10_000 }); // line finished

  expect(await highlighted(page)).toEqual(WORDS);
  await expect(page.locator('.cw[data-active="true"]')).toHaveCount(0);
});

test('the spoken word is marked by more than colour: inverted and underlined', async ({ page }) => {
  await page.goto('/lab/tele');
  await page.getByRole('button', { name: 'Play stub line' }).click();
  const word = page.locator('.cw[data-active="true"]');
  await expect(word.first()).toBeVisible();
  const style = await word.first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { underline: s.textDecorationLine, bg: s.backgroundColor, fg: s.color };
  });
  expect(style.underline).toContain('underline');
  expect(style.bg).not.toBe(style.fg);
  expect(style.bg).toBe('rgb(0, 0, 128)');
  expect(style.fg).toBe('rgb(255, 255, 255)');
});

test('the English subtitle can be hidden, stays hidden after a reload, and can be shown again', async ({ page }) => {
  await page.goto('/lab/tele');
  const toggle = page.getByRole('switch', { name: /English subtitle/ });
  await expect(toggle).toHaveAttribute('aria-checked', 'true');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('caption-en')).toHaveCount(0);
  await expect(page.getByTestId('caption-es')).toBeVisible(); // Spanish stays

  await page.reload();
  await expect(page.getByRole('switch', { name: /English subtitle/ })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('caption-en')).toHaveCount(0);

  await page.getByRole('switch', { name: /English subtitle/ }).click();
  await expect(page.getByTestId('caption-en')).toBeVisible();
});

test('the subtitle switch can be used from the keyboard', async ({ page }) => {
  await page.goto('/lab/tele');
  const toggle = page.getByRole('switch', { name: /English subtitle/ });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
});
