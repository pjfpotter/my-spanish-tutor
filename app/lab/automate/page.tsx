import type { Metadata } from 'next';
import { LabAutomate } from './LabAutomate';

// The automate lab (automate-lab). Not linked from the app. Search engines are asked to leave it alone.
export const metadata: Metadata = { title: 'Automate lab', robots: { index: false, follow: false } };

export default function AutomateLabPage() {
  return <LabAutomate />;
}
