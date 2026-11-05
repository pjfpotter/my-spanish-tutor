import { redirect } from 'next/navigation';
import { getDb } from '../../lib/db';
import { cheekyPoolEnabled } from '../../lib/rewards/cheeky';
import { loadShop } from '../../lib/rewards/store';
import { currentProfile } from '../../lib/server/session';
import { Shop } from './Shop';

export const dynamic = 'force-dynamic';

export default async function ShopPage() {
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const db = await getDb();
  return <Shop initial={await loadShop(db, profile.id)} cheekyOn={await cheekyPoolEnabled(db, profile.courseId)} />;
}
