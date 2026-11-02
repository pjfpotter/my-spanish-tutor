import { Desktop } from './components/Desktop';
import { phaseStates } from '../lib/phases/gate';
import { STUB_DAYS_TO_TEST, STUB_PROGRESS } from '../lib/home/stub';

export default function Home() {
  return <Desktop states={phaseStates(STUB_PROGRESS)} daysToTest={STUB_DAYS_TO_TEST} />;
}
