import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OverviewView } from '../../app/owner/[token]/OverviewView';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { createProfile } from '../profile/profile';
import { loadOverview } from './overview';
import { studentRowKey } from './row-key';
import { sampleCost, sampleOverview } from './sample';

let db: Awaited<ReturnType<typeof newTestDb>>;
let courseId: string;
beforeAll(async () => {
  db = await newTestDb();
  courseId = (await insertTestCourse(db, 'DUP1')).courseId;
});
afterAll(() => db.close());

// Classes made before nicknames were kept unique already hold students with the same nickname. The overview must list them all.
describe('the overview with two students who share a nickname', () => {
  it('lists both students', async () => {
    for (let i = 0; i < 2; i++) await createProfile(db, { courseId, nickname: 'Sleepy Llama', interests: [] });
    await createProfile(db, { courseId, nickname: 'Fuzzy Taco', interests: [] });
    const data = await loadOverview(db, courseId);
    expect(data.students.map((s) => s.nickname).sort()).toEqual(['Fuzzy Taco', 'Sleepy Llama', 'Sleepy Llama']);
  });

  it('renders a row for every student, including both with the same nickname', () => {
    const data = sampleOverview();
    data.students = [
      { nickname: 'Sleepy Llama', stage: 'write', readiness: 0 },
      { nickname: 'Sleepy Llama', stage: 'memorise', readiness: 40 },
      { nickname: 'Fuzzy Taco', stage: 'ready', readiness: 100 },
    ];
    const html = renderToStaticMarkup(createElement(OverviewView, { data, cost: sampleCost(), sample: false }));
    expect((html.match(/data-testid="student-row"/g) ?? []).length).toBe(3);
    expect((html.match(/Sleepy Llama/g) ?? []).length).toBe(2);
  });

  // The server renderer does not warn about repeated keys (only the browser does), so the key itself is what is tested.
  it('gives every row its own key, even for the same nickname', () => {
    const nicknames = ['Sleepy Llama', 'Sleepy Llama', 'Fuzzy Taco', 'Sleepy Llama'];
    const keys = nicknames.map((n, i) => studentRowKey(i, n));
    expect(new Set(keys).size).toBe(keys.length);
    expect(studentRowKey(0, 'Sleepy Llama')).not.toBe(studentRowKey(1, 'Sleepy Llama'));
  });
});
