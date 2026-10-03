import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/server/firebase-admin';
import {auctionVisibility} from '@/lib/auction/visibility';
import {publicLot} from '@/lib/auction/catalog.mjs';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const {mode}=await auctionVisibility();const headers={'Cache-Control':'no-store'};
 if(mode!=='open')return NextResponse.json({lots:[],publicEnabled:false,biddingEnabled:false,status:mode},{headers});
 try{const db=serverDb(),id=new URL(req.url).searchParams.get('id');
 if(id&&!/^[-\w]{1,100}$/.test(id))return NextResponse.json({error:'Invalid lot.'},{status:400,headers});
 const records=id?[await db.doc('auction_lots/'+id).get()]:(await db.collection('auction_lots').where('status','==','preview').limit(100).get()).docs;
 const lots=(await Promise.all(records.filter(d=>d.exists&&d.data()?.status==='preview').map(async d=>{const lot=d.data()!;const rugId=lot.snapshot?.rugId;if(!/^[-\w]{1,100}$/.test(rugId||''))return null;const r=await db.doc('showroom_rugs/'+rugId).get();return r.exists?publicLot(d.id,lot,{...(r.data()?.data||r.data()),id:r.id}):null;}))).filter(Boolean);
 return NextResponse.json({lots,publicEnabled:true,biddingEnabled:false,status:'open'},{headers});
 }catch{return NextResponse.json({error:'Auction catalog is temporarily unavailable.'},{status:503,headers});}
}
