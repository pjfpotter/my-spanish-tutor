import type { Metadata } from 'next';
import { TutorStop } from './TutorStop';

export const metadata: Metadata = { title: 'Demo: meet Tele' };

export default function Page() {
  return <TutorStop />;
}
