'use client';
import {useEffect, useState} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {auth} from '@/lib/auth';
type TestOrder = {id: string; paymentStatus: string; total: number; subtotal: number; discount: number; tax: number; shipping: number;
  webhookVerified: boolean; deliveryOption: string; items: {id: string; name: string; unitAmount: number}[]};
const money = (cents: number) => new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(cents / 100);
export default function RugCheckoutResult() {
  const [order, setOrder] = useState<TestOrder | null>(null), [orders, setOrders] = useState<TestOrder[]>([]);
  const [error, setError] = useState(''), [busy, setBusy] = useState(true), [cancelled, setCancelled] = useState(false);
  async function check() {
    setBusy(true); setError('');
    try {
      if (!auth.currentUser) throw new Error('Sign in with your Marco Polo Rugs owner account to view test orders.');
      const params = new URLSearchParams(window.location.search), id = params.get('order');
      setCancelled(params.has('cancelled'));
      const response = await fetch('/api/rug-checkout' + (id ? '?order=' + encodeURIComponent(id) : ''), {cache: 'no-store', headers: {Authorization: 'Bearer ' + await auth.currentUser.getIdToken()}});
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not load your test order.');
      setOrder(data.order || null); setOrders(data.orders || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load your test order.'); }
    finally { setBusy(false); }
  }
  useEffect(() => onAuthStateChanged(auth, () => { void check(); }), []);
  return <main style={{maxWidth: 760, margin: '40px auto', padding: 24, color: '#183e35', background: '#fff', border: '1px solid #d6dfd9', borderRadius: 16}}>
    <p style={{fontWeight: 700}}>MARCO POLO RUGS</p><h1 style={{fontSize: 28, margin: '12px 0'}}>Rug checkout test</h1>
    <p>Sandbox only. No real payment, shipment or stock change. Customer orders remain separate.</p>
    {busy && <p role="status" style={{marginTop: 20}}>Checking payment…</p>}
    {error && <p role="alert" style={{background: '#fff0ed', color: '#8c2b1e', padding: 16, marginTop: 20}}>{error}</p>}
    {!error && order && <>
      <h2 style={{fontSize: 22, marginTop: 24}}>{order.paymentStatus === 'Paid' ? 'Test payment successful' : order.paymentStatus === 'Expired' ? 'Test checkout expired' : cancelled ? 'You returned without completing checkout' : 'Awaiting test payment'}</h2>
      <p style={{overflowWrap: 'anywhere', margin: '10px 0'}}>Order {order.id}</p>
      <p>Payment status: <strong>{order.paymentStatus}</strong></p>
      <p>{order.webhookVerified ? 'Automatic Stripe webhook received and verified.' : 'Webhook confirmation not received yet. Use Check again after a few seconds.'}</p>
      <ul style={{padding: '16px 0'}}>{order.items.map(item => <li key={item.id} style={{padding: '10px 0', borderBottom: '1px solid #ddd'}}>{item.name} — {money(item.unitAmount)}<br /><small>Free rug padding included</small></li>)}</ul>
      <dl style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: 8}}>
        <dt>Rugs</dt><dd>{money(order.subtotal)}</dd><dt>Promotion</dt><dd>−{money(order.discount)}</dd>
        <dt>{order.deliveryOption === 'Pickup' ? 'Showroom pickup' : 'Delivery'}</dt><dd>{money(order.shipping)}</dd>
        <dt>Tax estimate</dt><dd>{money(order.tax)}</dd><dt><strong>Total</strong></dt><dd><strong>{money(order.total)}</strong></dd>
      </dl>
    </>}
    {!error && !order && !busy && <ul style={{marginTop: 20}}>{orders.length ? orders.map(o => <li key={o.id} style={{padding: '10px 0'}}><a href={'/checkout/result?order=' + o.id} style={{textDecoration: 'underline'}}>{o.id}</a> — {o.paymentStatus} — {money(o.total)}</li>) : <li>No rug test orders yet. Add a rug to your cart to start.</li>}</ul>}
    <div style={{display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginTop: 24}}>
      <button disabled={busy} onClick={() => { void check(); }} style={{padding: '12px 18px', background: '#183e35', color: '#fff', borderRadius: 8}}>Check again</button>
      <a href="/shop">Return to Marco Polo Rugs</a><a href="/checkout/result">Test orders</a><a href="/staff-login">Staff sign in</a>
    </div>
  </main>;
}
