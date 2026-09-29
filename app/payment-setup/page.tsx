'use client';

import {useEffect, useRef, useState} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {auth} from '@/lib/auth';
import {OWNER_UID, OWNER_EMAIL} from '@/lib/access-policy';
import styles from './page.module.css';

type Connection = {
  accountId: string; paymentsEnabled: boolean; payoutsEnabled: boolean;
  webhookSecretSaved: boolean; checkoutEnabled: false; checkedAt: string;
};

export default function PaymentSetup() {
  const [owner, setOwner] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState<Connection | null>(null);
  const running = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      generation.current++;
      setOwner(!!user && user.emailVerified && user.uid === OWNER_UID && user.email?.toLowerCase() === OWNER_EMAIL);
      setConnection(null); setError(''); setLoaded(true);
    });
    return () => { generation.current++; unsubscribe(); };
  }, []);

  async function check() {
    const user = auth.currentUser;
    if (!owner || !user || running.current) return;
    const checkGeneration = generation.current;
    running.current = true; setBusy(true); setError(''); setConnection(null);
    try {
      const response = await fetch('/api/stripe/live-status', {
        cache: 'no-store', headers: {Authorization: 'Bearer ' + await user.getIdToken()},
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not check the connection.');
      if (generation.current === checkGeneration) setConnection(data);
    } catch (e) {
      if (generation.current === checkGeneration) setError(e instanceof Error ? e.message : 'Could not check the connection.');
    } finally { running.current = false; setBusy(false); }
  }

  return <main className={styles.page}>
    <section className={styles.card}>
      <a className={styles.back} href="/?view=admin">← Return to administration</a>
      <p className={styles.brand}>Marco Polo Rugs · Owner settings</p>
      <h1>Payment connection</h1>
      <p className={styles.intro}>Check the Stripe account connected to this website. This check does not charge a card or change orders or inventory.</p>
      {!loaded ? <p>Checking your sign-in…</p> : !owner ? <p>Sign in with the owner account to check payment setup. <a href="/staff-login?next=%2Fpayment-setup">Staff sign in</a></p> : <>
        <button onClick={check} disabled={busy} className={styles.button}>{busy ? 'Checking Stripe…' : 'Check live connection'}</button>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {connection && <div aria-live="polite">
          <dl className={styles.results}>
            <div><dt>Account</dt><dd>Marco Polo Rugs <small>{connection.accountId}</small></dd></div>
            <div><dt>Stripe payments</dt><dd>{connection.paymentsEnabled ? 'Enabled' : 'Not enabled'}</dd></div>
            <div><dt>Stripe payouts</dt><dd>{connection.payoutsEnabled ? 'Enabled' : 'Not enabled'}</dd></div>
            <div><dt>Live webhook secret</dt><dd>{connection.webhookSecretSaved ? 'Saved — delivery not yet verified' : 'Not configured'}</dd></div>
            <div><dt>Website live checkout</dt><dd>Not enabled</dd></div>
          </dl>
          <p className={styles.timestamp}>Checked {new Date(connection.checkedAt).toLocaleString()}</p>
        </div>}
        <aside className={styles.notice}><strong>Connection setup is one step.</strong><p>Customer card payments stay unavailable until live order handling, payment confirmations, inventory reservations, and final tax and delivery amounts have been implemented and verified.</p></aside>
        <p className={styles.help}>Keep API keys in Vercel’s secure settings. This page never displays them. Existing sandbox checkout and auctions are unaffected.</p>
      </>}
    </section>
  </main>;
}
