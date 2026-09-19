import {NextResponse} from 'next/server';
import {createHash} from 'crypto';
import {requireStaff} from '@/lib/server/staff-permission';
import {auctionFailure} from '@/lib/server/auction-errors';
import {serverDb} from '@/lib/server/firebase-admin';
import {check, validateLot, placeMaximum, settle} from '@/lib/auction/engine.mjs';
export const dynamic = 'force-dynamic';
const collection = 'auction_sandbox_lots';
const idPattern = /^[a-zA-Z0-9_-]{1,100}$/;
export async function GET(request: Request) {
  try {
    await requireStaff(request,'settings','read');
    const db = serverDb();
    const params = new URL(request.url).searchParams;
    if (params.get('inventory') === '1') {
      const rugs = await db.collection('showroom_rugs').limit(500).get();
      return NextResponse.json({rugs:rugs.docs.map(d=>{const r=d.data().data||d.data();return {id:d.id,name:String(r.name||r.title||d.id),sku:String(r.sku||'')};})},{headers:{'Cache-Control':'no-store'}});
    }
    const id = params.get('id');
    if (id) {
      if (!idPattern.test(id)) return NextResponse.json({error:'Invalid lot.'},{status:400});
      const ref = db.collection(collection).doc(id);
      const [lot, events, bidders] = await Promise.all([ref.get(),ref.collection('events').orderBy('at','desc').limit(50).get(),ref.collection('bidders').get()]);
      if (!lot.exists) return NextResponse.json({error:'Lot not found.'},{status:404});
      return NextResponse.json({lot:{id,...lot.data()}, events:events.docs.map(d=>d.data()), bidders:bidders.docs.map(d=>d.data()), serverNow:Date.now()},{headers:{'Cache-Control':'no-store'}});
    }
    const lots = await db.collection(collection).orderBy('createdAt','desc').limit(100).get();
    return NextResponse.json({lots:lots.docs.map(d=>({id:d.id,...d.data()})),serverNow:Date.now(),mode:'sandbox'},{headers:{'Cache-Control':'no-store'}});
  } catch(error) { return auctionFailure(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireStaff(request,'settings','write');
    const text = await request.text();
    if (text.length > 12000) return NextResponse.json({error:'Request too large.'},{status:400});
    let input: any;
    try {input = JSON.parse(text);} catch {return NextResponse.json({error:'Invalid request.'},{status:400});}
    const db = serverDb();
    const fingerprint = createHash('sha256').update(text).digest('hex');
    // Domain failures are intentionally returned without exposing database/auth details.
    try {
      check(input && typeof input === 'object','Invalid request.');
      check(typeof input.requestId === 'string' && /^[a-zA-Z0-9-]{16,80}$/.test(input.requestId),'Missing operation reference.');
      if (input.action === 'create') {
        const value = validateLot(input, Date.now());
        const rugId = String(input.rugId || '');
        check(idPattern.test(rugId),'Enter an existing rug ID.');
        const rug = (await db.doc(`showroom_rugs/${rugId}`).get()).data();
        check(!!rug,'Rug was not found.');
        const r = rug!.data || rug!;
        const snapshot = {rugId, name:String(r.name || r.title || value.title), sku:String(r.sku || ''), origin:String(r.origin || ''), size:String(r.dimensions || r.size || ''), image: typeof r.images?.[0] === 'string' && r.images[0].startsWith('https://') ? r.images[0] : ''};
        const ref = db.collection(collection).doc(input.requestId);
        await db.runTransaction(async tx => {
          const existing = await tx.get(ref);
          if (existing.exists) {check(existing.data()?.createdBy === user.uid && existing.data()?.fingerprint === fingerprint,'Operation reference is already used.');return;}
          tx.create(ref,{...value,snapshot,createdAt:Date.now(),createdBy:user.uid,fingerprint});
          tx.create(ref.collection('events').doc(input.requestId),{action:'created',at:Date.now(),actor:user.uid,note:'Sandbox copy only; inventory unchanged.'});
        });
        return NextResponse.json({id:ref.id});
      }
      check(idPattern.test(String(input.id || '')),'Select a lot.');
      const ref = db.collection(collection).doc(input.id);
      await db.runTransaction(async tx => {
        const [snap, existingEvent] = await Promise.all([tx.get(ref),tx.get(ref.collection('events').doc(input.requestId))]);
        check(snap.exists,'Lot not found.');
        if (existingEvent.exists) {
          check(existingEvent.data()?.actor === user.uid && existingEvent.data()?.action === input.action && existingEvent.data()?.fingerprint === fingerprint,'Operation reference conflict.');
          return;
        }
        const lot = snap.data()!;
        check(lot.mode === 'sandbox','Only sandbox lots can be changed here.');
        const now = Date.now();
        let change: any = {};
        let detail: any = {};
        switch(input.action) {
          case 'schedule':
            check(lot.status === 'draft' && lot.endAt > now,'Only a draft with a future closing time can be scheduled.');
            change = {status:'scheduled',version:lot.version+1};break;
          case 'bid': {
            check(['test-a','test-b','test-c'].includes(input.bidderId),'Choose a sandbox bidder.');
            const bids = await tx.get(ref.collection('bidders'));
            const result = placeMaximum(lot,bids.docs.map(d=>d.data()),input.bidderId,input.maximumCents,input.delivery,now);
            change = result.lot;
            const own = result.bidders.find((b:any)=>b.bidderId===input.bidderId)!;
            tx.set(ref.collection('bidders').doc(input.bidderId),own);
            detail = {bidder:input.bidderId,maximumCents:own.maximumCents,displayCents:change.currentCents,extended:change.endAt!==lot.endAt};
            break;
          }
          case 'close': {
            change = settle(lot,now);
            if (change.status === 'sold') {
              const winning = (await tx.get(ref.collection('bidders').doc(lot.leaderId))).data();
              check(!!winning,'Winning bidder record is missing.');
              change.winningDelivery = winning!.delivery;
              change.testOrderNumber = 'MPR-AUCTION-TEST-' + input.id;
            }
            break;
          }
          case 'cancel':
            check(['draft','scheduled'].includes(lot.status),'This lot can no longer be cancelled here.');
            check(typeof input.reason==='string' && input.reason.trim().length>=10 && input.reason.length<=500,'Enter a cancellation reason (10–500 characters).');
            change={status:'cancelled',version:lot.version+1}; detail={reason:input.reason.trim()};break;
          case 'payment_failed':
          case 'payment_paid':
            check(lot.status==='sold' && lot.paymentStatus!=='paid','Only an unpaid winning lot can be tested.');
            change={paymentStatus:input.action==='payment_paid'?'paid':'failed',version:lot.version+1};
            detail={note:'Simulated result. No payment provider was called.'};break;
          case 'fulfill':
            check(lot.status==='sold' && lot.paymentStatus==='paid' && lot.fulfillmentStatus!=='complete','Simulated payment must be successful before fulfillment.');
            check(typeof input.reference==='string' && input.reference.trim().length>=3 && input.reference.length<=200,'Enter a test tracking or pickup reference.');
            change={fulfillmentStatus:'complete',fulfillmentReference:input.reference.trim(),version:lot.version+1};break;
          default: throw Error('Unsupported sandbox action.');
        }
        tx.update(ref,{...change,updatedAt:now});
        tx.create(ref.collection('events').doc(input.requestId),{action:input.action,at:now,actor:user.uid,fingerprint,...detail});
      });
      return NextResponse.json({ok:true});
    } catch(error) {
      // Firestore failures have a numeric/string code; don't present internal details.
      if ((error as any)?.code) throw error;
      return NextResponse.json({error:error instanceof Error?error.message:'Check your input.'},{status:400});
    }
  } catch(error) {return auctionFailure(error);}
}
