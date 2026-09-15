'use client';
import {useEffect, useRef, useState} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {auth} from '@/lib/auth';
import {OWNER_UID, OWNER_EMAIL} from '@/lib/access-policy';

export default function RugCheckoutButton({payload}: {payload: unknown}) {
  const [owner, setOwner] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const attempt = useRef({body: '', id: ''}), running = useRef(false);
  useEffect(() => onAuthStateChanged(auth, u => setOwner(!!u && u.emailVerified && u.uid === OWNER_UID && u.email?.toLowerCase() === OWNER_EMAIL)), []);
  if (!owner) return null;
  async function start() {
    if (running.current || !auth.currentUser) return;
    running.current = true; setBusy(true); setError('');
    try {
      const body = JSON.stringify(payload);
      if (attempt.current.body !== body || !attempt.current.id) attempt.current = {body, id: crypto.randomUUID()};
      const response = await fetch('/api/rug-checkout', {method: 'POST', headers: {'Content-Type': 'application/json',
        Authorization: 'Bearer ' + await auth.currentUser.getIdToken(), 'X-Checkout-Attempt': attempt.current.id}, body});
      const data = await response.json();
      if (!response.ok) { if (response.status === 409) attempt.current.id = ''; throw new Error(data.error || 'Could not start checkout.'); }
      window.location.assign(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start checkout.'); running.current = false; setBusy(false); }
  }
  return <section style={{border: '1px solid #b8cfc5', background: '#edf5f0', padding: 18, marginBottom: 20}}>
    <h3 style={{fontWeight: 700, fontSize: 18}}>Marco Polo Rugs — test rug checkout</h3>
    <p style={{margin: '10px 0'}}>Owner test only. Pay the cart total with a Stripe test card. Free padding is included with every rug. This creates a separate test order; no money, shipment or inventory change.</p>
    <p>Use 4242 4242 4242 4242, a future expiry, and CVC 123. For a declined card, use 4000 0000 0000 0002.</p>
    {error && <p role="alert" style={{color: '#9b281e', marginTop: 12}}>{error}</p>}
    <button type="button" disabled={busy} onClick={start} style={{background: '#183e35', color: 'white', padding: '14px 18px', marginTop: 14, opacity: busy ? .5 : 1}}>{busy ? 'Opening secure checkout…' : 'Test rug payment with Stripe'}</button>
    <p style={{marginTop: 12}}><a href="/checkout/result" style={{textDecoration: 'underline'}}>View test orders</a></p>
  </section>;
}
