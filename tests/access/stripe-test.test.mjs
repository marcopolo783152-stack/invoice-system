import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testKey, returnOrigin, checkoutParams, sessionResult, stripeRequest} from '../../lib/server/stripe-test.mjs';
const session = {id: 'cs_test_example', livemode: false, metadata: {purpose: 'marcopolo_connection_test', owner_uid: 'owner'}, amount_total: 100, currency: 'usd', status: 'complete', payment_status: 'paid'};
test('reject missing and live keys before any network request', async () => {
  let called = false;
  for (const key of ['', 'sk_live_example', 'pk_test_example']) {
    assert.throws(() => testKey(key));
    await assert.rejects(stripeRequest(key, '', {}, async () => {called = true;}));
  }
  assert.equal(called, false);
});
test('fixed test amount and allowed return destinations only', () => {
  assert.throws(() => returnOrigin('https://attacker.example'));
  assert.throws(() => returnOrigin('http://localhost:3000'));
  const body = checkoutParams('owner', returnOrigin('https://marcopolorugs.com'));
  assert.equal(body.get('line_items[0][price_data][unit_amount]'), '100');
  assert.equal(body.get('line_items[0][quantity]'), '1');
  assert.match(body.get('success_url'), /\/payment-test\?session_id=\{CHECKOUT_SESSION_ID\}$/);
});
test('paid requires matching owner, purpose, test mode, amount and completion', () => {
  assert.equal(sessionResult(session, 'owner').paid, true);
  for (const change of [{livemode: true}, {currency: 'eur'}, {amount_total: 1}, {metadata: {}}, {id: 'cs_live_example'}]) {
    assert.throws(() => sessionResult({...session, ...change}, 'owner'));
  }
  assert.throws(() => sessionResult(session, 'other-user'));
  assert.equal(sessionResult({...session, payment_status: 'unpaid'}, 'owner').paid, false);
  assert.equal(sessionResult({...session, status: 'open'}, 'owner').paid, false);
});
test('Stripe failures never expose raw responses or credentials', async () => {
  await assert.rejects(stripeRequest('sk_test_fake', '', {}, async () => ({ok: false, status: 401, json: async () => ({error: {message: 'SECRET'}})})), error => {
    assert.doesNotMatch(error.message, /SECRET|sk_test_fake/); return true;
  });
});
test('request uses fixed Stripe endpoint and returns only selected session fields', async () => {
  const result = await stripeRequest('sk_test_fake', '/cs_test_example', {}, async (url, options) => {
    assert.equal(url, 'https://api.stripe.com/v1/checkout/sessions/cs_test_example');
    assert.equal(options.headers.Authorization, 'Bearer sk_test_fake');
    assert.equal(options.cache, 'no-store');
    return {ok: true, json: async () => ({...session, customer_details: {email: 'private@example.com'}})};
  });
  assert.equal('customer_details' in sessionResult(result, 'owner'), false);
});
