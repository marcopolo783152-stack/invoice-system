import {NextResponse} from 'next/server';
import {requireStaff} from '@/lib/server/staff-permission';
import {serverDb} from '@/lib/server/firebase-admin';
import {auctionFailure} from '@/lib/server/auction-errors';
import {auctionVisibility,PAGE_MODES,VISIBILITY_PATH} from '@/lib/auction/visibility';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{await requireStaff(req,'settings','read');return NextResponse.json(await auctionVisibility(),{headers:{'Cache-Control':'no-store'}});}catch(e){return auctionFailure(e);}}
export async function POST(req:Request){try{
 const user=await requireStaff(req,'settings','write');
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'Invalid origin.'},{status:403});
 const raw=await req.text();if(raw.length>2000)return NextResponse.json({error:'Request too large.'},{status:400});
 let b:any;try{b=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}
 if(!PAGE_MODES.includes(b.mode)||!Number.isInteger(b.version)||!/^[-\w]{1,100}$/.test(b.requestId||''))return NextResponse.json({error:'Invalid page setting.'},{status:400});
 const db=serverDb(),ref=db.doc(VISIBILITY_PATH),event=ref.collection('events').doc(b.requestId);
 try{await db.runTransaction(async tx=>{const [old,prior]=await Promise.all([tx.get(ref),tx.get(event)]);
 if(prior.exists){if(prior.data()?.actor!==user.uid||prior.data()?.mode!==b.mode||prior.data()?.previousVersion!==b.version)throw Error('Operation conflict.');return;}
 if((old.data()?.version||0)!==b.version)throw Error('The page setting changed. Refresh and try again.');
 tx.set(ref,{mode:b.mode,version:b.version+1,updatedAt:Date.now(),updatedBy:user.uid});
 tx.create(event,{mode:b.mode,previousMode:old.data()?.mode||'under_construction',previousVersion:b.version,actor:user.uid,at:Date.now()});
 });}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not save.'},{status:409});}
 return NextResponse.json(await auctionVisibility(),{headers:{'Cache-Control':'no-store'}});
 }catch(e){return auctionFailure(e);}}
