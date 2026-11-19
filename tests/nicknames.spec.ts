import { expect, test } from '@playwright/test';
import { SEED_COURSE } from '../lib/course/seed';
import { isNicknameShape } from '../lib/profile/profile';
import { SEED_CLASS_CODE } from './helpers';

// Unique class nicknames (change unique-class-nicknames): offered when the class is found, never typed, and never one a classmate has.
const join = (request: import('@playwright/test').APIRequestContext, code: string) => request.post('/api/join', { data: { code } });
const create = (request: import('@playwright/test').APIRequestContext, classCode: string, nickname: string) =>
  request.post('/api/profile', { data: { classCode, privacyAcknowledged: true, nickname, interests: [] } });

test('options come with the class: six nicknames made from the lists, and none before the class is found', async ({ request }) => {
  const bad = await join(request, 'NOPE99');
  expect(bad.status()).toBe(404);
  expect(await bad.json()).not.toHaveProperty('nicknames');

  const res = await join(request, SEED_CLASS_CODE);
  expect(res.status()).toBe(200);
  const { nicknames, course } = (await res.json()) as { nicknames: string[]; course: { title: string } };
  expect(course.title).toBeTruthy();
  expect(nicknames).toHaveLength(6);
  expect(new Set(nicknames).size).toBe(6);
  for (const n of nicknames) expect(isNicknameShape(n), n).toBe(true);
});

test('a nickname a classmate has is refused with fresh options, and is fine in another class', async ({ request }) => {
  const [mine] = ((await (await join(request, SEED_CLASS_CODE)).json()) as { nicknames: string[] }).nicknames;
  expect((await create(request, SEED_CLASS_CODE, mine)).status()).toBe(200);

  // The same nickname in the same class is refused, plainly, with six new options that leave out the taken one.
  const again = await create(request, SEED_CLASS_CODE, mine);
  expect(again.status()).toBe(409);
  const body = (await again.json()) as { error: string; nicknames: string[] };
  expect(body.error).toContain('just taken');
  expect(body.nicknames).toHaveLength(6);
  expect(body.nicknames).not.toContain(mine);

  // Not taken again, and a made-up name is still an ordinary 400, not a 409.
  const offered = await join(request, SEED_CLASS_CODE);
  expect(((await offered.json()) as { nicknames: string[] }).nicknames).not.toContain(mine);
  expect((await create(request, SEED_CLASS_CODE, 'Alex')).status()).toBe(400);

  // Another class has its own nicknames.
  expect((await create(request, SEED_COURSE.classCode, mine)).status()).toBe(200);
});

test('in the sign-up form, a nickname taken while choosing is replaced by fresh options and the student picks again', async ({ page }) => {
  await page.goto('/welcome');
  await page.getByRole('textbox').fill(SEED_CLASS_CODE);
  await page.getByRole('button', { name: 'Find my class' }).click();
  await page.getByRole('checkbox', { name: 'I have read this' }).check();
  await page.getByRole('button', { name: 'Carry on' }).click();
  const values = () => page.locator('input[name="nickname"]').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  const first = await values();
  expect(first).toHaveLength(6);

  // A classmate takes the nickname the student is about to pick.
  await page.getByRole('radio').first().check();
  expect((await create(page.request, SEED_CLASS_CODE, first[0])).status()).toBe(200);
  await page.getByRole('button', { name: 'Create my profile' }).click();

  await expect(page.locator('p.error')).toContainText('just taken');
  const fresh = await values();
  expect(fresh).toHaveLength(6);
  expect(fresh).not.toContain(first[0]);
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(0); // they have to pick again
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Create my profile' }).click();
  await expect(page.getByTestId('recovery-code')).toBeVisible();
});
