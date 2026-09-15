import 'server-only';
import Stripe from 'stripe';
import {NextRequest, NextResponse} from 'next/server';
import {caller, serverDb} from './firebase-admin';
import {OWNER_UID, OWNER_EMAIL} from '@/lib/access-policy';
import {testKey} from './stripe-test.mjs';
import {CheckoutError, paymentUpdate} from './rug-checkout.mjs';

export const TEST_ORDERS = 'showroom_stripe_test_orders';
export const json = (body: unknown, status = 200) => NextResponse.json(body, {status, headers: {'Cache-Control': 'no-store'}});
export function stripeClient() { return new Stripe(testKey(process.env.STRIPE_TEST_SECRET_KEY), {maxNetworkRetries: 2, timeout: 15000}); }
export async function checkoutOwner(req: NextRequest) {
  const user = await caller(req);
  if (!user.email_verified || user.uid !== OWNER_UID || user.email?.toLowerCase() !== OWNER_EMAIL) throw new CheckoutError('Rug checkout testing is available only to the Marco Polo Rugs owner.', 403);
  return user;
}
export function paymentFailure(error: unknown) {
  if (error instanceof CheckoutError) return json({error: error.message}, error.status);
  // Never return raw SDK errors, credentials or customer details.
  return json({error: 'Marco Polo Rugs could not complete this request. Check your sign-in and payment configuration, then retry.'}, 503);
}
export async function applySession(id: string, session: Stripe.Checkout.Session, source: string) {
  const db = serverDb(), ref = db.collection(TEST_ORDERS).doc(id);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref), order = snap.data();
    if (!order) throw new CheckoutError('Test order not found.', 404);
    const update = paymentUpdate(order, session, source);
    tx.update(ref, update);
    return {...order, ...update};
  });
}
