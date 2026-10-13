import AuctionUnderConstruction from '@/components/auction/AuctionUnderConstruction';
import AuctionLot from '@/components/auction/AuctionLot';
import {auctionVisibility} from '@/lib/auction/visibility';
export const dynamic='force-dynamic';
export const metadata={title:'Auction lot | Marco Polo Rugs',robots:{index:false,follow:false}};
export default async function Page({params}:{params:{id:string}}){const {mode}=await auctionVisibility();return mode==='open'?<AuctionLot id={params.id}/>:<AuctionUnderConstruction comingSoon={mode==='coming_soon'}/>;}
