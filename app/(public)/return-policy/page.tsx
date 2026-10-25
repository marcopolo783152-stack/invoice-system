import type {Metadata} from 'next';
import Link from 'next/link';
import {businessConfig} from '@/config/business';
import styles from './page.module.css';

export const metadata:Metadata={
  title:'Returns & Exchanges Policy | Marco Polo Rugs',
  description:'All sales are final. Marco Polo Rugs does not accept returns. Exchanges are available within one week. Contact our Alexandria showroom for exchange arrangements.',
  alternates:{canonical:'https://www.marcopolorugs.com/return-policy'},
};

export default function ReturnPolicyPage(){
  return <div className={styles.page}>
    <header className={styles.header}><Link href="/">Marco Polo Rugs <span>Alexandria, Virginia · Since 1988</span></Link><Link href="/?view=shop" className={styles.back}>Back to shopping</Link></header>
    <main className={styles.main}>
      <p className={styles.eyebrow}>Shopping with Marco Polo Rugs</p>
      <h1>Returns &amp; exchanges</h1>
      <p className={styles.intro}>Our policy applies to rug purchases made online and at our showroom.</p>
      <section className={styles.highlight} aria-labelledby="final-sales"><h2 id="final-sales">All sales are final</h2><p>We do not accept returns. Please review the rug’s description, exact measurements, photos, and condition before purchasing. If you have questions, contact our showroom before placing your order.</p></section>
      <section className={styles.section}><h2>Exchanges within one week</h2><p>Exchanges are available within one week. Please contact our showroom to discuss and arrange your exchange before sending or bringing a rug back.</p></section>
      <section className={styles.section}><h2>Payment before pickup or delivery</h2><p>Full payment is required before pickup or delivery.</p></section>
      <section className={styles.contact} aria-labelledby="policy-contact"><h2 id="policy-contact">Questions about your purchase?</h2><p>If you need an exchange or have a concern about your order, please contact us with your order or invoice number.</p><p><a href={'tel:+1'+businessConfig.phone.replace(/\D/g,'')}>{businessConfig.phone}</a><br/><a href={'mailto:'+businessConfig.email}>{businessConfig.email}</a></p><address>{businessConfig.name}<br/>{businessConfig.address}<br/>{businessConfig.city}, {businessConfig.state} {businessConfig.zip}</address></section>
    </main>
    <footer className={styles.footer}><Link href="/">Marco Polo Rugs</Link><span>All sales are final. Exchanges within one week.</span></footer>
  </div>;
}
