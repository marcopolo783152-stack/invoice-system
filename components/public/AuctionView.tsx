'use client';
import {useState} from 'react';
import type {Rug} from '@/types';
import {availableRugs,matchesSearch,matchesSize,SHOP_SIZE_OPTIONS} from '@/lib/rug-discovery.mjs';
import styles from '@/components/auction/Auction.module.css';
export const AuctionView = ({rugs,onSelectRug}:{rugs:Rug[];onSelectRug:(id:string)=>void}) => {
 const [query,setQuery]=useState(''),[size,setSize]=useState(''),[limit,setLimit]=useState(12);
 const visible=availableRugs(rugs).filter((rug:Rug)=>matchesSearch(rug,query)&&matchesSize(rug,size));
 return <section className={styles.page}>
  <div className={styles.hero}>
    <div><span className={styles.eyebrow}>Marco Polo Rugs · Since 1988</span><h1>A new way to find<br/>a remarkable rug.</h1><p>Discover our upcoming rug auctions, with detailed condition reports, clear bidding rules and personal help from our Alexandria showroom.</p><div className={styles.actions}><a className={styles.button} href="#auction-rug-preview">Browse rug preview</a><a className={`${styles.button} ${styles.secondary}`} href="/auctions/register">Prepare your bidder profile</a></div></div>
    <aside className={styles.card}><span className={styles.badge}>Auctions coming soon</span><h2 style={{marginTop:20}}>Know before you bid.</h2><ul className={styles.list}><li>Verified account and payment method required</li><li>Choose shipping or showroom pickup</li><li>Free padding included with every rug</li><li>Clear costs before you confirm a bid</li></ul><p className={styles.muted}>Bidding and card verification are not open yet. Preparing a profile does not place a bid or charge your card.</p></aside>
  </div>
  <section id="auction-rug-preview" className={styles.catalog} aria-labelledby="auction-preview-heading">
    <span className={styles.eyebrow}>Browse freely · No account required</span>
    <h2 id="auction-preview-heading">Explore the rugs.</h2>
    <p>Browse photographs and details from our showroom collection. These are collection previews, not scheduled auction lots. Starting bids and auction dates have not been announced.</p>
    <div className={styles.catalogFilters}>
      <label>Search rugs<input type="search" placeholder="Try blue wool, 8x10, a name or SKU…" value={query} onChange={e=>{setQuery(e.target.value);setLimit(12);}}/></label>
      <label>Size<select value={size} onChange={e=>{setSize(e.target.value);setLimit(12);}}><option value="">All sizes</option>{SHOP_SIZE_OPTIONS.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
      <button className={styles.secondary} onClick={()=>{setQuery('');setSize('');setLimit(12);}}>Clear filters</button>
    </div>
    <div className={styles.row}><p role="status">{visible.length} rugs in this preview</p><p className={styles.muted}>Free padding with every rug · Bidding not open</p></div>
    {size&&<p className={styles.muted}>Sizes are approximate categories in feet (within 6 inches). Check each rug’s exact measurements.</p>}
    {!visible.length&&<div className={styles.card}><h3>{query||size?'No rugs match these filters.':'The collection preview is unavailable right now.'}</h3><p>{query||size?'Try a different size or clear your search.':'Please check again shortly or browse the shop collection.'}</p><a href="/?view=shop">Browse the shop</a></div>}
    <div className={styles.rugGrid}>{visible.slice(0,limit).map((rug:Rug)=><article key={rug.id} className={styles.rugCard}>
      <button className={styles.rugPhoto} onClick={()=>onSelectRug(rug.id)} aria-label={'View '+rug.name}>{rug.images?.[0]?<img loading="lazy" src={rug.images[0]} alt={rug.name}/>:<span>Photo coming soon</span>}</button>
      <div className={styles.rugInfo}><span className={styles.badge}>Collection preview</span><h3><button className={styles.rugTitle} onClick={()=>onSelectRug(rug.id)}>{rug.name}</button></h3><p>{rug.dimensions} · {rug.material}</p><p className={styles.muted}>SKU {rug.sku} · {rug.origin}</p><button className={styles.secondary} onClick={()=>onSelectRug(rug.id)}>View rug details</button><p className={styles.muted}>Auction date not announced</p></div>
    </article>)}</div>
    {visible.length>limit&&<div className={styles.actions}><button className={styles.secondary} onClick={()=>setLimit(limit+12)}>Show more rugs ({visible.length-limit} remaining)</button></div>}
  </section>
  <div className={styles.grid}>{[['01 · Get ready','Save your contact details. Email, phone and payment verification will be required before bidding opens.'],['02 · Find your rug','Review measurements, photos and the condition report. Ask us questions before committing to a bid.'],['03 · Bring it home','Choose delivery or pickup. Any shipping or assisted-loading charge must be confirmed before bidding.']].map(([title,body])=><article className={styles.card} key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
  <div className={styles.row}><p>Questions? <a href="tel:+17034610207">Call (703) 461-0207</a></p><a href="/?view=book">Visit our Alexandria showroom</a></div>
</section>;
};
