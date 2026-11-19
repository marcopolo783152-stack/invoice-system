import type {Metadata} from 'next';
export const metadata:Metadata={title:'Washing company | Marco Polo Rugs',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body style={{margin:0,background:'#f7f6f1'}}>{children}</body></html>;}
