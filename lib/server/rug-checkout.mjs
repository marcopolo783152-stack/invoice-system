// All prices come from inventory documents, never from browser totals.
export class CheckoutError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function checkoutInput(body) {
  if (!Array.isArray(body?.items) || !body.items.length || body.items.length > 20) throw new CheckoutError('Choose between 1 and 20 rugs.');
  const seen = new Set();
  const items = body.items.map(item => {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(item?.id || '') || item.quantity !== 1 || seen.has(item.id)) throw new CheckoutError('Each unique rug can be purchased once. Check your cart quantities.');
    seen.add(item.id); return {id: item.id, quantity: 1};
  });
  if (!['Pickup', 'Delivery'].includes(body.deliveryOption)) throw new CheckoutError('Choose pickup or delivery.');
  const text = (value, max, required = true) => {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new CheckoutError('Please check your contact and delivery details.');
    return value.trim();
  };
  const c = body.customerInfo || {};
  const customerInfo = {name: text(c.name, 150), email: text(c.email, 254), phone: text(c.phone, 40),
    shippingAddress: text(c.shippingAddress, 700), billingAddress: text(c.billingAddress, 700), notes: text(c.notes || '', 2000, false)};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) throw new CheckoutError('Enter a valid email.');
  const promoCode = text(body.promoCode || '', 80, false);
  return {items, customerInfo, deliveryOption: body.deliveryOption, promoCode};
}
export function priceCart(input, rugs, promo, now = Date.now()) {
  const items = input.items.map(({id}) => {
    const rug = rugs.find(r => r.id === id);
    if (!rug || rug.availability !== 'In Stock') throw new CheckoutError('A rug is no longer available. Please refresh your cart.', 409);
    if (typeof rug.price !== 'number' || !Number.isFinite(rug.price) || rug.price <= 0) throw new CheckoutError('A rug price needs showroom review.', 409);
    const unitAmount = Math.round(rug.price * 100);
    if (!Number.isSafeInteger(unitAmount) || unitAmount > 99999999) throw new CheckoutError('Please contact Marco Polo Rugs about this order.');
    const size = rug.sizeCategory || '';
    const weight = rug.weightLbs || (size.includes('8x10') ? 4.5 : size.includes('9x12') ? 6.5 : size.includes('6x9') ? 3.5 : size.includes('10x13') ? 8 : size.includes('Runner') ? 2.8 : 3.5);
    return {id, name: String(rug.name || 'Rug').slice(0, 150), sku: String(rug.sku || '').slice(0, 100), quantity: 1, unitAmount,
      shippingWeight: rug.isFreeShipping ? 0 : weight, freePadding: true};
  });
  const subtotal = items.reduce((n, i) => n + i.unitAmount, 0);
  let discount = 0;
  if (input.promoCode) {
    if (!promo || promo.code !== input.promoCode || promo.isActive !== true || (promo.oneTimeUse && (promo.usedAt || promo.usedBy || promo.usedCount > 0)) ||
        (promo.validUntil && (!Number.isFinite(Date.parse(promo.validUntil)) || Date.parse(promo.validUntil) < now))) throw new CheckoutError('This promotion is unavailable. Remove it and try again.');
    if (!['percentage', 'fixed', 'free_shipping'].includes(promo.discountType)) throw new CheckoutError('Invalid promotion.');
    if (promo.discountType !== 'free_shipping') {
      if (!Number.isFinite(promo.discountValue) || promo.discountValue < 0 || (promo.discountType === 'percentage' && promo.discountValue > 100)) throw new CheckoutError('Invalid promotion.');
      discount = Math.min(subtotal, Math.round(promo.discountType === 'percentage' ? subtotal * promo.discountValue / 100 : promo.discountValue * 100));
    }
  }
  const weight = items.reduce((n, i) => n + i.shippingWeight, 0);
  if (!Number.isFinite(weight) || weight < 0) throw new CheckoutError('Shipping needs showroom review.');
  const shipping = input.deliveryOption === 'Pickup' || weight === 0 || promo?.discountType === 'free_shipping' ? 0 : weight <= 1.9 ? 800 : weight >= 2 && weight <= 5 ? 1600 : 4500;
  // Preserve the existing site's 6% estimate for sandbox testing only.
  const tax = Math.round((subtotal - discount) * 0.06);
  const total = subtotal - discount + shipping + tax;
  if (total < 50 || total > 99999999) throw new CheckoutError('Please contact Marco Polo Rugs about this order total.');
  return {items, subtotal, discount, shipping, tax, total, currency: 'usd', freePadding: true};
}
export function rugSessionParams(order, origin) {
  // Allocate discounts in cents so Stripe's item sum is exactly the quoted total.
  let remaining = order.discount;
  const line_items = order.items.map((item, index) => {
    const reduction = index === order.items.length - 1 ? remaining : Math.min(remaining, Math.floor(order.discount * item.unitAmount / order.subtotal));
    remaining -= reduction;
    return {quantity: 1, price_data: {currency: 'usd', unit_amount: item.unitAmount - reduction,
      product_data: {name: 'Marco Polo Rugs — ' + item.name, description: 'Complimentary rug padding included. SANDBOX TEST — no purchase or shipment.'}}};
  });
  if (order.shipping) line_items.push({quantity: 1, price_data: {currency: 'usd', unit_amount: order.shipping, product_data: {name: 'Marco Polo Rugs — delivery', description: 'Sandbox delivery estimate'}}});
  if (order.tax) line_items.push({quantity: 1, price_data: {currency: 'usd', unit_amount: order.tax, product_data: {name: 'Marco Polo Rugs — sales tax estimate', description: 'Sandbox calculation at the existing 6% rate'}}});
  return {mode: 'payment', payment_method_types: ['card'], line_items, customer_email: order.customerInfo.email,
    client_reference_id: order.id, metadata: {purpose: 'marcopolo_rug_test', orderId: order.id, ownerUid: order.ownerUid},
    branding_settings: {display_name: 'Marco Polo Rugs'},
    custom_text: {submit: {message: 'Marco Polo Rugs sandbox test. Free padding with every rug. No real payment or shipment.'}},
    payment_intent_data: {description: 'Marco Polo Rugs — sandbox order ' + order.id},
    success_url: origin + '/checkout/result?order=' + order.id,
    cancel_url: origin + '/checkout/result?order=' + order.id + '&cancelled=1', expires_at: order.expiresAt};
}
export function verifiedStatus(order, session) {
  if (order.test !== true || session.livemode !== false || !session.id?.startsWith('cs_test_') || session.id !== order.sessionId ||
      session.metadata?.purpose !== 'marcopolo_rug_test' || session.metadata?.orderId !== order.id || session.metadata?.ownerUid !== order.ownerUid ||
      session.amount_total !== order.total || session.currency !== 'usd') throw new CheckoutError('Payment does not match this Marco Polo Rugs order.', 409);
  if (session.status === 'complete' && session.payment_status === 'paid') return 'Paid';
  return session.status === 'expired' ? 'Expired' : 'Awaiting payment';
}
export function paymentUpdate(order, session, source, now = new Date().toISOString()) {
  const status = verifiedStatus(order, session);
  // Retries, duplicate events and out-of-order expiration cannot undo a verified payment.
  return {paymentStatus: order.paymentStatus === 'Paid' ? 'Paid' : status,
    ...(status === 'Paid' && !order.paidAt ? {paidAt: now} : {}),
    ...(source === 'webhook' ? {webhookVerifiedAt: now} : {returnVerifiedAt: now})};
}
