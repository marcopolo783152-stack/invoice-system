import {serverDb,caller} from '@/lib/server/firebase-admin';
import {CheckoutError} from '@/lib/server/rug-checkout.mjs';
import {checkoutPromo} from '@/lib/server/checkout-promo.mjs';
import {sameSite,bodyJson,respond,failure} from '@/lib/server/live-payment';
export const runtime='nodejs';
export async function POST(req:Request){
  try{
    sameSite(req);await caller(req);const b=await bodyJson(req),code=typeof b.code==='string'?b.code.trim():'';
    if(!code||code.length>80)throw new CheckoutError('Enter a valid promo code.',400);
    const docs=await serverDb().collection('showroom_promocodes').where('code','==',code).limit(2).get();
    const promo=checkoutPromo(docs.size===1?docs.docs[0].data():null,code);
    return respond({promo});
  }catch(e){return failure(e);}
}
