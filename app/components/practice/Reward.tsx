import './practice.css';

const SPOTS = [
  [-70, -60], [-40, -90], [-10, -70], [20, -95], [50, -65], [75, -85], [-55, -35], [60, -40],
  [-90, -80], [90, -60], [0, -110], [35, -120],
] as const;

/** A small burst of confetti squares (task 20.4). Decorative: hidden from assistive tech, and gone under calm mode or reduced motion. */
export function Reward({ big = false, burstKey }: { big?: boolean; burstKey: string | number }) {
  const spots = big ? SPOTS : SPOTS.slice(0, 6);
  return (
    <div key={burstKey} className="reward" data-big={big} data-testid="reward" aria-hidden="true">
      {spots.map(([dx, dy], i) => (
        <i key={i} style={{ ['--dx' as string]: `${dx}px`, ['--dy' as string]: `${dy}px`, animationDelay: `${i * 18}ms` }} />
      ))}
    </div>
  );
}
