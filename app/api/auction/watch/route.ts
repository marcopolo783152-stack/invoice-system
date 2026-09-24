import {NextResponse} from 'next/server';
import {caller,serverDb} from '@/lib/server/firebase-admin';
import {auctionFailure} from '@/lib/server/auction-errors';
export const dynamic='force-dynamic';
async function userFor(request:Request){const user=await caller(request);if(!user.email||user.firebase?.sign_in_provider==='anonymous')throw Error('SIGN_IN_REQUIRED');return user;}
export async function GET(request:Request){try{const user=await userFor(request);const docs=await serverDb().collection('auction_watchlists').doc(user.uid).collection('lots').limit(100).get();return NextResponse.json({ids:docs.docs.map(d=>d.id)},{headers:{'Cache-Control':'no-store'}});}catch(error){return auctionFailure(error);}}
export async function POST(request:Request){try{
 const user=await userFor(request);const text=await request.text();if(text.length>1000)return NextResponse.json({error:'Invalid request.'},{status:400});
 let input:any;try{input=JSON.parse(text);}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}
 if(!input||typeof input.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(input.id)||typeof input.saved!=='boolean')return NextResponse.json({error:'Invalid request.'},{status:400});
 const db=serverDb(),ref=db.collection('auction_watchlists').doc(user.uid).collection('lots').doc(input.id);
 if(input.saved){const lot=await db.doc('auction_lots/'+input.id).get();if(lot.data()?.status!=='preview')return NextResponse.json({error:'Lot is no longer available.'},{status:404});await ref.set({savedAt:Date.now()});}else await ref.delete();
 return NextResponse.json({saved:input.saved});
}catch(error){return auctionFailure(error);}}
