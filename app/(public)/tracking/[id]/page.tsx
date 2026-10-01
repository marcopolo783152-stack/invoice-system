import type {Metadata} from 'next';
import InvoiceTracking from '@/components/public/InvoiceTracking';
export const metadata:Metadata={title:'Your rug service | Marco Polo Rugs',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function TrackingPage({params}:{params:{id:string}}){return <InvoiceTracking params={params}/>;}
