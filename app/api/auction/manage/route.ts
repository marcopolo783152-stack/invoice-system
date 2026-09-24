import {NextResponse} from 'next/server';
import {createHash} from 'crypto';
import {requireStaff} from '@/lib/server/staff-permission';
import {serverDb} from '@/lib/server/firebase-admin';
import {auctionFailure} from '@/lib/server/auction-errors';
import {check} from '@/lib/auction/engine.mjs';
import {eligibleRug,lotFields,rugSnapshot} from '@/lib/auction/catalog.mjs';
export const dynamic='force-dynamic';
const validId=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
export async function GET(request:Request){try{
 await requireStaff(request,'settings','read');const db=serverDb();const params=new URL(request.url).searchParams;
 if(params.has('inventory')){const records=await db.collection('showroom_rugs').limit(500).get();return NextResponse.json({rugs:records.docs.map(doc=>{const rug={...(doc.data().data||doc.data()),id:doc.id};return {...rugSnapshot(rug),eligible:eligibleRug(rug)};})},{headers:{'Cache-Control':'no-store'}});}
 const records=await db.collection('auction_lots').orderBy('createdAt','desc').limit(100).get();
 return NextResponse.json({lots:records.docs.map(doc=>({id:doc.id,...doc.data()})),liveEnabled:false},{headers:{'Cache-Control':'no-store'}});
}catch(error){return auctionFailure(error);}}
export async function POST(request:Request){try{
 const user=await requireStaff(request,'settings','write');const text=await request.text();if(text.length>18000)return NextResponse.json({error:'Request too large.'},{status:400});
 let input:any;try{input=JSON.parse(text);}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}
 try{
 check(input&&validId(input.requestId),'Missing operation reference.');
 check(['create','edit','publish','unpublish','archive'].includes(input.action),'Invalid action.');
 const db=serverDb();const id=input.action==='create'?input.requestId:input.id;check(validId(id),'Invalid lot.');
 const ref=db.collection('auction_lots').doc(id),event=ref.collection('events').doc(input.requestId);
 const fingerprint=createHash('sha256').update(text).digest('hex');
 await db.runTransaction(async tx=>{
  const [stored,prior]=await Promise.all([tx.get(ref),tx.get(event)]);
  if(prior.exists){check(prior.data()?.fingerprint===fingerprint&&prior.data()?.actor===user.uid,'Operation conflict.');return;}
  const lot=stored.data();let update:any={};
  if(input.action==='create'||input.action==='edit'){
   if(input.action==='edit')check(lot?.status==='draft'&&lot.version===input.version,'This draft changed. Refresh before editing.');
   else check(!stored.exists,'Lot already exists.');
   check(validId(input.rugId),'Choose an inventory rug.');
   const doc=await tx.get(db.doc('showroom_rugs/'+input.rugId));const rug={...(doc.data()?.data||doc.data()),id:doc.id};
   check(doc.exists&&eligibleRug(rug),'This rug is unavailable or on a public listing review hold.');
   const fields=lotFields(input);
   update={...fields,snapshot:rugSnapshot(rug),status:'draft',version:(lot?.version||0)+1};
   if(input.action==='create')Object.assign(update,{lotNumber:'MP-'+id.slice(0,8).toUpperCase(),createdAt:Date.now(),createdBy:user.uid});
  }else{
   check(stored.exists&&lot?.version===input.version,'This lot changed. Refresh before continuing.');
   if(input.action==='publish'){
    check(lot?.status==='draft','Only a draft can be published for preview.');
    const doc=await tx.get(db.doc('showroom_rugs/'+lot!.snapshot.rugId));const rug={...(doc.data()?.data||doc.data()),id:doc.id};
    check(doc.exists&&eligibleRug(rug),'This rug is unavailable or held for review.');
    check(rugSnapshot(rug).images.length>0,'Add an inventory photo before publishing.');
    update={status:'preview',publishedAt:Date.now(),version:lot!.version+1};
   }else{
    check(['draft','preview'].includes(lot!.status),'This lot cannot be changed.');
    check(typeof input.reason==='string'&&input.reason.trim().length>=5&&input.reason.length<=500,'Enter a reason (5–500 characters).');
    update={status:input.action==='archive'?'archived':'draft',version:lot!.version+1};
   }
  }
  tx.set(ref,{...update,updatedAt:Date.now()},{merge:true});
  tx.create(event,{action:input.action,actor:user.uid,at:Date.now(),fingerprint,reason:String(input.reason||'')});
 });return NextResponse.json({id,saved:true});
 }catch(error){if((error as any)?.code)throw error;return NextResponse.json({error:error instanceof Error?error.message:'Invalid request.'},{status:400});}
}catch(error){return auctionFailure(error);}}
