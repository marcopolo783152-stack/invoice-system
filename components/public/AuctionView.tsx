'use client';
import styles from '@/components/auction/Auction.module.css';
export const AuctionView = () => <section className={styles.page}>
  <div className={styles.hero}>
    <div><span className={styles.eyebrow}>Marco Polo Rugs · Since 1988</span><h1>A new way to find<br/>a remarkable rug.</h1><p>Discover our upcoming rug auctions, with detailed condition reports, clear bidding rules and personal help from our Alexandria showroom.</p><div className={styles.actions}><a className={styles.button} href="/auctions/register">Prepare your bidder profile</a><a className={`${styles.button} ${styles.secondary}`} href="/?view=shop">Explore the collection</a></div></div>
    <aside className={styles.card}><span className={styles.badge}>Auctions coming soon</span><h2 style={{marginTop:20}}>Know before you bid.</h2><ul className={styles.list}><li>Verified account and payment method required</li><li>Choose shipping or showroom pickup</li><li>Free padding included with every rug</li><li>Clear costs before you confirm a bid</li></ul><p className={styles.muted}>Bidding and card verification are not open yet. Preparing a profile does not place a bid or charge your card.</p></aside>
  </div>
  <div className={styles.grid}>{[['01 · Get ready','Save your contact details. Email, phone and payment verification will be required before bidding opens.'],['02 · Find your rug','Review measurements, photos and the condition report. Ask us questions before committing to a bid.'],['03 · Bring it home','Choose delivery or pickup. Any shipping or assisted-loading charge must be confirmed before bidding.']].map(([title,body])=><article className={styles.card} key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
  <div className={styles.row}><p>Questions? <a href="tel:+17034610207">Call (703) 461-0207</a></p><a href="/?view=book">Visit our Alexandria showroom</a></div>
</section>;
