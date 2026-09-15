import {NextRequest} from 'next/server';
import Stripe from 'stripe';
import {applySession, json, stripeClient} from '@/lib/server/rug-payment';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_TEST_WEBHOOK_SECRET?.trim();
  if (!secret?.startsWith('whsec_')) return json({error: 'Webhook is not configured.'}, 503);
  let event: Stripe.Event;
  try {
    const raw = await req.text();
    if (raw.length > 1000000) return json({error: 'Payload too large.'}, 413);
    event = stripeClient().webhooks.constructEvent(raw, req.headers.get('stripe-signature') || '', secret);
  } catch { return json({error: 'Invalid webhook signature.'}, 400); }
  if (event.livemode) return json({error: 'Only sandbox events are accepted.'}, 400);
  if (!['checkout.session.completed', 'checkout.session.expired', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed'].includes(event.type)) return json({received: true});
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.metadata?.purpose !== 'marcopolo_rug_test') return json({received: true});
  const id = session.metadata?.orderId || '';
  if (!/^MPR-TEST-[a-f0-9]{24}$/.test(id)) return json({error: 'Invalid order reference.'}, 400);
  try { await applySession(id, session, 'webhook'); return json({received: true}); }
  catch { return json({error: 'Order update failed; retry required.'}, 500); }
}
