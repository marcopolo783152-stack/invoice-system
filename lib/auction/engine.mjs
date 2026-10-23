// Pure auction rules. All money is integer USD cents; time comes from the server.
export const POLICY_VERSION = 'auction-draft-2026-09-19';
export const PUBLIC_BIDDING_ENABLED = false;
export const EXTENSION_MS = 120000;
export const PAYMENT_WINDOW_MS = 48 * 60 * 60 * 1000;
export function check(condition, message) { if (!condition) throw new Error(message); }
export function cents(value) {
  const n = Number(value);
  check(Number.isSafeInteger(n) && n >= 0 && n <= 100000000, 'Invalid money amount.');
  return n;
}
export function increment(amount) {
  return amount < 10000 ? 500 : amount < 50000 ? 1000 : amount < 100000 ? 2500 : amount < 500000 ? 5000 : 10000;
}
export function validateProfile(input) {
  const result = {};
  for (const key of ['firstName','lastName','phone','address1','city','region','postalCode','country']) {
    const value = typeof input[key] === 'string' ? input[key].trim() : '';
    check(value.length > 0 && value.length <= 150, `Please enter ${key}.`);
    result[key] = value;
  }
  check(/^\+[1-9]\d{7,14}$/.test(result.phone), 'Use international phone format, for example +17035551234.');
  check(/^[A-Z]{2}$/.test(result.country), 'Use a two-letter country code, for example US.');
  return result;
}
export function bidderRequirements(profile, verifiedEmail, verifiedPhone, payment) {
  return {
    profile: !!profile && ['firstName','lastName','phone','address1','city','region','postalCode','country'].every(k => !!profile[k]),
    email: verifiedEmail === true,
    phone: !!profile?.phone && verifiedPhone === profile.phone,
    payment: payment?.verified === true && payment?.mode === 'live',
    terms: profile?.acceptedPolicyVersion === POLICY_VERSION,
  };
}
export function assertPublicBidAllowed() {
  check(PUBLIC_BIDDING_ENABLED, 'Public bidding is closed while payment approval and launch checks are pending.');
}
export function validateLot(input, now) {
  const title = String(input.title || '').trim();
  const condition = String(input.condition || '').trim();
  check(title.length >= 3 && title.length <= 160, 'Enter a lot title (3–160 characters).');
  check(condition.length >= 10 && condition.length <= 3000, 'Add a condition report (10–3000 characters).');
  const startAt = Number(input.startAt), endAt = Number(input.endAt);
  check(Number.isSafeInteger(startAt) && Number.isSafeInteger(endAt) && endAt > Math.max(now, startAt) && endAt - startAt >= 60000, 'Closing time must be after opening time and in the future.');
  const startingCents = cents(input.startingCents), reserveCents = cents(input.reserveCents || 0);
  check(startingCents >= 100, 'Starting bid must be at least $1.');
  check(!reserveCents || reserveCents >= startingCents, 'Reserve must be at least the starting bid.');
  return { title, condition, startAt, endAt, startingCents, reserveCents,
    loadingCents: cents(input.loadingCents || 0), buyerPremiumBps: 0,
    status: 'draft', currentCents: startingCents, leaderId: '', bidCount: 0,
    version: 1, mode: 'sandbox', policyVersion: POLICY_VERSION };
}
export function validateDelivery(input) {
  check(['pickup_self','pickup_assisted','shipping'].includes(input?.method), 'Choose shipping or a pickup option.');
  if (input.method === 'shipping') {
    check(typeof input.address === 'string' && input.address.trim().length >= 10 && input.address.length <= 600, 'Enter the shipping address.');
    return { method: 'shipping', address: input.address.trim() };
  }
  return { method: input.method, address: '' };
}
export function placeMaximum(lot, existing, bidderId, maximumCents, delivery, now) {
  check(lot.mode === 'sandbox', 'This engine is restricted to the staff sandbox.');
  check(lot.status === 'scheduled' && now >= lot.startAt && now < lot.endAt, 'This lot is not open for bidding.');
  maximumCents = cents(maximumCents);
  const previous = existing.find(b => b.bidderId === bidderId);
  const minimum = lot.bidCount === 0 ? lot.startingCents : lot.currentCents + increment(lot.currentCents);
  check(maximumCents >= (lot.leaderId === bidderId && previous ? previous.maximumCents + 1 : minimum), 'Your maximum must exceed your previous maximum or meet the next minimum bid.');
  const next = existing.filter(b => b.bidderId !== bidderId);
  next.push({bidderId, maximumCents, sequence: lot.bidCount + 1, delivery: validateDelivery(delivery)});
  next.sort((a,b) => b.maximumCents - a.maximumCents || a.sequence - b.sequence);
  const top = next[0], second = next[1];
  let currentCents = second ? Math.min(top.maximumCents, second.maximumCents + increment(second.maximumCents)) : lot.startingCents;
  if (lot.reserveCents) currentCents = Math.max(currentCents, Math.min(top.maximumCents, lot.reserveCents));
  currentCents = Math.max(lot.currentCents, currentCents);
  const endAt = lot.endAt - now <= EXTENSION_MS ? now + EXTENSION_MS : lot.endAt;
  return { bidders: next, lot: {...lot, currentCents, leaderId: top.bidderId, bidCount: lot.bidCount + 1, endAt, version: lot.version + 1} };
}
export function settle(lot, now) {
  check(lot.mode === 'sandbox' && lot.status === 'scheduled' && now >= lot.endAt, 'The lot has not closed yet.');
  const sold = !!lot.leaderId && lot.currentCents >= lot.reserveCents;
  return {...lot, status: sold ? 'sold' : 'unsold', paymentStatus: sold ? 'unpaid' : 'not_due',
    fulfillmentStatus: 'not_ready', paymentDueAt: sold ? lot.endAt + PAYMENT_WINDOW_MS : null, version: lot.version + 1};
}
