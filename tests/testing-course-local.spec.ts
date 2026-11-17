import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { loadTestingCourse, TESTING_DATA_DIR } from '../lib/course/testing-course';
import { resolveBuilderQuestion } from '../lib/sheets/question-match';
import { buildBuilder } from '../lib/sheets/builder';
import { parseText, prepare } from '../lib/sheets/engine';
import { toSelection } from '../lib/sheets/selection';
import { questionIdsInOrder, signUp } from './helpers';

// Local only (course-builder-per-question). The five-builder testing course is built from teachers' sheets that are
// never committed, so this runs only when that data is there and the server was started with TESTING_COURSE_LOCAL=1:
//   TESTING_COURSE_LOCAL=1 npx playwright test tests/testing-course-local.spec.ts
const ready = existsSync(path.join(process.cwd(), TESTING_DATA_DIR, 'course.json')) && process.env.TESTING_COURSE_LOCAL === '1';
test.skip(!ready, 'needs the local testing course data and TESTING_COURSE_LOCAL=1');

const course = ready ? loadTestingCourse().course : loadTestingCourse('/nonexistent').course;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('calm') ?? localStorage.setItem('calm', 'on'));
});

test('each question shows only its own builder, and a model answer confirms and persists through a reload', async ({ page }) => {
  await signUp(page, course.classCode);
  const ids = new Map(await questionIdsInOrder(page));
  for (const q of course.questions) {
    await page.goto(`/phases/write?question=${q.position}`);
    await expect(page.getByTestId('no-sheet-for-question')).toHaveCount(0);
    // The sheet is that question's own builder: its title is the question, and no other question's text is on the screen.
    await expect(page.locator('.ws-title h2').first()).toHaveText(q.spanish);
    const body = (await page.locator('main').innerText()).toLowerCase();
    for (const other of course.questions.filter((x) => x.position !== q.position)) expect(body, `question ${q.position} shows question ${other.position}`).not.toContain(other.spanish.toLowerCase().replace(/[¿?]/g, ''));

    // Confirm the first model answer the way the write screen would, then check it is kept.
    const b = course.builders.find((x) => x.key === q.builder)!;
    const B = prepare(buildBuilder(b.key, b.sheet, b.interpretation));
    const link = resolveBuilderQuestion(b.interpretation, q);
    const Q = link.ok && link.index !== null ? B.questions[link.index] : undefined;
    const text = course.modelAnswers.find((a) => a.questionPosition === q.position)!.text;
    const read = parseText(B, text, Q);
    const id = ids.get(q.position);
    expect(id, `question ${q.position} id`).toBeTruthy();
    const res = await page.request.post('/api/answers', { data: { questionId: id, selection: toSelection(read.ans), confirm: true } });
    expect(res.ok(), await res.text()).toBe(true);
  }
  await page.goto('/phases/write');
  await expect(page.locator('[data-confirmed="true"]')).toHaveCount(5);
});
