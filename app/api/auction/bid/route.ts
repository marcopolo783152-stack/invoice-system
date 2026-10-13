import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/server/firebase-admin';
import {auctionLaunch,liveBuyer,liveRequest,auctionLiveError} from '@/lib/server/auction-live';
import {acceptLiveBid} from '@/lib/auction/live-ledger.mjs';
import {AUCTION_SETTINGS,DEFAULT_SETTINGS} from '@/lib/auction/settlement.mjs';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{const launch=await auctionLaunch();if(!launch.biddingEnabled)return NextResponse.json({error:'Live bidding is closed. The showroom is completing launch requirements.'},{status:423});const user=await liveBuyer(req);if(launch.pilotOnly&&!launch.pilotBuyerIds?.includes(user.uid))return NextResponse.json({error:'This auction is in a private launch rehearsal. Public bidding is not open.'},{status:423});const b=await liveRequest(req),db=serverDb(),settings=(await db.doc(AUCTION_SETTINGS+'/current').get()).data()||DEFAULT_SETTINGS;return NextResponse.json(await acceptLiveBid(db,b.lotId,user,b,settings));}catch(e){return auctionLiveError(e);}}
