import type { CorrectionNotice as Correction } from '../../../lib/sheets/ingest';
import { describeNotice } from '../../../lib/sheets/notice';
import { Win } from '../Win';
import './sheets.css';

/** What was corrected in an uploaded sheet (task 4.9). Informational: students can already use the sheet. */
export function CorrectionNotice({ corrections }: { corrections: Correction[] }) {
  const n = describeNotice(corrections);
  return (
    <Win title="correcciones.exe" label="What was corrected">
      <div className="notice" data-count={n.count}>
        <h3>{n.headline}</h3>
        {n.lines.length > 0 && <ul>{n.lines.map((l, i) => <li key={i}>{l.text}</li>)}</ul>}
        {n.count > 0 && <p>The printed text is kept, so a change can be undone. Students are already using the corrected sheet.</p>}
      </div>
    </Win>
  );
}
