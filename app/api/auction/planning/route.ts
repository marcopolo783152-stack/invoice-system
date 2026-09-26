import {NextResponse} from 'next/server';
import {createHash} from 'crypto';
import {requireStaff} from '@/lib/server/staff-permission';
import {serverDb} from '@/lib/server/firebase-admin';
import {auctionFailure} from '@/lib/server/auction-errors';
import {prepareAuction} from '@/lib/auction/planning.mjs';
import {check,validateLot} from '@/lib/auction/engine.mjs';
import {eligibleRug,rugSnapshot} from '@/lib/auction/catalog.mjs';
export const dynamic='force-dynamic';
const valid=(v:any)=>typeof v==='string'&&/^[\w-]{1,100}$/.test(v);
export async function GET(req:Request){try{await requireStaff(req,'settings','read');const records=await serverDb().collection('auction_workspaces_v1').orderBy('updatedAt','desc').limit(100).get();return NextResponse.json({auctions:records.docs.map(d=>({...d.data(),id:d.id})),publicEnabled:false},{headers:{'Cache-Control':'no-store'}});}catch(e){return auctionFailure(e);}}
export async function POST(req:Request){try{
 const user=await requireStaff(req,'settings','write');const text=await req.text();if(text.length>500000)return NextResponse.json({error:'Import too large. Maximum 100 lots per auction.'},{status:400});
 try{const input=JSON.parse(text);check(valid(input.requestId)&&valid(input.id),'Invalid operation reference.');check(['save','test'].includes(input.action),'Invalid action.');
 const db=serverDb(),ref=db.collection('auction_workspaces_v1').doc(input.id),event=ref.collection('events').doc(input.requestId),fingerprint=createHash('sha256').update(text).digest('hex');
 await db.runTransaction(async tx=>{const [stored,prior]=await Promise.all([tx.get(ref),tx.get(event)]);if(prior.exists){check(prior.data()?.fingerprint===fingerprint&&prior.data()?.actor===user.uid,'Operation conflict.');return;}
 const old=stored.data();check((old?.version||0)===input.version,'This auction changed. Reload before saving.');
 if(input.action==='save'){
 const plan:any=prepareAuction(input);const linked=plan.rows.filter((r:any)=>r.rugId);const docs=await Promise.all(linked.map((r:any)=>tx.get(db.doc('showroom_rugs/'+r.rugId))));
 docs.forEach((doc:any,i:number)=>{check(doc.exists,'An inventory rug no longer exists.');const rug={...(doc.data().data||doc.data()),id:doc.id};check(eligibleRug(rug),'An inventory rug is unavailable or held for review.');const row=linked[i];const snap=rugSnapshot(rug);check(row.origin===snap.origin&&row.sku===snap.sku,'Inventory origin or SKU changed. Re-add the rug from inventory.');});
 tx.set(ref,{...plan,version:(old?.version||0)+1,updatedAt:Date.now(),updatedBy:user.uid,createdAt:old?.createdAt||Date.now(),publicEnabled:false});
 }else{
 check(stored.exists&&Number.isInteger(input.index),'Choose a saved lot.');const row=old!.rows[input.index];check(row?.rugId,'Link this lot to showroom inventory first.');const doc=await tx.get(db.doc('showroom_rugs/'+row.rugId));const rug={...(doc.data()?.data||doc.data()),id:doc.id};check(doc.exists&&eligibleRug(rug),'This rug is unavailable or held for review.');
 const now=Date.now(),lot=validateLot({title:row.title,condition:row.condition,startingCents:Math.round(row.starting*100),reserveCents:Math.round(row.reserve*100),loadingCents:Math.round(row.loading*100),startAt:now,endAt:now+15*60000},now);
 tx.create(db.doc('auction_sandbox_lots/'+input.requestId),{...lot,createdAt:now,createdBy:user.uid,sourceAuction:input.id,snapshot:{rugId:doc.id,name:rug.name||'',sku:rug.sku||'',origin:rug.origin||'',size:rug.dimensions||'',image:rugSnapshot(rug).images[0]||''}});
 }
 tx.create(event,{actor:user.uid,at:Date.now(),action:input.action,fingerprint});
 });return NextResponse.json({saved:true,id:input.id,testId:input.action==='test'?input.requestId:null});
 }catch(e){if((e as any)?.code)throw e;return NextResponse.json({error:e instanceof Error?e.message:'Invalid request.'},{status:400});}
 }catch(e){return auctionFailure(e);}}
