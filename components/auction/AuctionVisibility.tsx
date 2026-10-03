'use client';
import {useEffect,useState,useRef} from 'react';
import {auctionRequest} from './client';
import styles from './Auction.module.css';
export default function AuctionVisibility(){
 const [data,setData]=useState<any>(null),[mode,setMode]=useState('under_construction'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');const lock=useRef(false),pending=useRef<any>(null);
 async function load(){const d=await auctionRequest('visibility');setData(d);setMode(d.mode);}
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 async function save(){if(lock.current||!data)return;lock.current=true;setBusy(true);setError('');setMessage('');try{
 if(pending.current?.mode!==mode||pending.current?.version!==data.version)pending.current={mode,version:data.version,requestId:crypto.randomUUID()};
 const d=await auctionRequest('visibility',pending.current);pending.current=null;setData(d);setMode(d.mode);setMessage('Customer page setting saved.');
 }catch(e){setError(e instanceof Error?e.message:'Could not save.');}finally{lock.current=false;setBusy(false);}}
 return <section className={styles.card} style={{marginTop:24}}><h2>Customer auction page</h2><p>Control the public page here. Closing it hides the catalog and direct lot pages. Inventory is never published automatically.</p><label>Page availability<select disabled={!data||busy} value={mode} onChange={e=>setMode(e.target.value)}><option value="under_construction">Closed — Under construction</option><option value="coming_soon">Closed — Coming soon</option><option value="open">Open catalog — published lots only</option></select></label><p className={styles.muted}>Opening the catalog does not enable live bidding or live card charges. Those features are still being completed.</p><div className={styles.actions}><button disabled={!data||busy||data.mode===mode} onClick={save}>{busy?'Saving…':'Save page availability'}</button><button className={styles.secondary} disabled={busy} onClick={()=>load().catch(e=>setError(e.message))}>Refresh setting</button><a href="/auctions" target="_blank" rel="noreferrer">View customer page</a></div>{error&&<p role="alert" className={styles.error}>{error}</p>}{message&&<p role="status" className={styles.success}>{message}</p>}</section>;
}
