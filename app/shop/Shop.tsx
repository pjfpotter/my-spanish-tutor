'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CATALOGUE, MAX_FREEZES, type ShopItem } from '../../lib/rewards/catalogue';
import type { ShopState } from '../../lib/rewards/store';
import { Status } from '../../lib/ui/Status';
import { Win } from '../components/Win';
import '../components/screens.css';

const GROUPS: { kind: ShopItem['kind']; title: string }[] = [
  { kind: 'wallpaper', title: 'Wallpapers' },
  { kind: 'object', title: 'Things for your desktop' },
  { kind: 'sticker', title: 'Stickers' },
  { kind: 'phrases', title: 'Cheeky phrases' },
  { kind: 'freeze', title: 'Streak freeze' },
];

/**
 * The shop. Euros come from practice and buy fixed-price things for the desktop. Each item costs one price and the student
 * gets exactly that item: no packs, no chances, no real money. Having nothing yet is fine and loses nothing.
 */
export function Shop({ initial, cheekyOn = false }: { initial: ShopState; cheekyOn?: boolean }) {
  const [state, setState] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(body: { action: 'buy' | 'equip'; item: string | null }, done: string) {
    setBusy(true);
    setMessage(null);
    const res = await fetch('/api/shop', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    setBusy(false);
    if (!res) return setMessage('Could not reach the shop. Nothing was taken. Try again.');
    const data = (await res.json().catch(() => ({}))) as { state?: ShopState; error?: string };
    if (!res.ok || !data.state) return setMessage(data.error ?? 'That did not go through. Nothing was taken.');
    setState(data.state);
    setMessage(done);
  }

  return (
    <main className="screen">
      <h1>Shop</h1>
      <Win title="Spend your euros">
        <div className="stack">
          <p className="coins" data-testid="coins">€{state.coins}</p>
          <p className="muted">Euros come from practising. They are pretend: looking around earns none, and nothing here costs real money.</p>
          {message && <p role="status" data-testid="message">{message}</p>}

          {GROUPS.filter((g) => g.kind !== 'phrases' || cheekyOn).map((g) => (
            <section key={g.kind} aria-label={g.title} className="stack">
              <h2 className="shop-h">{g.title}</h2>
              <ul className="shop-list">
                {CATALOGUE.filter((i) => i.kind === g.kind).map((item) => {
                  const owned = item.kind !== 'freeze' && state.owned.includes(item.id);
                  const short = item.price - state.coins;
                  const full = item.kind === 'freeze' && state.freezesAvailable >= MAX_FREEZES;
                  return (
                    <li key={item.id} data-testid={`item-${item.id}`} data-owned={owned}>
                      <span>
                        <strong lang="es">{item.es}</strong> <span className="muted">{item.en}</span>
                        {item.kind === 'freeze' && <span className="muted"> You have {state.freezesAvailable}.</span>}
                      </span>
                      {owned ? (
                        item.kind === 'wallpaper' ? (
                          state.wallpaper === item.id ? (
                            <Status kind="done" label="In use" />
                          ) : (
                            <button type="button" className="btn" disabled={busy} onClick={() => act({ action: 'equip', item: item.id }, `${item.en} is on your desktop.`)}>Use it</button>
                          )
                        ) : (
                          <Status kind="done" label="Yours" />
                        )
                      ) : (
                        <button type="button" className="btn btn-primary" disabled={busy || short > 0 || full} onClick={() => act({ action: 'buy', item: item.id }, `You got ${item.en}.`)}>
                          {full ? `You have ${MAX_FREEZES}` : `€${item.price}`}
                          {short > 0 && !full && <span className="sr-only"> (you need {short} more)</span>}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {state.wallpaper && (
            <button type="button" className="btn" disabled={busy} onClick={() => act({ action: 'equip', item: null }, 'Back to the plain desktop.')}>Plain desktop</button>
          )}
          <div className="controls"><Link className="btn" href="/">Back to the desktop</Link></div>
        </div>
      </Win>
    </main>
  );
}
