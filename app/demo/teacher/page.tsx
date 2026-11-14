import { sampleCost, sampleOverview } from '../../../lib/overview/sample';
import '../../components/screens.css';
import { OverviewView } from '../../owner/[token]/OverviewView';

/** The teacher overview on made-up sample data. It needs no owner link and reads nothing from the database. */
export default function DemoTeacher() {
  return <OverviewView data={sampleOverview()} cost={sampleCost()} sample />;
}
