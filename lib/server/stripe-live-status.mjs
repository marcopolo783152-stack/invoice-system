// Server-only configuration checks. This module never creates a payment.
export const MARCO_POLO_STRIPE_ACCOUNT = 'acct_1UFwpwEwq0Jt8pyt';

export class LiveConnectionError extends Error {
  constructor(message) { super(message); this.name = 'LiveConnectionError'; }
}

export function liveSecret(value) {
  const key = typeof value === 'string' ? value.trim() : '';
  if (!/^sk_live_[A-Za-z0-9]+$/.test(key)) {
    throw new LiveConnectionError('Save a live secret key as STRIPE_LIVE_SECRET_KEY in Vercel, then redeploy.');
  }
  return key;
}

export async function inspectLiveConnection(accountReader, webhookSecret) {
  let account;
  try { account = await accountReader(); }
  catch {
    // Raw provider errors may include sensitive configuration. Never forward them.
    throw new LiveConnectionError('Stripe could not verify the connection. Check the saved live key and retry.');
  }
  if (account?.id !== MARCO_POLO_STRIPE_ACCOUNT) {
    throw new LiveConnectionError('This key belongs to a different Stripe account. Use the Marco Polo Rugs account ending 8pyt.');
  }
  return {
    accountId: MARCO_POLO_STRIPE_ACCOUNT,
    paymentsEnabled: account.charges_enabled === true,
    payoutsEnabled: account.payouts_enabled === true,
    webhookSecretSaved: typeof webhookSecret === 'string' && /^whsec_[A-Za-z0-9]+$/.test(webhookSecret.trim()),
    checkoutEnabled: false,
    // Account capability is not proof that our application is ready to take orders.
    checkedAt: new Date().toISOString(),
  };
}
