import type { ReactNode } from 'react';
import { TIER_LABEL, type CostReport } from '../../../lib/cost/report';
import type { OverviewData, Stage } from '../../../lib/overview/overview';
import { STAGES } from '../../../lib/overview/overview';
import { Win } from '../../components/Win';
import { CheekySwitch } from './CheekySwitch';

const STAGE_LABEL: Record<Stage, string> = { write: 'Writing answers', understand: 'Understanding questions', memorise: 'Saying from memory', automate: 'Answering fast', ready: 'Test ready' };
const TAG_LABEL: Record<string, string> = {
  too_fast: 'Too fast to catch', word_not_known: 'Word not known', sound_spelling_gap: 'Sound and spelling gap', thrown_by_context: 'Thrown by context',
  not_known_well_enough: 'Not known well enough', stress_related: 'Stress', chunk_hotspot: 'Same chunk missed repeatedly',
};
const gbp = (n: number) => `£${n.toFixed(n < 1 ? 3 : 2)}`;

/** Every number goes through here, so in demonstration mode each one carries a visible "sample" tag. */
function Figure({ sample, children }: { sample: boolean; children: ReactNode }) {
  return (
    <span data-figure>
      {children}
      {sample && <small className="sample-tag" data-sample> sample</small>}
    </span>
  );
}

/** The read-only class overview. Nicknames and progress only; counts, never anything that could identify a child. */
export function OverviewView({ data, cost, sample, cheeky }: { data: OverviewData; cost: CostReport; sample: boolean; cheeky?: { token: string; enabled: boolean } }) {
  const F = ({ children }: { children: ReactNode }) => <Figure sample={sample}>{children}</Figure>;
  return (
    <main className="screen">
      <h1>{data.title}</h1>
      {sample && (
        <p role="note" className="error" data-testid="sample-banner">
          <strong>Sample data.</strong> These students and figures are made up for a demonstration. No real student is shown.
        </p>
      )}
      <Win title="class.exe" label="Class summary">
        <p>Joined: <strong><F>{data.joined}</F></strong>. Started practising: <strong><F>{data.started}</F></strong>.</p>
        <p>Average readiness: <strong>{data.averageReadiness === null ? 'no students yet' : <F>{data.averageReadiness}%</F>}</strong></p>
        <table>
          <caption>Students by step</caption>
          <thead><tr><th scope="col">Step</th><th scope="col">Students</th></tr></thead>
          <tbody>{STAGES.map((s) => <tr key={s}><th scope="row">{STAGE_LABEL[s]}</th><td><F>{data.stages[s]}</F></td></tr>)}</tbody>
        </table>
      </Win>
      <Win title="students.exe" label="Students">
        <table>
          <caption>Nickname and progress only</caption>
          <thead><tr><th scope="col">Nickname</th><th scope="col">Step</th><th scope="col">Readiness</th></tr></thead>
          <tbody>
            {data.students.map((s) => <tr key={s.nickname} data-testid="student-row"><th scope="row">{s.nickname}</th><td>{STAGE_LABEL[s.stage]}</td><td><F>{s.readiness}%</F></td></tr>)}
          </tbody>
        </table>
        {data.students.length === 0 && <p>No one has joined yet.</p>}
      </Win>
      <Win title="hotspots.exe" label="Class hotspots">
        <HotList title="Questions most often missed" rows={data.questionHotspots} F={F} />
        <HotList title="Chunks most often missed" rows={data.chunkHotspots} F={F} />
        <h2>Most common causes</h2>
        {data.causes.length ? <ol data-testid="causes">{data.causes.map((c) => <li key={c.tag}>{TAG_LABEL[c.tag] ?? c.tag}: <F>{c.count}</F></li>)}</ol> : <p>None yet.</p>}
      </Win>
      {cheeky && (
        <Win title="settings.exe" label="Course settings">
          <CheekySwitch token={cheeky.token} initial={cheeky.enabled} />
        </Win>
      )}
      <Win title="cost.exe" label="Cost per student">
        <p data-testid="cost-per-student">
          Estimated cost per student: <strong>{cost.perStudentGbp === null ? 'no students yet' : <F>{gbp(cost.perStudentGbp)}</F>}</strong>
          {' '}(total <F>{gbp(cost.totalGbp)}</F> across <F>{cost.students}</F> students)
        </p>
        <table>
          <caption>Share of cost by tier</caption>
          <thead><tr><th scope="col">Tier</th><th scope="col">Cost</th><th scope="col">Share</th></tr></thead>
          <tbody>{cost.tiers.map((t) => <tr key={t.tier} data-tier={t.tier}><th scope="row">{TIER_LABEL[t.tier]}</th><td><F>{gbp(t.costGbp)}</F></td><td><F>{Math.round(t.share * 100)}%</F></td></tr>)}</tbody>
        </table>
        <p className="muted">Calls refused by a spending cap or rate limit: <F>{cost.refused}</F>. Estimates, not invoices.</p>
      </Win>
    </main>
  );
}

function HotList({ title, rows, F }: { title: string; rows: { label: string; misses: number }[]; F: (p: { children: ReactNode }) => ReactNode }) {
  return (
    <>
      <h2>{title}</h2>
      {rows.length ? <ol>{rows.map((r) => <li key={r.label} lang="es">{r.label}: <F>{r.misses}</F> misses</li>)}</ol> : <p>None yet.</p>}
    </>
  );
}
