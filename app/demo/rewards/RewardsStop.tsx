'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CATALOGUE } from '../../../lib/rewards/catalogue';
import { PRAISE_POOL } from '../../../lib/practice/praise';
import { Win } from '../../components/Win';
import { Reward } from '../../components/practice/Reward';
import '../../components/screens.css';

const PRACTICE_EUROS = 5;
const SHELF = CATALOGUE.filter((i) => i.kind === 'wallpaper' || i.kind === 'sticker').slice(0, 4);

/**
 * Stop 5: rewards. Euros for effort, with a made-up starting balance held in this page only. A streak is described by what the
 * student has, never by what they could lose. Nothing here costs real money and nothing is saved.
 */
export function RewardsStop() {
  const [euros, setEuros] = useState(35);
  const [days] = useState(3);
  const [bought, setBought] = useState<string[]>([]);
  const [burst, setBurst] = useState(0);
  const [praise, setPraise] = useState<string | null>(null);

  function practise() {
    setEuros((e) => e + PRACTICE_EUROS);
    setBurst((b) => b + 1);
    setPraise(PRAISE_POOL[burst % PRAISE_POOL.length]);
  }

  return (
    <main className="screen" data-testid="rewards-stop">
      <h1>Rewards</h1>
      <Reward burstKey={burst} />
      <Win title="Your euros">
        <div className="stack">
          <p className="coins" data-testid="demo-euros">€{euros}</p>
          <p data-testid="streak">You have practised {days} days in a row.</p>
          <p className="muted">Euros come from effort: every spoken go earns some, whatever the score. They are pretend, and nothing here costs real money.</p>
          <button type="button" className="btn btn-primary" onClick={practise} data-testid="demo-practise">Pretend I practised</button>
          {praise && <p role="status" data-testid="demo-praise">{praise} +€{PRACTICE_EUROS} for trying.</p>}
        </div>
      </Win>
      <Win title="The shop">
        <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {SHELF.map((item) => {
            const has = bought.includes(item.id);
            const afford = euros >= item.price;
            return (
              <li key={item.id}>
                <span lang="es">{item.es}</span> <span className="muted">({item.en}), €{item.price}</span>{' '}
                <button type="button" className="btn" disabled={has || !afford} onClick={() => { setEuros((e) => e - item.price); setBought((b) => [...b, item.id]); }} data-testid={`buy-${item.id}`}>
                  {has ? 'Bought' : afford ? 'Buy' : 'Not enough yet'}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="muted">Fixed prices, exactly what you pay for. No packs, no chances, no hearts, no lives, no public ranking.</p>
      </Win>
      <Link className="btn btn-primary" href="/demo/teacher" data-testid="rewards-next">Next stop: teacher overview</Link>
    </main>
  );
}
