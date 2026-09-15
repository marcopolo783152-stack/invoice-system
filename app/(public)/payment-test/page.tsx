'use client';
import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/auth';

export default function PaymentTest() {
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Checking your sign-in…'), [error, setError] = useState('');
  const [result, setResult] = useState<{paid: boolean; id: string; status: string} | null>(null);
  const attempt = useRef('');
  async function check() {
    setError(''); setReady(false); setResult(null);
    if (!auth.currentUser) { setMessage('Sign in with your website owner account, then return to this page.'); return; }
    try {
      const session = new URLSearchParams(window.location.search).get('session_id');
      const res = await fetch('/api/stripe-test' + (session ? '?session_id=' + encodeURIComponent(session) : ''), {
        headers: {Authorization: 'Bearer ' + await auth.currentUser.getIdToken()}, cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not check the connection.');
      setReady(true);
      if (session) {
        setResult(data);
        setMessage(data.paid ? 'Test payment successful — verified directly with Stripe. No real money was charged.' : 'The test payment is not complete. You can check again or start another test.');
      } else setMessage(new URLSearchParams(window.location.search).has('cancelled') ? 'Checkout was cancelled. No real money was charged. You can start again.' : 'Test key configured. Start checkout to verify the connection with Stripe.');
    } catch (e) { setMessage(''); setError(e instanceof Error ? e.message : 'Could not check the connection.'); }
  }
  useEffect(() => onAuthStateChanged(auth, () => { void check(); }), []);
  async function start() {
    if (busy || !auth.currentUser) return;
    setBusy(true); setError('');
    if (!attempt.current) attempt.current = crypto.randomUUID();
    try {
      const response = await fetch('/api/stripe-test', {method: 'POST', headers: {
        Authorization: 'Bearer ' + await auth.currentUser.getIdToken(), 'X-Test-Attempt': attempt.current,
      }});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not open Stripe.');
      window.location.assign(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not open Stripe.'); setBusy(false); }
  }
  return <main style={{maxWidth: 660, margin: '48px auto', padding: 24, background: '#fff', color: '#183e35', border: '1px solid #d8dfdb', borderRadius: 16}}>
    <p style={{fontWeight: 700}}>MARCO POLO RUGS · OWNER PAYMENT TEST</p>
    <h1 style={{fontSize: 30, margin: '16px 0'}}>Test your Stripe connection</h1>
    <p>This is a $1.00 simulated payment. No purchase, shipment or inventory change is created.</p>
    <p style={{margin: '16px 0'}}>Use only Stripe test card details on the next page:</p>
    <dl><dt>Card number</dt><dd><strong>4242 4242 4242 4242</strong></dd><dt>Expiry</dt><dd>Any future date</dd><dt>CVC</dt><dd>Any three digits, such as 123</dd></dl>
    <p style={{margin: '16px 0'}}>To test a decline, use <strong>4000 0000 0000 0002</strong>.</p>
    {message && <p role="status" style={{padding: 16, background: '#eef5f1'}}>{message}</p>}
    {error && <p role="alert" style={{padding: 16, background: '#fff0ed', color: '#8c2b1e'}}>{error}</p>}
    {result && <p style={{overflowWrap: 'anywhere'}}>Stripe test reference: {result.id}</p>}
    <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', margin: '20px 0'}}>
      <button disabled={!ready || busy} onClick={start} style={{padding: '12px 20px', borderRadius: 8, background: '#183e35', color: 'white', opacity: !ready || busy ? .5 : 1}}>{busy ? 'Opening Stripe…' : 'Start $1 test checkout'}</button>
      <button disabled={busy} onClick={() => { void check(); }} style={{padding: 12, border: '1px solid #ccc', borderRadius: 8}}>Check again</button>
    </div>
    <p><a href="/staff-login" style={{textDecoration: 'underline'}}>Staff sign in</a> · <a href="/" style={{textDecoration: 'underline'}}>Return to showroom</a></p>
    <p style={{marginTop: 20, fontSize: 14}}>Customer online checkout is not enabled by this test. Never enter a real card here.</p>
  </main>;
}
