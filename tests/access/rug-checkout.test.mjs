import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {checkoutInput, priceCart, rugSessionParams, verifiedStatus, paymentUpdate} from '../../lib/server/rug-checkout.mjs';
const input = {items: [{id: 'rug-1', quantity: 1}], deliveryOption: 'Delivery', promoCode: '', customerInfo: {name: 'Test', email: 'test@example.com', phone: '7034610207', shippingAddress: 'Alexandria', billingAddress: 'Alexandria'}};
const rugs = [{id: 'rug-1', name: 'Persian rug', price: 100.01, availability: 'In Stock', sizeCategory: '6x9'}];
const order = () => ({...priceCart(input, rugs), ...input, items: priceCart(input, rugs).items, id: 'MPR-TEST-abc', ownerUid: 'owner', test: true, paymentStatus: 'Awaiting payment', sessionId: 'cs_test_123', expiresAt: 2000000000});
const session = o => ({id: o.sessionId, livemode: false, currency: 'usd', amount_total: o.total, status: 'complete', payment_status: 'paid', metadata: {purpose: 'marcopolo_rug_test', ownerUid: o.ownerUid, orderId: o.id}});
test('server inventory determines amount; browser prices and totals are ignored', () => {
  const parsed = checkoutInput({...input, total: 1, items: [{id: 'rug-1', quantity: 1, price: 0.01}]});
  const quote = priceCart(parsed, rugs);
  assert.equal(quote.subtotal, 10001); assert.equal(quote.tax, 600); assert.equal(quote.shipping, 1600); assert.equal(quote.total, 12201);
  assert.equal(quote.items[0].freePadding, true);
});
test('unavailable rugs, duplicate IDs, quantity manipulation and invalid contact are rejected', () => {
  assert.throws(() => priceCart(input, [{...rugs[0], availability: 'Sold'}]));
  assert.throws(() => checkoutInput({...input, items: [...input.items, ...input.items]}));
  for (const quantity of [0, 2, -1, 1.5, '1']) assert.throws(() => checkoutInput({...input, items: [{id: 'rug-1', quantity}]}));
  assert.throws(() => checkoutInput({...input, customerInfo: {...input.customerInfo, email: 'invalid'}}));
});
test('promotions are validated and free shipping does not reduce the rug price', () => {
  const i = {...input, promoCode: 'FREE'};
  const p = {code: 'FREE', isActive: true, discountType: 'free_shipping', discountValue: 120};
  assert.equal(priceCart(i, rugs, p).shipping, 0); assert.equal(priceCart(i, rugs, p).discount, 0);
  assert.equal(priceCart({...input, deliveryOption: 'Pickup'}, rugs).shipping, 0);
  assert.throws(() => priceCart(i, rugs, {...p, isActive: false}));
  assert.throws(() => priceCart(i, rugs, {...p, validUntil: '2020-01-01'}));
  assert.throws(() => priceCart(i, rugs, {...p, oneTimeUse: true, usedCount: 1}));
});
test('Stripe line items reconcile exactly after discount rounding and use Marco Polo Rugs branding', () => {
  const i = {...input, items: [{id: 'rug-1', quantity: 1}, {id: 'rug-2', quantity: 1}], promoCode: 'SALE'};
  const quote = priceCart(i, [...rugs, {...rugs[0], id: 'rug-2', price: 233.33}], {code: 'SALE', isActive: true, discountType: 'percentage', discountValue: 15});
  const params = rugSessionParams({...order(), ...quote}, 'https://marcopolorugs.com');
  assert.equal(params.line_items.reduce((n, item) => n + item.price_data.unit_amount * item.quantity, 0), quote.total);
  assert.equal(params.branding_settings.display_name, 'Marco Polo Rugs');
  assert.ok(params.line_items.every(item => item.price_data.product_data.name.startsWith('Marco Polo Rugs')));
  assert.deepEqual(params.payment_method_types, ['card']);
});
test('paid requires verified mode, session, owner, order, amount and currency', () => {
  const o = order(), s = session(o); assert.equal(verifiedStatus(o, s), 'Paid');
  for (const change of [{livemode: true}, {id: 'cs_test_other'}, {amount_total: 1}, {currency: 'eur'}, {metadata: {...s.metadata, ownerUid: 'other'}}, {metadata: {...s.metadata, orderId: 'other'}}]) assert.throws(() => verifiedStatus(o, {...s, ...change}));
  assert.equal(verifiedStatus(o, {...s, payment_status: 'unpaid'}), 'Awaiting payment');
});
test('duplicate notifications preserve paid timestamp and cannot downgrade a paid order', () => {
  const o = order(), s = session(o);
  const paid = {...o, ...paymentUpdate(o, s, 'webhook', 'first')};
  const again = {...paid, ...paymentUpdate(paid, s, 'return', 'later')};
  assert.equal(again.paidAt, 'first'); assert.equal(again.webhookVerifiedAt, 'first');
  assert.equal(paymentUpdate(again, {...s, status: 'expired', payment_status: 'unpaid'}, 'webhook').paymentStatus, 'Paid');
});
test('Stripe SDK rejects forged, altered and stale webhook signatures', () => {
  const stripe = new Stripe('sk_test_placeholder'), secret = 'whsec_test_fixture';
  const payload = JSON.stringify({id: 'evt_test', type: 'checkout.session.completed', data: {object: session(order())}});
  const header = stripe.webhooks.generateTestHeaderString({payload, secret});
  assert.equal(stripe.webhooks.constructEvent(payload, header, secret).id, 'evt_test');
  assert.throws(() => stripe.webhooks.constructEvent(payload + ' ', header, secret));
  assert.throws(() => stripe.webhooks.constructEvent(payload, header, 'whsec_wrong'));
  const stale = stripe.webhooks.generateTestHeaderString({payload, secret, timestamp: Math.floor(Date.now() / 1000) - 600});
  assert.throws(() => stripe.webhooks.constructEvent(payload, stale, secret));
});
test('server pricing rejects held origins and flagged IDs even if browser requests them directly', () => {
  assert.throws(() => priceCart(input, [{...rugs[0], origin: 'Iran'}]));
  const id = 'rug-1783796714385';
  assert.throws(() => priceCart({...input, items: [{id, quantity: 1}]}, [{...rugs[0], id, origin: 'Unknown'}]));
  assert.ok(priceCart(input, [{...rugs[0], origin: 'Afghanistan'}]).total > 0);
});
