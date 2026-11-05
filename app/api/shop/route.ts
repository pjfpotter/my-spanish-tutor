import { getDb } from '../../../lib/db';
import { buyItem, equipWallpaper, loadShop } from '../../../lib/rewards/store';
import { currentProfile } from '../../../lib/server/session';

/** Buy an item at its fixed price, or choose a wallpaper. Coins only: nothing here takes money. */
export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { action?: string; item?: string | null } | null;
  const db = await getDb();
  if (b?.action === 'buy' && typeof b.item === 'string') {
    const r = await buyItem(db, profile.id, b.item);
    return r.ok ? Response.json({ ok: true, state: await loadShop(db, profile.id) }) : Response.json({ error: r.error }, { status: 400 });
  }
  if (b?.action === 'equip' && (typeof b.item === 'string' || b.item === null)) {
    const r = await equipWallpaper(db, profile.id, b.item);
    return r.ok ? Response.json({ ok: true, state: await loadShop(db, profile.id) }) : Response.json({ error: r.error }, { status: 400 });
  }
  return Response.json({ error: 'Bad request.' }, { status: 400 });
}
