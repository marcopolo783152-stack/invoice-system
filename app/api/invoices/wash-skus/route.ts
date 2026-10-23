import {NextResponse} from 'next/server';
import {requireStaff} from '@/lib/server/staff-permission';
import {serverDb} from '@/lib/server/firebase-admin';
import {highestWashSku,reserveWashSkus} from '@/lib/server/wash-sku.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request) {
 try {
  const user=await requireStaff(request,'invoices','write');
  const text=await request.text();
  if(text.length>1000)return NextResponse.json({error:'Request too large.'},{status:400});
  let input:any;try{input=JSON.parse(text);}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}
  if(!/^[a-zA-Z0-9_-]{16,80}$/.test(input?.requestId||'')||!Number.isInteger(input?.count)||input.count<1||input.count>100)
   return NextResponse.json({error:'Choose between 1 and 100 wash items.'},{status:400});
  const db=serverDb();
  // Include legacy store-prefixed collections and deleted invoices: never reuse their numbers.
  const collections=(await db.listCollections()).filter(c=>/(^|_)(invoices|deletedInvoices)$/.test(c.id));
  let observedMax=1270;
  for(const collection of collections){
   const docs=await collection.select('data.items','items').get();
   observedMax=highestWashSku(docs.docs.map(d=>d.data()),observedMax);
  }
  const skus=await reserveWashSkus(db,{requestId:input.requestId,count:input.count,uid:user.uid,observedMax});
  return NextResponse.json({skus},{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  const message=error instanceof Error?error.message:'';
  const status=message==='FORBIDDEN'?403:/SIGN_IN_REQUIRED|auth\//.test(message)?401:message==='RESERVATION_CONFLICT'?409:503;
  return NextResponse.json({error:status===403?'You need invoice editing permission.':status===401?'Please sign in again.':'Could not reserve wash SKUs. Check your connection and retry. No local fallback numbers were generated.'},{status});
 }
}
