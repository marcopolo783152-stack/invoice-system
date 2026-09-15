import {NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {Shippo} from 'shippo';
import {serverDb} from '@/lib/server/firebase-admin';
import {requireStaff} from '@/lib/server/staff-permission';
export async function POST(request: Request) {
  try { await requireStaff(request,'orders'); }
  catch {return NextResponse.json({error:'Staff permission required.'},{status:403});}
  try {
    const {orderId, dimensions, selectedRate} = await request.json();
    if (typeof orderId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(orderId)) return NextResponse.json({error:'Invalid order'},{status:400});
    if (!dimensions || !['length','width','height','weight'].every(k=>Number.isFinite(Number(dimensions[k])) && Number(dimensions[k])>0 && Number(dimensions[k])<=1000))
      return NextResponse.json({error:'Enter valid package dimensions and weight.'},{status:400});
    const db = serverDb(), ref = db.collection('showroom_orders').doc(orderId);
    const order = (await ref.get()).data();
    if (!order) return NextResponse.json({error:'Order not found'},{status:404});
    if (['Cancelled','Delivered','Returned'].includes(order.status)) return NextResponse.json({error:'This order is not ready for a shipping label.'},{status:409});
    if ((order.shippingDetails?.transactionId || order.shippingDetails?.trackingNumber)) return NextResponse.json({error:'This order already has a label. Review it in Shippo before buying another.'},{status:409});
    const key = process.env.SHIPPO_API_KEY?.trim().replace(/^ShippoToken /,'');
    if (!key) return NextResponse.json({error:'Shipping is not configured'},{status:503});
    const shippo = new Shippo({apiKeyHeader:key});
    const c = order.customerInfo || {};
    const parts = String(c.shippingAddress || '').split(',').map((v:string)=>v.trim());
    const stateZip = (parts[2] || '').match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    const addressTo = {name:c.name || 'Customer', street1:c.address1 || c.street || parts[0] || '', street2:c.address2 || '', city:c.city || parts[1] || '', state:c.state || stateZip?.[1] || '', zip:c.zip || c.zipCode || stateZip?.[2] || '', country:c.country || 'US'};
    if (!addressTo.street1 || !addressTo.city || !addressTo.state || !addressTo.zip)
      return NextResponse.json({error:'Complete the order street, city, state and ZIP before requesting rates.'},{status:400});
    const parcel = {length:String(dimensions.length),width:String(dimensions.width),height:String(dimensions.height),weight:String(dimensions.weight),distanceUnit:'in',massUnit:'lb'};
    const fingerprint = createHash('sha256').update(JSON.stringify({addressTo,parcel})).digest('hex');
    const quoteRef = db.collection('shipping_label_quotes').doc(orderId);
    if (!selectedRate) {
      const shipment = await shippo.shipments.create({addressFrom:{name:'Marco Polo Rugs',street1:'3260 Duke Street',city:'Alexandria',state:'VA',zip:'22314',country:'US',phone:'7034610207',email:'marcopolo783152@gmail.com'},addressTo,parcels:[parcel as any],async:false});
      const rates = (shipment.rates || []).filter(r=>r.objectId && r.currency==='USD' && Number.isFinite(Number(r.amount))).map(r=>({id:r.objectId,provider:r.provider,amount:r.amount,currency:r.currency,service:r.servicelevel?.name || 'Shipping'})).sort((a,b)=>Number(a.amount)-Number(b.amount));
      if (!rates.length) return NextResponse.json({error:'No rates are available. Check the address, package and carrier accounts.'},{status:400});
      await quoteRef.set({fingerprint,rates,expiresAt:Date.now()+10*60*1000});
      return NextResponse.json({success:true,rates});
    }
    const operation = db.collection('shipping_label_operations').doc(orderId);
    const rate = await db.runTransaction(async tx=>{
      const [quote,op,current] = await tx.getAll(quoteRef,operation,ref);
      const data=quote.data();
      if (op.exists || current.data()?.shippingDetails?.transactionId) throw Error('LABEL_OPERATION_EXISTS');
      if (!data || data.fingerprint!==fingerprint || data.expiresAt<Date.now()) throw Error('QUOTE_EXPIRED');
      const chosen=data.rates.find((r:any)=>r.id===selectedRate);
      if (!chosen) throw Error('QUOTE_EXPIRED');
      // No automatic retry after a purchase starts: reconcile uncertain results in Shippo.
      tx.create(operation,{phase:'purchasing',rateId:selectedRate,startedAt:new Date().toISOString()});
      return chosen;
    });
    const transaction = await shippo.transactions.create({rate:rate.id,labelFileType:'PDF',async:false});
    if (transaction.status!=='SUCCESS') {
      await operation.update({phase:'needs_review',providerStatus:transaction.status || 'unknown'});
      return NextResponse.json({error:'Carrier purchase needs review. Check Shippo before retrying.'},{status:409});
    }
    const result={success:true,transactionId:transaction.objectId,trackingNumber:transaction.trackingNumber || '',labelUrl:transaction.labelUrl || '',trackingUrl:transaction.trackingUrlProvider || '',carrier:rate.provider,cost:rate.amount};
    const batch=db.batch();
    batch.update(ref,{status:'Preparing for Shipping',shippingDetails:{...order.shippingDetails,transactionId:result.transactionId,trackingNumber:result.trackingNumber,labelUrl:result.labelUrl,trackingUrl:result.trackingUrl,carrier:result.carrier,cost:result.cost,labelCreatedAt:new Date().toISOString()}});
    batch.update(operation,{phase:'complete',result}); await batch.commit();
    return NextResponse.json(result);
  } catch (error) {
    const code=error instanceof Error?error.message:'';
    return NextResponse.json({error:code==='QUOTE_EXPIRED'?'Rates expired or the package changed. Request new rates.':code==='LABEL_OPERATION_EXISTS'?'A label purchase already started. Check Shippo and the order before retrying.':'Shipping could not complete. If you confirmed a purchase, check Shippo before retrying.'},{status:code==='QUOTE_EXPIRED'||code==='LABEL_OPERATION_EXISTS'?409:503});
  }
}
