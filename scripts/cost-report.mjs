// Prints the measured cost per student for a course, straight from the cost log (task 16.3). Same code as the owner overview.
//   npm run cost-report -- TELE8
import pg from 'pg';
import { loadCostReport, TIER_LABEL } from '../lib/cost/report.ts';

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL in .env first. See README.');
  process.exit(1);
}
const classCode = (process.argv[2] ?? 'TELE8').toUpperCase();
const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  const course = (await pool.query('select id, title from courses where class_code = $1', [classCode])).rows[0];
  if (!course) throw new Error(`No course with class code ${classCode}.`);
  const r = await loadCostReport(pool, course.id);
  const gbp = (n) => `£${n.toFixed(n < 1 ? 3 : 2)}`;
  console.log(`${course.title} (${classCode})`);
  console.log(`Students: ${r.students}   Total: ${gbp(r.totalGbp)}   Per student: ${r.perStudentGbp === null ? 'n/a (no students)' : gbp(r.perStudentGbp)}`);
  for (const t of r.tiers) console.log(`  ${TIER_LABEL[t.tier].padEnd(15)} ${gbp(t.costGbp).padStart(8)}  ${String(Math.round(t.share * 100)).padStart(3)}%  ${t.calls} calls`);
  console.log(`Refused by a cap or rate limit: ${r.refused}. These are estimates from the cost log, not invoices.`);
} finally {
  await pool.end();
}
