import test from 'node:test';
import assert from 'node:assert/strict';
import {liveSecret, inspectLiveConnection, MARCO_POLO_STRIPE_ACCOUNT} from '../../lib/server/stripe-live-status.mjs';

test('requires a live secret and never repeats rejected credentials', () => {
  for (const value of [undefined, null, 12, '', 'sk_test_example', 'pk_live_example', 'sk_live_bad value']) {
    assert.throws(() => liveSecret(value), {message: 'Save a live secret key as STRIPE_LIVE_SECRET_KEY in Vercel, then redeploy.'});
  }
  assert.equal(liveSecret(' sk_live_fakeOnlyForUnitTests '), 'sk_live_fakeOnlyForUnitTests');
});

test('verifies the exact account and exposes only the allowlisted status fields', async () => {
  let calls = 0;
  const result = await inspectLiveConnection(async () => {
    calls++;
    return {id: MARCO_POLO_STRIPE_ACCOUNT, charges_enabled:true, payouts_enabled:true, email:'private@example.com', external_accounts:{data:['bank-secret']}};
  }, 'whsec_testPlaceholder');
  assert.equal(calls,1);
  assert.equal(result.paymentsEnabled,true);
  assert.equal(result.payoutsEnabled,true);
  assert.equal(result.webhookSecretSaved,true);
  assert.equal(result.checkoutEnabled,false);
  assert.deepEqual(Object.keys(result).sort(),['accountId','checkedAt','checkoutEnabled','paymentsEnabled','payoutsEnabled','webhookSecretSaved'].sort());
  assert.ok(Number.isFinite(Date.parse(result.checkedAt)));
  assert.equal(JSON.stringify(result).includes('private@example.com'),false);
});

test('a different or missing account is rejected even when it can accept payments', async () => {
  for (const account of [undefined, {}, {id:'acct_different',charges_enabled:true,payouts_enabled:true}]) {
    await assert.rejects(inspectLiveConnection(async () => account), /different Stripe account/);
  }
});

test('provider errors and their sensitive contents are never exposed', async () => {
  await assert.rejects(inspectLiveConnection(async () => {throw new Error('sk_live_sensitive private-customer bank-account');}), error => {
    assert.equal(error.message.includes('sensitive'),false);
    assert.equal(error.message.includes('private-customer'),false);
    return error.message.includes('could not verify');
  });
});

test('payout status is independent from charges and missing capabilities fail closed', async () => {
  const account = {id:MARCO_POLO_STRIPE_ACCOUNT,charges_enabled:true,payouts_enabled:false};
  const result = await inspectLiveConnection(async () => account, 'not-a-secret');
  assert.equal(result.paymentsEnabled,true);
  assert.equal(result.payoutsEnabled,false);
  assert.equal(result.webhookSecretSaved,false);
  const missing = await inspectLiveConnection(async () => ({id:MARCO_POLO_STRIPE_ACCOUNT}));
  assert.equal(missing.paymentsEnabled,false);
  assert.equal(missing.payoutsEnabled,false);
  assert.equal(missing.checkoutEnabled,false);
});
