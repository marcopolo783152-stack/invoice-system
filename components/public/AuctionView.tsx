'use client';
import AuctionCatalog from '@/components/auction/AuctionCatalog';
import styles from '@/components/auction/Auction.module.css';
export const AuctionView = () => <section className={styles.page}>
 <div className={styles.row}><div><span className={styles.eyebrow}>Marco Polo Rugs · Since 1988</span><h1>Rugs worth bidding for.</h1><p>Explore auction lots, inspect every detail and prepare your bidder account.</p></div><a className={styles.button} href="/auctions/register">Register to bid</a></div>
 <AuctionCatalog/>
 <div className={styles.grid}>{[['Verified bidders','Email, phone and a verified payment method will be required before bidding opens.'],['Clear delivery options','Choose shipping or pickup, with customer loading or Marco Polo assistance.'],['Personal help','Questions about a rug? Call (703) 461-0207 or arrange a showroom inspection.']].map(([title,body])=><article className={styles.card} key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
 </section>;
