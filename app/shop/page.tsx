import { redirect } from 'next/navigation';
import { getDb } from '../../lib/db';
import { loadShop } from '../../lib/rewards/store';
import { currentProfile } from '../../lib/server/session';
import { Shop } from './Shop';

export const dynamic = 'force-dynamic';

export default async function ShopPage() {
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  return <Shop initial={await loadShop(await getDb(), profile.id)} />;
}
