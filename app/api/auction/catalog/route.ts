import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/server/firebase-admin';
import {publicLot} from '@/lib/auction/catalog.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 const db=serverDb(),id=new URL(request.url).searchParams.get('id');
 if(id&&!/^[a-zA-Z0-9_-]{1,100}$/.test(id))return NextResponse.json({error:'Invalid lot.'},{status:400});
 const docs=id?[await db.collection('auction_lots').doc(id).get()]:(await db.collection('auction_lots').where('status','==','preview').limit(100).get()).docs;
 const lots=(await Promise.all(docs.map(async doc=>{
  const lot=doc.data();if(!lot||lot.status!=='preview')return null;
  const rugDoc=await db.doc('showroom_rugs/'+lot.snapshot.rugId).get();
  if(!rugDoc.exists)return null;
  return publicLot(doc.id,lot,{...(rugDoc.data()?.data||rugDoc.data()),id:rugDoc.id});
 }))).filter(Boolean);
 if(id&&!lots.length)return NextResponse.json({error:'This lot is unavailable or not published.'},{status:404});
 return NextResponse.json({lots,serverNow:Date.now(),biddingEnabled:false},{headers:{'Cache-Control':'no-store'}});
}catch{return NextResponse.json({error:'The auction catalog is temporarily unavailable. Please try again shortly.'},{status:503});}}
