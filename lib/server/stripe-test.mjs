// Test-only Stripe connection. Never import this module into a client component.
export class StripeTestError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function testKey(value) {
  const key = (value || '').trim();
  if (!/^sk_test_[A-Za-z0-9]+$/.test(key)) {
    throw new StripeTestError('Add STRIPE_TEST_SECRET_KEY in Vercel using a Stripe sandbox secret key beginning sk_test_. Live keys are not accepted.', 503);
  }
  return key;
}
export function returnOrigin(origin, production = true) {
  const allowed = ['https://marcopolorugs.com', 'https://www.marcopolorugs.com', 'https://invoice-system-six.vercel.app'];
  if (!production) allowed.push('http://localhost:3000');
  if (!allowed.includes(origin)) throw new StripeTestError('Open this test from marcopolorugs.com.', 403);
  return origin;
}
export function checkoutParams(uid, origin) {
  return new URLSearchParams({
    mode: 'payment',
    'payment_method_types[0]': 'card',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': '100',
    'line_items[0][price_data][product_data][name]': 'Marco Polo Rugs — TEST ONLY — no purchase',
    'line_items[0][quantity]': '1',
    'metadata[purpose]': 'marcopolo_connection_test',
    'metadata[owner_uid]': uid,
    success_url: origin + '/payment-test?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: origin + '/payment-test?cancelled=1',
  });
}
export function sessionResult(session, uid) {
  if (session.livemode !== false || !session.id?.startsWith('cs_test_') ||
      session.metadata?.purpose !== 'marcopolo_connection_test' || session.metadata?.owner_uid !== uid ||
      session.amount_total !== 100 || session.currency !== 'usd') {
    throw new StripeTestError('This is not a matching Marco Polo Rugs test payment.', 403);
  }
  return { id: session.id, paid: session.status === 'complete' && session.payment_status === 'paid',
    status: session.status, amount: 100, currency: 'usd', test: true };
}
export async function stripeRequest(key, path, options = {}, fetcher = fetch) {
  const response = await fetcher('https://api.stripe.com/v1/checkout/sessions' + path, {
    ...options, cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { ...options.headers, Authorization: 'Bearer ' + testKey(key) },
  });
  if (!response.ok) {
    // Do not expose Stripe's raw response, which may contain account information.
    throw new StripeTestError(response.status === 401 ? 'Stripe rejected the test key. Check the sandbox key in Vercel.' :
      'Stripe could not complete the test request. Please retry or check the Stripe sandbox logs.', 502);
  }
  return response.json();
}
