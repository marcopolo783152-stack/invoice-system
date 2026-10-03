import {requireStaff} from '@/lib/server/staff-permission';
import {serverDb} from '@/lib/server/firebase-admin';
import {CheckoutError} from '@/lib/server/rug-checkout.mjs';
import {respond,failure,sameSite,bodyJson,ownOrder,reconcile} from '@/lib/server/live-payment';
export const runtime='nodejs';
const fields=new Set('name sku price originalPrice sizeCategory dimensions origin material style age condition colors shape availability construction description images shippingPackage weightLbs isSpecialSale isFreeShipping manufacturingType type color'.split(' '));
export async function POST(req:Request){
  try{
    sameSite(req);const user=await requireStaff(req,'inventory','write'),b=await bodyJson(req);
    if(typeof b.id!=='string'||!b.id||b.id.includes('/')||!b.fields||typeof b.fields!=='object'||Array.isArray(b.fields))throw new CheckoutError('Invalid inventory update.',400);
    const changes:Record<string,unknown>={};
    for(const [key,value] of Object.entries(b.fields)){if(fields.has(key))changes[key]=value;}
    if(!Object.keys(changes).length)throw new CheckoutError('No inventory changes supplied.',400);
    if('availability' in changes&&!['In Stock','Sold','Reserved','On Hold','Unavailable'].includes(String(changes.availability)))throw new CheckoutError('Invalid rug status.',400);
    const db=serverDb(),ref=db.collection('showroom_rugs').doc(b.id),rug=(await ref.get()).data();
    if(!rug)throw new CheckoutError('Rug not found.',404);
    if(rug.liveOrderId){
      const order=await ownOrder(rug.liveOrderId,user.uid,true);
      if(order.sessionAttemptedAt&&order.paymentStatus!=='Paid'){
        const settled=await reconcile(order,true);
        if(settled.paymentStatus!=='Paid'&&!['Expired','Cancelled'].includes(settled.status))throw new CheckoutError('Payment is still processing. Retry after it completes.',409);
      }
    }
    await db.runTransaction(async tx=>{
      const current=(await tx.get(ref)).data();
      if(!current)throw new CheckoutError('Rug not found.',404);
      if(current.liveOrderId!==rug.liveOrderId&&current.liveOrderId)throw new CheckoutError('Another checkout started. Retry your edit.',409);
      // Keep the paid order intact; only an explicit inventory status change releases its catalog link.
      const update={...changes,...('availability' in changes?{liveOrderId:null}:{})};
      tx.update(ref,update);
      tx.create(db.collection('showroom_inventory_audit').doc(),{rugId:b.id,by:user.uid,at:new Date().toISOString(),previousOrderId:current.liveOrderId||null,changes});
    });
    return respond({ok:true});
  }catch(e){return failure(e);}
}
