import {NextResponse} from 'next/server';
import {Shippo} from 'shippo';
import {serverDb} from '@/lib/server/firebase-admin';
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 32000) return NextResponse.json({error:'Request too large'}, {status:413});
    const payload = JSON.parse(raw);
    const tracking = payload.data?.tracking_number;
    if (payload.event !== 'track_updated' || typeof tracking !== 'string' || !/^[a-zA-Z0-9-]{5,80}$/.test(tracking))
      return NextResponse.json({received:true});
    const db = serverDb();
    const matches = await db.collection('showroom_orders').where('shippingDetails.trackingNumber','==',tracking).limit(10).get();
    const key = process.env.SHIPPO_API_KEY?.trim().replace(/^ShippoToken /,'');
    if (!key) return NextResponse.json({error:'Tracking service not configured'}, {status:503});
    const shippo = new Shippo({apiKeyHeader:key});
    for (const order of matches.docs) {
      const data = order.data();
      // Never trust an incoming webhook status. Fetch the carrier status from Shippo.
      const provider = String(data.shippingDetails?.carrier || '').toLowerCase();
      const carrier = ({'usps':'usps','ups':'ups','fedex':'fedex','dhl express':'dhl_express','dhl_express':'dhl_express'} as Record<string,string>)[provider];
      if (!carrier) continue;
      const lease = db.collection('shipping_tracking_checks').doc(order.id);
      const check = await db.runTransaction(async tx => {
        const previous = (await tx.get(lease)).data();
        if (Date.now() - (previous?.checkedAt || 0) < 60000) return false;
        tx.set(lease,{checkedAt:Date.now()}); return true;
      });
      if (!check) continue;
      const verified = await shippo.trackingStatus.get(tracking, carrier);
      const status = verified.trackingStatus?.status;
      const next = status === 'DELIVERED' ? 'Delivered' : status === 'RETURNED' ? 'Returned' : status === 'TRANSIT' ? 'Shipped' : null;
      if (!next) continue;
      await db.runTransaction(async tx => {
        const current = (await tx.get(order.ref)).data();
        if (!current || current.shippingDetails?.trackingNumber !== tracking || !['Preparing for Shipping','Shipped'].includes(current.status)) return;
        tx.update(order.ref, {status:next, 'shippingDetails.verifiedAt':new Date().toISOString()});
      });
    }
    return NextResponse.json({received:true});
  } catch { return NextResponse.json({error:'Tracking update could not be verified'}, {status:503}); }
}
