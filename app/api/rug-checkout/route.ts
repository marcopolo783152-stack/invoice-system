import {checkoutOriginKnown} from '@/lib/server/checkout-region.mjs';
import { isRugOnReviewHold } from '@/lib/catalog-visibility.mjs';
import {NextRequest} from 'next/server';
import {createHash} from 'node:crypto';
import Stripe from 'stripe';
import {serverDb} from '@/lib/server/firebase-admin';
import {returnOrigin} from '@/lib/server/stripe-test.mjs';
import {checkoutInput, priceCart, rugSessionParams, CheckoutError} from '@/lib/server/rug-checkout.mjs';
import {checkoutOwner, stripeClient, TEST_ORDERS, json, paymentFailure, applySession} from '@/lib/server/rug-payment';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await checkoutOwner(req);
    const origin = returnOrigin(req.nextUrl.origin, process.env.NODE_ENV === 'production');
    if (req.headers.get('origin') !== origin) throw new CheckoutError('Start checkout from Marco Polo Rugs.', 403);
    const stripe = stripeClient();
    if (!process.env.STRIPE_TEST_WEBHOOK_SECRET?.trim().startsWith('whsec_')) throw new CheckoutError('Add the Stripe test webhook signing secret before testing rug orders.', 503);
    const attempt = req.headers.get('x-checkout-attempt') || '';
    if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(attempt)) throw new CheckoutError('Please refresh and try again.');
    const raw = await req.text();
    if (raw.length > 12000) throw new CheckoutError('Checkout details are too long.');
    const input = checkoutInput(JSON.parse(raw));
    const fingerprint = createHash('sha256').update(JSON.stringify({input, origin})).digest('hex');
    const id = 'MPR-TEST-' + createHash('sha256').update(user.uid + attempt).digest('hex').slice(0, 24);
    const db = serverDb(), ref = db.collection(TEST_ORDERS).doc(id);
    // Recheck saved inventory even when resuming an existing checkout attempt.
    const currentRugs = await db.getAll(...input.items.map((item: {id:string}) => db.collection('showroom_rugs').doc(item.id)));
    if (currentRugs.some(d => !d.exists || !checkoutOriginKnown(d.data()) || isRugOnReviewHold({...d.data(), id:d.id}))) throw new CheckoutError('An item is unavailable for online checkout.', 409);

    const order = await db.runTransaction(async tx => {
      const existing = (await tx.get(ref)).data();
      if (existing) {
        if (existing.fingerprint !== fingerprint) throw new CheckoutError('The cart changed. Start a new checkout attempt.', 409);
        return existing;
      }
      const rugDocs = await tx.getAll(...input.items.map((item: {id: string}) => db.collection('showroom_rugs').doc(item.id)));
      const promoDocs = input.promoCode ? await tx.get(db.collection('showroom_promocodes').where('code', '==', input.promoCode).limit(2)) : null;
      if (promoDocs && promoDocs.size !== 1) throw new CheckoutError('This promotion is unavailable.');
      const quote = priceCart(input, rugDocs.filter(d => d.exists).map(d => ({...((d.data() || {}) as Record<string, unknown>), id: d.id})), promoDocs?.docs[0]?.data());
      const value = {...quote, id, test: true, ownerUid: user.uid, fingerprint, origin, customerInfo: input.customerInfo,
        deliveryOption: input.deliveryOption, promoCode: input.promoCode, paymentStatus: 'Awaiting payment',
        sessionId: null, createdAt: new Date().toISOString(), expiresAt: Math.floor(Date.now() / 1000) + 3600};
      tx.create(ref, value); return value;
    });
    if (order.paymentStatus === 'Paid') return json({url: origin + '/checkout/result?order=' + id});
    if (order.expiresAt <= Date.now() / 1000) throw new CheckoutError('This checkout expired. Start a new attempt.', 409);
    const session = order.sessionId ? await stripe.checkout.sessions.retrieve(order.sessionId) :
      await stripe.checkout.sessions.create(rugSessionParams(order, origin) as Stripe.Checkout.SessionCreateParams, {idempotencyKey: id});
    if (session.livemode || !session.id.startsWith('cs_test_') || session.amount_total !== order.total) throw new CheckoutError('Stripe returned an unexpected checkout.', 502);
    await ref.update({sessionId: session.id});
    if (session.status !== 'open') return json({url: origin + '/checkout/result?order=' + id});
    const url = new URL(session.url || '');
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new CheckoutError('Invalid checkout address.', 502);
    return json({url: url.href, orderId: id});
  } catch (error) { return paymentFailure(error); }
}
export async function GET(req: NextRequest) {
  try {
    const user = await checkoutOwner(req), id = req.nextUrl.searchParams.get('order');
    if (!id) {
      const docs = await serverDb().collection(TEST_ORDERS).orderBy('createdAt', 'desc').limit(20).get();
      return json({orders: docs.docs.map(d => d.data()).filter(d => d.ownerUid === user.uid).map(d => ({id: d.id, total: d.total, paymentStatus: d.paymentStatus, createdAt: d.createdAt}))});
    }
    if (!/^MPR-TEST-[a-f0-9]{24}$/.test(id)) throw new CheckoutError('Invalid test order.');
    let order = (await serverDb().collection(TEST_ORDERS).doc(id).get()).data();
    if (!order || order.ownerUid !== user.uid) throw new CheckoutError('Test order not found.', 404);
    if (order.sessionId) order = await applySession(id, await stripeClient().checkout.sessions.retrieve(order.sessionId), 'return');
    return json({order: {id: order.id, items: order.items, subtotal: order.subtotal, discount: order.discount, shipping: order.shipping,
      tax: order.tax, total: order.total, paymentStatus: order.paymentStatus, deliveryOption: order.deliveryOption,
      webhookVerified: !!order.webhookVerifiedAt, test: true}});
  } catch (error) { return paymentFailure(error); }
}
