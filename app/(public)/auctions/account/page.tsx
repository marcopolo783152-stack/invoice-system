import AuctionUnderConstruction from '@/components/auction/AuctionUnderConstruction';
import AuctionBuyerAccount from '@/components/auction/AuctionBuyerAccount';
import {auctionVisibility} from '@/lib/auction/visibility';
export const dynamic='force-dynamic';
export const metadata={title:'Auction account | Marco Polo Rugs',robots:{index:false,follow:false}};
export default async function Page(){const {mode}=await auctionVisibility();return mode==='open'?<AuctionBuyerAccount/>:<AuctionUnderConstruction comingSoon={mode==='coming_soon'}/>;}
