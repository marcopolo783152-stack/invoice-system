import AuctionLot from '@/components/auction/AuctionLot';
export const metadata={title:'Auction lot | Marco Polo Rugs',robots:{index:false,follow:false}};
export default function Page({params}:{params:{id:string}}){return <AuctionLot id={params.id}/>;}
