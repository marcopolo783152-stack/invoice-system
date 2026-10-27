import Link from 'next/link';
import type {Metadata} from 'next';
import {businessConfig} from '@/config/business';
import {policyUpdated,storePolicies} from '@/lib/store-policies';
import type {StorePolicy} from '@/lib/store-policies';
import styles from './Policies.module.css';

export function policyMetadata(slug:string):Metadata{
 const policy=storePolicies.find(item=>item.slug===slug)!;
 return {title:policy.title+' | Marco Polo Rugs',description:policy.summary,alternates:{canonical:'https://www.marcopolorugs.com/'+slug}};
}
export function PolicyContact(){
 return <section className={styles.contact} aria-labelledby="policy-contact"><h2 id="policy-contact">Contact Marco Polo Rugs</h2><p>For questions about an order, service, exchange, or privacy request, contact our showroom. Please include your order or invoice number when available.</p><p><a href={'tel:+1'+businessConfig.phone.replace(/\D/g,'')}>{businessConfig.phone}</a><br/><a href={'mailto:'+businessConfig.email}>{businessConfig.email}</a></p><address>{businessConfig.name}<br/>{businessConfig.address}<br/>{businessConfig.city}, {businessConfig.state} {businessConfig.zip}</address></section>;
}
export function PolicyFrame({children,active}:{children:React.ReactNode;active?:string}){
 return <div className={styles.page}><a className={styles.skip} href="#policy-content">Skip to policy</a><header className={styles.header}><Link href="/">Marco Polo Rugs <span>Alexandria, Virginia · Since 1988</span></Link><Link href="/?view=shop" className={styles.back}>Back to shopping</Link></header><nav className={styles.nav} aria-label="Store policies"><Link href="/policies" aria-current={active==='policies'?'page':undefined}>Policies &amp; Terms</Link>{storePolicies.map(policy=><Link key={policy.slug} href={'/'+policy.slug} aria-current={active===policy.slug?'page':undefined}>{policy.title}</Link>)}</nav><main id="policy-content" className={styles.main}>{children}</main><footer className={styles.footer}><Link href="/">Marco Polo Rugs</Link><span>All sales are final. Exchanges within one week.</span><Link href="/policies">Policies &amp; Terms</Link></footer></div>;
}
export function StorePolicyPage({slug}:{slug:string}){
 const policy=storePolicies.find(item=>item.slug===slug) as StorePolicy;
 return <PolicyFrame active={slug}><p className={styles.eyebrow}>Marco Polo Oriental Rugs, Inc.</p><h1>{policy.title}</h1><p className={styles.updated}>Updated {policyUpdated}</p><p className={styles.intro}>{policy.summary}</p><nav className={styles.contents} aria-label="On this page"><strong>On this page</strong><ul>{policy.sections.map(section=><li key={section.id}><a href={'#'+section.id}>{section.title}</a></li>)}</ul></nav>{policy.sections.map((section,index)=><section key={section.id} id={section.id} className={index===0&&slug==='return-policy'?styles.highlight:styles.section}><h2>{section.title}</h2>{section.paragraphs.map((paragraph,i)=><p key={i}>{paragraph}</p>)}</section>)}<PolicyContact/></PolicyFrame>;
}
export function PolicyHub(){
 return <PolicyFrame active="policies"><p className={styles.eyebrow}>Clear information for every purchase</p><h1>Policies &amp; Terms</h1><p className={styles.intro}>Learn about shopping with Marco Polo Rugs, arranging rug care, and how we handle your information. These policies are available before you place an order or request a service.</p><div className={styles.cards}>{storePolicies.map(policy=><Link key={policy.slug} href={'/'+policy.slug} className={styles.card}><h2>{policy.title}</h2><p>{policy.summary}</p><span>Read policy →</span></Link>)}</div><PolicyContact/></PolicyFrame>;
}
