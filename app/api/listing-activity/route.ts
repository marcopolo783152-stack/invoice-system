import {NextRequest, NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {serverDb} from '@/lib/server/firebase-admin';
import {recordActivity} from '@/lib/listing-stats.mjs';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  const reply = (data: unknown, status = 200) => NextResponse.json(data, {status, headers: {'Cache-Control': 'no-store'}});
  try {
    if (req.headers.get('origin') !== req.nextUrl.origin) return reply({error: 'Invalid origin'}, 403);
    const raw = await req.text();
    if (raw.length > 1024) return reply({error: 'Invalid request'}, 400);
    const {rugId, kind, visitor} = JSON.parse(raw);
    if (typeof rugId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(rugId) ||
        !['visit','favorite','unfavorite'].includes(kind) || typeof visitor !== 'string' ||
        !/^[a-f0-9-]{36}$/.test(visitor)) return reply({error: 'Invalid event'}, 400);
    const db = serverDb(), rugRef = db.doc('showroom_rugs/' + rugId);
    const visitorRef = db.doc('showroom_listing_visitors/' + createHash('sha256').update(visitor + ':' + rugId).digest('hex'));
    const result = await db.runTransaction(async tx => {
      const rug = await tx.get(rugRef), seen = await tx.get(visitorRef);
      if (!rug.exists) return null;
      const next = recordActivity(rug.data(), seen.data() || {}, kind);
      tx.update(rugRef, next.rug);
      tx.set(visitorRef, next.visitor);
      return next.rug;
    });
    return result ? reply(result) : reply({error: 'Listing not found'}, 404);
  } catch { return reply({error: 'Activity unavailable'}, 503); }
}
