import styles from '@/components/auction/Auction.module.css';

export default function AuctionUnderConstruction() {
  return (
    <section className={styles.page} aria-labelledby="auction-status-title">
      <div className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Marco Polo Rugs · Since 1988</span>
          <h1 id="auction-status-title">Auctions are under construction.</h1>
          <p>We’re preparing our auction experience. Auctions, bidder registration and bidding will open when everything is ready.</p>
          <div className={styles.actions}>
            <a className={styles.button} href="/?view=shop">Shop our rug collection</a>
            <a className={styles.secondary + ' ' + styles.button} href="tel:+17034610207">Call our showroom</a>
          </div>
        </div>
        <aside className={styles.card} aria-label="Auction availability">
          <span className={styles.badge}>Coming soon</span>
          <h2 style={{marginTop: 20}}>Thank you for your patience.</h2>
          <p>Our team is completing the auction setup before welcoming bidders. There are no open auctions at this time.</p>
          <p className={styles.muted}>Visit Marco Polo Rugs at 3260 Duke Street, Alexandria, VA 22314.</p>
        </aside>
      </div>
    </section>
  );
}
