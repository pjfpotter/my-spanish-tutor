import { PRIVACY_NOTICE } from '../../lib/privacy/notice';

/** The student-facing privacy notice, shown before joining and on /privacy. */
export function PrivacyNotice() {
  return (
    <div className="stack" data-testid="privacy-notice">
      {PRIVACY_NOTICE.map((s) => (
        <section key={s.heading}>
          <h3>{s.heading}</h3>
          <ul>
            {s.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
