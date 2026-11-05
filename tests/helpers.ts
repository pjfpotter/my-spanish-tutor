import { expect, type Page } from '@playwright/test';

/** Creates an anonymous profile through the real sign-up screen and returns its recovery code. */
export async function signUp(page: Page): Promise<string> {
  await page.goto('/welcome');
  await page.getByRole('radio').first().check();
  await page.getByRole('checkbox', { name: 'football' }).check();
  await page.getByRole('button', { name: 'Create my profile' }).click();
  const code = (await page.getByTestId('recovery-code').textContent())!.trim();
  await page.getByRole('button', { name: /Let's go/ }).click();
  await expect(page).toHaveURL('/');
  return code;
}

/**
 * Opens the memorise phase for a signed-in student by doing what a student would, through the app's own
 * routes: confirm all five answers (write phase), and master all five questions by ear on two separate
 * sessions (understand phase). `answers` overrides the text confirmed for a question position.
 * Returns the question ids in order.
 */
export async function unlockMemorise(page: Page, answers: Record<number, string> = {}): Promise<string[]> {
  const { SEED_COURSE } = await import('../lib/course/seed');
  const html = await (await page.request.get('/phases/write')).text();
  const ids = [...html.matchAll(/\\?"id\\?":\\?"([0-9a-f-]{36})\\?",\\?"position\\?":(\d)/g)].map((m) => ({ id: m[1], position: Number(m[2]) }));
  const ordered = [...new Map(ids.map((q) => [q.position, q.id])).entries()].sort((a, b) => a[0] - b[0]);
  expect(ordered).toHaveLength(5);
  const [sessionA, sessionB] = [crypto.randomUUID(), crypto.randomUUID()];
  for (const [position, id] of ordered) {
    const text = answers[position] ?? SEED_COURSE.modelAnswers.find((a) => a.questionPosition === position && a.level === 'rock_solid')!.text;
    const saved = await page.request.post('/api/answers', { data: { questionId: id, text, confirm: true } });
    expect(saved.ok()).toBe(true);
    for (const sessionId of [sessionA, sessionA, sessionB]) {
      const r = await page.request.post('/api/attempts', { data: { itemId: id, outcome: 'correct', sessionId } });
      expect(r.ok()).toBe(true);
    }
  }
  return ordered.map(([, id]) => id);
}
