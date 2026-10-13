import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/server/firebase-admin';
import {POST as sandbox} from '@/app/api/auction/sandbox/route';
import {POST as operations} from '@/app/api/auction/operations/route';
import {POST as payment} from '@/app/api/auction/test-payments/route';
import {SANDBOX_INVOICES,SANDBOX_SALES} from '@/lib/auction/settlement.mjs';
// Staff-only preparation runner. Uses the same authorization and atomic APIs as the UI.
export async function runTestAuction(request:Request){
 const db=serverDb(),snapshot=await db.collection('auction_sandbox_lots').orderBy('createdAt','desc').limit(101).get();
 if(snapshot.size>100)return NextResponse.json({error:'More than 100 test lots exist. Use individual auction consolidation; runner will not process a truncated auction.'},{status:409});
 const records=snapshot.docs.map(d=>({...d.data(),id:d.id}));const results:any[]=[],startedAt=Date.now();let providerAttempts=0;
 async function invoke(handler:(r:Request)=>Promise<Response>,path:string,body:object){const r=new Request(new URL(path,request.url),{method:'POST',headers:{Authorization:request.headers.get('authorization')||'','Content-Type':'application/json'},body:JSON.stringify(body)});const response=await handler(r),data=await response.json();if(!response.ok)throw Error(data.error||'Test processing failed.');return data;}
 for(const lot of records as any[]){if(lot.mode==='sandbox'&&lot.status==='scheduled'&&lot.endAt<=Date.now()){try{await invoke(sandbox,'/api/auction/sandbox',{action:'close',id:lot.id,requestId:crypto.randomUUID()});results.push({lotId:lot.id,action:'closed'});}catch(e){results.push({lotId:lot.id,error:e instanceof Error?e.message:'Close failed'});}}}
 const groups=[...new Set((records as any[]).map(l=>l.sourceAuction||l.id))];
 for(const auctionId of groups){try{if(!(await db.doc(SANDBOX_SALES+'/'+auctionId).get()).exists)await invoke(operations,'/api/auction/operations',{action:'consolidate',auctionId,requestId:crypto.randomUUID()});const sale=(await db.doc(SANDBOX_SALES+'/'+auctionId).get()).data();for(const id of sale?.invoiceIds||[]){const invoice=(await db.doc(SANDBOX_INVOICES+'/'+id).get()).data();if(invoice?.paymentStatus==='unpaid'&&process.env.MARCO_POLO_AUCTION_STRIPE_TEST_ENABLED==='true'&&providerAttempts<3&&Date.now()-startedAt<40000){try{providerAttempts++;await invoke(payment,'/api/auction/test-payments',{action:'charge',id});results.push({auctionId,invoiceId:id,action:'test_charge_attempted'});}catch(e){results.push({auctionId,invoiceId:id,error:e instanceof Error?e.message:'Test payment failed'});}}}results.push({auctionId,action:'consolidated'});}catch(e){results.push({auctionId,error:e instanceof Error?e.message:'Consolidation pending'});}}
 return NextResponse.json({results,publicEnabled:false,liveCharges:false},{headers:{'Cache-Control':'no-store'}});
}
