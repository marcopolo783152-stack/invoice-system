import 'server-only';
import {cache} from 'react';
import {serverDb} from './firebase-admin';
import {Rug} from '@/types';
// Read existing records only. No seeding, migrations or inventory writes.
export const catalogRug = cache(async (id: string): Promise<Rug | null> => {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return null;
  const doc = await serverDb().collection('showroom_rugs').doc(id).get();
  return doc.exists ? {...doc.data(), id:doc.id} as Rug : null;
});
export async function catalogIds() {
  const result = await serverDb().collection('showroom_rugs').select('availability').get();
  return result.docs.filter(doc => doc.data().availability === 'In Stock').map(doc => doc.id);
}

// Keep unavailable server configuration distinct from a genuinely missing rug.
// The browser gallery uses the existing public Firebase client and read rules.
export const catalogRugForPage = cache(async (id: string): Promise<Rug | null | undefined> => {
  try {
    return await catalogRug(id);
  } catch {
    console.error('[catalog] Server lookup unavailable; using showroom gallery');
    return undefined;
  }
});
