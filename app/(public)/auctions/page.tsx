import AuctionUnderConstruction from '@/components/auction/AuctionUnderConstruction';
import AuctionCatalog from '@/components/auction/AuctionCatalog';
import {auctionVisibility} from '@/lib/auction/visibility';
export const dynamic='force-dynamic';
export const metadata={title:'Rug auctions | Marco Polo Rugs',robots:{index:false,follow:false}};
export default async function Page(){const {mode}=await auctionVisibility();return mode==='open'?<main><AuctionCatalog/></main>:<AuctionUnderConstruction comingSoon={mode==='coming_soon'}/>;}
