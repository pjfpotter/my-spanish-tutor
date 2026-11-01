import { expect, test, type Page } from '@playwright/test';

// Task 18.2: Tele renders all six feelings and idles without console errors.
//
// The picture always has a little animated static, so exact pixels differ between frames. The
// tests compare a small downscaled copy of the canvas and require each change to be larger than
// the frame-to-frame noise measured on the same state.

const FEELINGS = ['Joy', 'Sadness', 'Anger', 'Fear', 'Surprise', 'Disgust'];

/** A 40x43 average of the canvas, as a flat list of RGB values. */
async function sample(page: Page): Promise<number[]> {
  await page.waitForTimeout(1500); // let the feeling settle
  return page.locator('canvas').evaluate((c) => {
    const small = document.createElement('canvas');
    small.width = 40;
    small.height = 43;
    const ctx = small.getContext('2d')!;
    ctx.drawImage(c as HTMLCanvasElement, 0, 0, 40, 43);
    const { data } = ctx.getImageData(0, 0, 40, 43);
    const out: number[] = [];
    for (let i = 0; i < data.length; i += 4) out.push(data[i], data[i + 1], data[i + 2]);
    return out;
  });
}
const diff = (a: number[], b: number[]) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;

test.beforeEach(async ({ page }) => {
  // Calm mode, so random glances, glitches and breathing do not move the picture.
  await page.addInitScript(() => localStorage.setItem('calm', 'on'));
});

test('renders a non-blank picture and idles without console errors', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  page.on('pageerror', (e) => problems.push(e.message));

  await page.goto('/lab/tele');
  const picture = await sample(page);
  await page.waitForTimeout(2500); // power-on, blinks and idle glances

  expect(picture.filter((v) => v > 30).length).toBeGreaterThan(picture.length * 0.5);
  expect(problems).toEqual([]);
});

test('shows a different picture for each of the six feelings, and names the feeling in words', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('/lab/tele');

  const calm = await sample(page);
  const noise = diff(calm, await sample(page));

  const pictures: Record<string, number[]> = {};
  for (const name of FEELINGS) {
    const button = page.getByRole('button', { name: new RegExp(`^${name}`) });
    await button.click();
    await expect(page.getByTestId('feeling-readout')).toContainText(name);
    pictures[name] = await sample(page);
    expect(diff(pictures[name], calm), `${name} should differ from calm`).toBeGreaterThan(noise + 1);
    await button.click(); // back to calm before the next one
  }

  for (const a of FEELINGS) {
    for (const b of FEELINGS) {
      if (a < b) expect(diff(pictures[a], pictures[b]), `${a} should differ from ${b}`).toBeGreaterThan(noise + 0.5);
    }
  }
  expect(problems).toEqual([]);
});

test('shows a blend, the speaking glow and the question face', async ({ page }) => {
  await page.goto('/lab/tele');
  const calm = await sample(page);
  const noise = diff(calm, await sample(page));

  await page.getByRole('button', { name: /^Joy/ }).click();
  const joy = await sample(page);
  await page.getByRole('button', { name: /^Sadness/ }).click();
  await expect(page.getByTestId('feeling-readout')).toContainText('Joy (alegría) and Sadness (tristeza)');
  const blend = await sample(page);
  expect(diff(blend, joy)).toBeGreaterThan(noise + 0.5);
  await page.getByRole('button', { name: /^Joy/ }).click();
  await page.getByRole('button', { name: /^Sadness/ }).click();

  await page.getByRole('button', { name: 'Quiet' }).click();
  expect(diff(await sample(page), calm)).toBeGreaterThan(noise + 0.3);
  await page.getByRole('button', { name: 'Speaking' }).click();

  await page.getByRole('button', { name: 'Question face' }).click();
  expect(diff(await sample(page), calm)).toBeGreaterThan(noise + 0.3);
});
