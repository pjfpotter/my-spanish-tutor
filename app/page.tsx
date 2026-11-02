import { loadHome } from '../lib/server/home';
import { Desktop } from './components/Desktop';

export const dynamic = 'force-dynamic'; // progress changes with every attempt

export default async function Home() {
  return <Desktop {...await loadHome()} />;
}
