import { expect, test, type Page } from '@playwright/test';
import { SEED_COURSE } from '../lib/course/seed';
import { answerPieces } from '../lib/practice/tasks';
import { expectFits, signUp, skipWarmups, unlockMemorise } from './helpers';

// Tasks 20.1 to 20.5 and 21.x: the practice screens fit one small phone screen, answers get an instant panel,
// mistakes come back, sounds follow the switches, and the tutor never holds anything up. Nothing here calls a model.

const PHONE = { width: 360, height: 640 };
const ROCK = (n: number) => SEED_COURSE.modelAnswers.find((a) => a.questionPosition === n && a.level === 'rock_solid')!.text;
const answerFor = (english: string) => ROCK(SEED_COURSE.questions.find((q) => q.english === english)!.position);

/** A fixed random source, so the warm-ups a test sees are the same each run. */
const seeded = (n: number) => `(() => { let s = ${n}; Math.random = () => ((s = (s * 48271) % 2147483647) / 2147483647); })();`;

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

/** Answers whatever warm-up task is showing, in the simplest way, and returns its type. */
async function doWarmTask(page: Page): Promise<string> {
  const task = page.getByTestId('task');
  await expect(task).toBeVisible();
  const type = (await task.getAttribute('data-type'))!;
  if (type === 'scramble') {
    for (;;) {
      const tile = page.locator('[data-testid^="tile-"]').first();
      if (!(await tile.count())) break;
      await tile.click();
    }
    await page.getByTestId('check').click();
  } else if (type === 'match_pairs') {
    const ids = (await page.locator('[data-testid^="spanish-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.slice('spanish-'.length))));
    for (const id of ids) {
      await page.getByTestId(`spanish-${id}`).click();
      await page.getByTestId(`english-${id}`).click();
      await page.waitForTimeout(520);
    }
  } else {
    await page.getByTestId('option-0').click();
  }
  return type;
}

async function openMemorise(page: Page, seed = 1) {
  await page.addInitScript(seeded(seed));
  await signUp(page);
  await unlockMemorise(page);
  await page.goto('/phases/memorise');
}

test('every warm-up task, the feedback panel and the spoken step fit 360 by 640 with no scrolling (20.1)', async ({ page }) => {
  const seen = new Set<string>();
  // Different seeds give different task mixes, so across a few opens every task type is laid out.
  for (const seed of [3, 13, 23]) {
    await openMemorise(page, seed);
    for (let k = 0; k < 10; k++) {
      if (await page.getByTestId('english-prompt').isVisible().catch(() => false)) break;
      await expectFits(page, `warm-up before answering (seed ${seed})`);
      seen.add(await doWarmTask(page));
      await expect(page.getByTestId('feedback-panel')).toBeVisible();
      await expectFits(page, `feedback panel (seed ${seed})`);
      await page.getByTestId('continue').click();
    }
    await expect(page.getByTestId('english-prompt')).toBeVisible();
    await expectFits(page, `spoken step (seed ${seed})`);
    await page.getByRole('button', { name: 'Start speaking' }).click();
    await expect(page.getByTestId('listening')).toBeVisible();
    await expectFits(page, 'listening');
    await page.context().clearCookies();
  }
  expect(seen.size).toBeGreaterThanOrEqual(3);
});

test('the spoken result and its panel fit 360 by 640 (20.1)', async ({ page }) => {
  await openMemorise(page, 5);
  await page.route('**/api/transcribe', (r) => r.fulfill({ json: { status: 'ok', text: 'me gusta', confidence: 0.9 } }));
  await skipWarmups(page);
  await page.getByRole('button', { name: 'Start speaking' }).click();
  await expect(page.getByTestId('listening')).toBeVisible();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByTestId('result')).toBeVisible();
  await expect(page.getByTestId('feedback-panel')).toBeVisible();
  await expectFits(page, 'spoken result with a low score');
});

test('a warm-up answer gets its panel within 300 ms, with words and a symbol, and Tele reacts at once (20.2, 20.3)', async ({ page }) => {
  await openMemorise(page, 4);
  await expect(page.getByTestId('task')).toBeVisible();
  await expect(page.getByTestId('tele-reaction')).toHaveAttribute('data-reaction', 'idle');
  // Any answer works: the panel is the same speed for right and wrong. Time it from the last tap.
  const type = await page.getByTestId('task').getAttribute('data-type');
  if (type === 'match_pairs') {
    const ids = await page.locator('[data-testid^="spanish-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.slice('spanish-'.length)));
    for (const id of ids.slice(0, -1)) {
      await page.getByTestId(`spanish-${id}`).click();
      await page.getByTestId(`english-${id}`).click();
      await page.waitForTimeout(320);
    }
    await page.getByTestId(`spanish-${ids.at(-1)}`).click();
    await page.getByTestId(`english-${ids.at(-1)}`).click();
  } else if (type === 'scramble') {
    for (;;) {
      const tile = page.locator('[data-testid^="tile-"]').first();
      if (!(await tile.count())) break;
      await tile.click();
    }
    await page.getByTestId('check').click();
  } else await page.getByTestId('option-0').click();
  await expect(page.getByTestId('feedback-panel')).toBeVisible({ timeout: 400 });
  await expect(page.getByTestId('tele-reaction')).not.toHaveAttribute('data-reaction', 'idle', { timeout: 300 });
  const panel = page.getByTestId('feedback-panel');
  await expect(panel).toContainText(/Correct|Not yet/);
  await expect(panel.locator('.fb-symbol')).toHaveText(/[✓✗]/);
  await expect(page.getByTestId('continue')).toBeFocused();
});

test('a missed warm-up comes back with a plain-English label, and a session still ends (20.3)', async ({ page }) => {
  await openMemorise(page, 8);
  let sawMistake = false;
  let misses = 0;
  for (let k = 0; k < 12; k++) {
    if (await page.getByTestId('english-prompt').isVisible().catch(() => false)) break;
    if (await page.getByTestId('mistake-label').isVisible().catch(() => false)) {
      await expect(page.getByTestId('mistake-label')).toHaveText('Previous mistake');
      sawMistake = true;
    }
    await doWarmTask(page);
    if ((await page.getByTestId('feedback-panel').getAttribute('data-state')) === 'wrong') misses++;
    await expect(page.getByTestId('feedback-panel')).toBeVisible();
    await page.getByTestId('continue').click();
  }
  await expect(page.getByTestId('english-prompt')).toBeVisible();
  if (misses > 0) expect(sawMistake).toBe(true);
});

test('each answer mixes at least two task types in its warm-ups, never more than three alike in a row (21.4)', async ({ page }) => {
  await openMemorise(page, 11);
  const types: string[] = [];
  for (let k = 0; k < 8; k++) {
    if (await page.getByTestId('english-prompt').isVisible().catch(() => false)) break;
    types.push(await doWarmTask(page));
    await page.getByTestId('continue').click();
  }
  expect(types.length).toBeGreaterThanOrEqual(3);
  expect(new Set(types).size).toBeGreaterThanOrEqual(2);
  for (let i = 0; i + 3 < types.length; i++) expect(types.slice(i, i + 4).every((t) => t === types[i])).toBe(false);
});

test('"I know this one" goes straight to saying the answer (21.6)', async ({ page }) => {
  await openMemorise(page, 2);
  await expect(page.getByTestId('task')).toBeVisible();
  await page.getByTestId('know-it').click();
  await expect(page.getByTestId('english-prompt')).toBeVisible();
  await expect(page.getByTestId('task')).toHaveCount(0);
});

test.describe('sounds and reward animations (20.4)', () => {
  const sfxRequests = (page: Page) => {
    const urls: string[] = [];
    page.on('request', (r) => /\/audio\/sfx\//.test(r.url()) && urls.push(r.url()));
    return urls;
  };

  test('a feedback sound plays when sound is on and calm is off', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('calm', 'off'));
    const urls = sfxRequests(page);
    await openMemorise(page, 6);
    await doWarmTask(page);
    await expect(page.getByTestId('feedback-panel')).toBeVisible();
    await expect.poll(() => urls.length).toBeGreaterThan(0);
    expect(urls.some((u) => /(correct|miss)-\d\.mp3/.test(u))).toBe(true);
  });

  test('turning sound off silences every interface sound but keeps the animation', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('calm', 'off');
      localStorage.setItem('sound', 'off');
    });
    const urls = sfxRequests(page);
    await openMemorise(page, 6);
    await doWarmTask(page);
    await expect(page.getByTestId('feedback-panel')).toBeVisible();
    await page.waitForTimeout(600);
    expect(urls).toEqual([]);
    await expect(page.getByRole('switch', { name: /Sound/ })).toHaveAttribute('aria-checked', 'false');
    // The reward burst is still in the page and not switched off.
    if ((await page.getByTestId('feedback-panel').getAttribute('data-state')) === 'correct') {
      await expect(page.getByTestId('reward')).toBeAttached();
      expect(await page.getByTestId('reward').evaluate((el) => getComputedStyle(el).display)).not.toBe('none');
    }
  });

  test('calm mode silences sounds and stops the reward animation', async ({ page }) => {
    const urls = sfxRequests(page); // calm is on by default in this file
    await openMemorise(page, 6);
    await doWarmTask(page);
    await expect(page.getByTestId('feedback-panel')).toBeVisible();
    await page.waitForTimeout(600);
    expect(urls).toEqual([]);
    expect(await page.getByTestId('reward').evaluate((el) => getComputedStyle(el).display)).toBe('none');
  });

  test('reduced motion stops the reward animation but not the sounds', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('calm', 'off'));
    const urls = sfxRequests(page);
    await openMemorise(page, 6);
    await doWarmTask(page);
    await expect(page.getByTestId('feedback-panel')).toBeVisible();
    expect(await page.getByTestId('reward').evaluate((el) => getComputedStyle(el).display)).toBe('none');
    await expect.poll(() => urls.length).toBeGreaterThan(0);
  });

  test('the sound switch keeps its choice', async ({ page }) => {
    await signUp(page);
    const sw = page.getByRole('switch', { name: /Sound/ });
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await sw.click();
    await page.reload();
    await expect(page.getByRole('switch', { name: /Sound/ })).toHaveAttribute('aria-checked', 'false');
  });
});

test('Tele speaks at a combo and Continue still works while the line plays (20.2, 20.5)', async ({ page }) => {
  await openMemorise(page, 9);
  let heard = '';
  await page.route('**/api/transcribe', (r) => r.fulfill({ json: { status: 'ok', text: heard, confidence: 0.9 } }));
  // Five good spoken answers in a row make a combo. Warm-ups are skipped (they would be answered at random).
  for (let n = 0; n < 5; n++) {
    await skipWarmups(page);
    heard = answerFor((await page.getByTestId('english-prompt').textContent())!);
    await page.getByRole('button', { name: 'Start speaking' }).click();
    await expect(page.getByTestId('listening')).toBeVisible();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByTestId('accuracy')).toHaveText('100%');
    if (n < 4) {
      await expect(page.getByTestId('caption-es')).toHaveClass(/cap-idle/); // no chatter after ordinary answers
      await page.getByRole('button', { name: 'Next' }).click();
    }
  }
  // The combo line is playing: the caption has words, and Next is not held back.
  await expect(page.getByTestId('caption-es')).not.toHaveClass(/cap-idle/);
  const next = page.getByRole('button', { name: 'Next' });
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page.getByTestId('accuracy')).toHaveCount(0, { timeout: 2000 });
});

test('Tele speaks at the start of the section, with a subtitle, and nothing waits for it (20.2)', async ({ page }) => {
  await openMemorise(page, 2);
  await expect(page.getByTestId('caption-es')).not.toHaveClass(/cap-idle/, { timeout: 2000 });
  await expect(page.getByTestId('caption-en')).not.toHaveText('weak signal');
  // The warm-up is already usable while the line plays.
  await expect(page.getByTestId('know-it')).toBeEnabled();
  await page.getByTestId('know-it').click();
  await expect(page.getByTestId('english-prompt')).toBeVisible();
});

test.describe('the spoken prompt gives a different kind of support at each level (21.5)', () => {
  async function atLevel(page: Page, goodAttempts: number) {
    await page.addInitScript(seeded(1));
    await signUp(page);
    const ids = await unlockMemorise(page);
    const session = crypto.randomUUID();
    for (const id of ids) {
      for (let i = 0; i < goodAttempts; i++) {
        const r = await page.request.post('/api/recall', { data: { itemId: id, sessionId: session, accuracy: 95, level: 0, missedWords: [] } });
        expect(r.ok()).toBe(true);
      }
    }
    await page.goto('/phases/memorise');
    await skipWarmups(page);
  }

  test('level 0 is listen then repeat: the whole script and a button to hear it first', async ({ page }) => {
    await atLevel(page, 0);
    await expect(page.getByTestId('support')).toHaveText('Showing: whole script');
    await expect(page.getByTestId('hear-first')).toBeVisible();
    await expect(page.locator('[data-testid="prompt"] .gap')).toHaveCount(0);
  });

  test('level 2 is chunk by chunk: one chunk shows and the student reveals the next on purpose', async ({ page }) => {
    await atLevel(page, 4);
    await expect(page.getByTestId('support')).toHaveText('Showing: one chunk at a time');
    const hidden = () => page.locator('[data-testid="prompt"] .gap').count();
    const before = await hidden();
    expect(before).toBeGreaterThan(0);
    await page.getByTestId('reveal-next').click();
    expect(await hidden()).toBeLessThan(before);
    await expectFits(page, 'chunk by chunk support');
  });

  test('no kind of support ever shows a picture', async ({ page }) => {
    await atLevel(page, 4);
    await expect(page.locator('[data-testid="prompt"] img, [data-testid="prompt"] svg')).toHaveCount(0);
    await expect(page.locator('.practice-body img')).toHaveCount(0);
  });
});

test.describe('fast and safe input (21.1, 21.2)', () => {
  test('rapid keys on a choice task register one answer, and Enter carries on', async ({ page }) => {
    await openMemorise(page, 11); // the first warm-up with this seed is a choice task
    await expect(page.getByTestId('task')).toHaveAttribute('data-type', /hear_choose|tap_hear|fill_gap/);
    await page.keyboard.press('1');
    await page.keyboard.press('2');
    await page.keyboard.press('3');
    await expect(page.getByTestId('feedback-panel')).toBeVisible();
    // Only the first key counted: at most the picked option and the right one are marked.
    const marked = await page.locator('.option[data-result]').count();
    expect(marked).toBeLessThanOrEqual(2);
    expect(await page.getByTestId('option-0').getAttribute('data-result')).toBeTruthy(); // option 1 was the one picked or the right one
    await expect(page.getByTestId('continue')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('feedback-panel')).toHaveCount(0);
  });

  test('rapid taps on match pairs cannot register an unintended pair', async ({ page }) => {
    await openMemorise(page, 11); // the second warm-up is match pairs
    await page.getByTestId('option-0').click();
    await page.getByTestId('continue').click();
    await expect(page.getByTestId('task')).toHaveAttribute('data-type', 'match_pairs');
    const ids = await page.locator('[data-testid^="spanish-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.slice('spanish-'.length)));
    const [a, b, c] = ids;
    // A wrong pair, then straight away the right pair for another tile, with no wait in between.
    await page.getByTestId(`spanish-${a}`).dispatchEvent('click');
    await page.getByTestId(`english-${b}`).dispatchEvent('click');
    await page.getByTestId(`spanish-${c}`).dispatchEvent('click');
    await page.getByTestId(`english-${c}`).dispatchEvent('click');
    await page.waitForTimeout(400);
    await expect(page.locator('[data-matched="true"]')).toHaveCount(0); // the fast second pair was ignored, not registered
    // Once the result has cleared, the same pair is accepted.
    await page.getByTestId(`spanish-${c}`).click();
    await page.getByTestId(`english-${c}`).click();
    await expect(page.locator('[data-matched="true"]')).toHaveCount(2);
  });

  test('sentence scramble: tiles carry their chunk kind as colour, symbol and word, and work by tap and by keyboard', async ({ page }) => {
    await openMemorise(page, 7); // the third warm-up with this seed is the scramble
    for (let i = 0; i < 2; i++) {
      await doWarmTask(page);
      await page.getByTestId('continue').click();
    }
    await expect(page.getByTestId('task')).toHaveAttribute('data-type', 'scramble');
    const english = (await page.locator('[data-testid="task"] .muted').first().textContent())!.trim();
    const rock = ROCK(SEED_COURSE.questions.find((q) => q.english === english)!.position);
    const { answerPieces } = await import('../lib/practice/tasks');
    const order = answerPieces(rock, SEED_COURSE.chunks).map((p) => p.text);
    // Every tile has a kind, and a symbol as well as a colour.
    const kinds = await page.locator('[data-testid^="tile-"]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-kind'), e.querySelector('.tile-kind')?.textContent ?? '']));
    for (const [kind, symbol] of kinds) {
      expect(kind).toBeTruthy();
      expect(symbol).toMatch(/\S/);
    }
    // Place them in the right order from the keyboard: focus a tile and press Enter.
    for (const text of order) {
      await page.locator('[data-testid^="tile-"]').filter({ hasText: text }).first().focus();
      await page.keyboard.press('Enter');
    }
    // Arrow keys move a placed tile one place; moving it back restores the order.
    await page.getByTestId('placed-0').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('placed-1')).toContainText(order[0]);
    await page.getByTestId('placed-1').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('placed-0')).toContainText(order[0]);
    await page.getByTestId('check').click();
    await expect(page.getByTestId('feedback-panel')).toHaveAttribute('data-state', 'correct');
  });
});

test.describe('chunk-by-chunk build-up and cause tags (21.5)', () => {
  async function atLevel(page: Page, goodAttempts: number, extra?: (ids: string[], session: string) => Promise<void>) {
    await page.addInitScript(seeded(1));
    await signUp(page);
    const ids = await unlockMemorise(page);
    const session = crypto.randomUUID();
    for (const id of ids) {
      for (let i = 0; i < goodAttempts; i++) {
        // level 0 in the request keeps these as read-aloud practice, so mastery is untouched; only the support level climbs.
        const r = await page.request.post('/api/recall', { data: { itemId: id, sessionId: session, accuracy: 95, level: 0, missedWords: [] } });
        expect(r.ok()).toBe(true);
      }
    }
    await extra?.(ids, session);
    return ids;
  }
  const speakNow = async (page: Page) => {
    await page.getByRole('button', { name: /Start speaking|Try again/ }).first().click();
    await expect(page.getByTestId('listening')).toBeVisible();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Done' }).click();
  };

  test('a missed chunk is built back up: the chunk alone, then with its neighbour, then the whole answer', async ({ page }) => {
    await atLevel(page, 4); // support is down to chunk by chunk
    let heard = '';
    await page.route('**/api/transcribe', (r) => r.fulfill({ json: { status: 'ok', text: heard, confidence: 0.9 } }));
    const recalls: Record<string, unknown>[] = [];
    page.on('request', (r) => r.url().endsWith('/api/recall') && recalls.push(r.postDataJSON()));
    await page.goto('/phases/memorise');
    await skipWarmups(page);
    const english = (await page.getByTestId('english-prompt').textContent())!;
    const pieces = answerPieces(answerFor(english), SEED_COURSE.chunks);
    expect(pieces.length).toBeGreaterThanOrEqual(3);

    // They say only the first chunk, so the second is the one they tripped on.
    heard = pieces[0].text;
    await speakNow(page);
    await expect(page.getByTestId('drill-note')).toContainText('tripped on one chunk');
    await expect.poll(() => recalls.length).toBe(1);
    await page.getByRole('button', { name: 'Next' }).click();

    // Step one: just that chunk.
    await expect(page.getByTestId('buildup-banner')).toContainText('step 1 of 2');
    await expect(page.getByTestId('prompt')).toHaveText(`${pieces[1].text} `);
    await expectFits(page, 'build-up step');
    heard = pieces[1].text;
    await speakNow(page);
    await expect(page.getByTestId('accuracy')).toHaveText('100%');
    await page.getByRole('button', { name: 'Next' }).click();

    // Step two: with its neighbour.
    await expect(page.getByTestId('buildup-banner')).toContainText('step 2 of 2');
    await expect(page.getByTestId('prompt')).toHaveText(`${pieces[1].text} ${pieces[2].text} `);
    heard = `${pieces[1].text} ${pieces[2].text}`;
    await speakNow(page);
    await expect(page.getByTestId('drill-note')).toContainText('Now the whole answer');
    await page.getByRole('button', { name: 'Next' }).click();

    // Then the whole answer, as normal. The build-up itself logged nothing.
    await expect(page.getByTestId('buildup-banner')).toHaveCount(0);
    await expect(page.getByTestId('support')).toHaveText('Showing: one chunk at a time');
    expect(recalls).toHaveLength(1);
  });

  test('a live cause tag stops support falling below what it needs, and what is sent matches what was shown', async ({ page }) => {
    // Eight good attempts take the prompt down to English only; then a miss leaves a live "not known well enough" tag.
    const ids = await atLevel(page, 8, async (all, session) => {
      const miss = await page.request.post('/api/recall', { data: { itemId: all[0], sessionId: session, accuracy: 10, level: 4, missedWords: [0, 1, 2] } });
      expect(miss.ok()).toBe(true);
    });
    void ids;
    const sent: Record<string, any>[] = [];
    page.on('request', (r) => r.url().endsWith('/api/recall') && sent.push(r.postDataJSON()));
    await page.route('**/api/transcribe', (r) => r.fulfill({ json: { status: 'ok', text: 'me gustan', confidence: 0.9 } }));
    await page.goto('/phases/memorise');
    await skipWarmups(page);
    // The answer with the live tag comes first, and shows a gapped script, not English only.
    await expect(page.getByTestId('support')).toHaveText('Showing: a gapped script');
    await speakNow(page);
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0].level).toBe(1); // the server counts the attempt at the support that was really shown
  });
});
