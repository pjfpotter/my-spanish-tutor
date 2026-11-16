import { expect, test } from '@playwright/test';
import { sheetAnswer, signUp, unlockAutomate } from './helpers';

// El Pasillo as the fourth step: it opens on the student's own answers, and clearing the top-rung doors is stored as
// timed attempts (numbers only), which is what makes the student test-ready. A stand-in recogniser is fed the words.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    localStorage.setItem('calm', 'on');
    class R { onstart: any; onresult: any; constructor() { w.__rec = this; } start() { setTimeout(() => this.onstart?.(), 10); } stop() {} abort() {} }
    w.SpeechRecognition = R;
    w.__heard = '';
    w.__say = (text: string) => { w.__heard = `${w.__heard} ${text}`.trim(); w.__rec.onresult({ results: [Object.assign([{ transcript: w.__heard }], { isFinal: false })] }); };
  });
});

test('the fourth step is El Pasillo on the student\'s own answers, and the top-rung doors are recorded as attempts', async ({ page }) => {
  test.setTimeout(180_000);
  await signUp(page);
  await unlockAutomate(page);
  const posted: { itemId: string; assisted: boolean; accuracy: number }[] = [];
  page.on('request', (r) => { if (r.url().endsWith('/api/respond') && r.method() === 'POST') posted.push(r.postDataJSON()); });

  await page.goto('/phases/automate');
  await expect(page.getByTestId('dc-title')).toContainText('Doors come from your own answers');
  await page.getByTestId('dc-start').click();
  const game = page.getByTestId('dreamcore');
  for (let door = 0; door < 12; door++) {
    await expect(game).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 });
    await page.evaluate((t) => (window as any).__say(t), sheetAnswer(0));
    await expect(game).not.toHaveAttribute('data-phase', 'ready');
  }
  await expect(page.getByTestId('dc-result')).toBeVisible({ timeout: 30_000 });
  // Two top-rung doors, each stored as one unassisted attempt with numbers only.
  expect(posted).toHaveLength(2);
  for (const p of posted) {
    expect(p.assisted).toBe(false);
    expect(p.accuracy).toBeGreaterThanOrEqual(80);
    expect(Object.keys(p).sort()).toEqual(['accuracy', 'assisted', 'blank', 'itemId', 'repeats', 'responseTimeMs', 'sessionId', 'speed']);
  }
});

test('the lab copy of El Pasillo records nothing', async ({ page }) => {
  const posted: string[] = [];
  page.on('request', (r) => { if (r.url().endsWith('/api/respond')) posted.push(r.url()); });
  await page.goto('/lab/dreamcore');
  await page.getByTestId('dc-start').click();
  await expect(page.getByTestId('dreamcore')).toHaveAttribute('data-phase', 'ready', { timeout: 20_000 });
  expect(posted).toEqual([]);
});
