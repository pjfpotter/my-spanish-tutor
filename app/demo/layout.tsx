import type { Metadata } from 'next';
import { DemoBar } from './DemoBar';

export const metadata: Metadata = { title: 'Demo', robots: { index: false, follow: false } };

/** Every demo screen carries the Demo label. Demo pages read no profile and write nothing to the database. */
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="demo-shell">
      <DemoBar />
      {children}
    </div>
  );
}
