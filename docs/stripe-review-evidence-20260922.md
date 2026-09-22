# Marco Polo Rugs — payment controls review

Prepared 22 September 2026. **Code-review evidence; deployment verification pending.**

This report covers the invoice-system website repository, not other integrations or either Stripe account's Dashboard settings. Do not describe this patch as deployed until the actual production deployment is checked. No live payment or Stripe sandbox API call was performed during this review. Automated checks below use synthetic data and local Stripe signature fixtures.

## Current scope

- The inspected website has owner-only Stripe sandbox checkout. The server requires the exact owner UID/email plus verified email. Public customers cannot use it.
- Stripe clients accept only `sk_test_` keys. Response verification also rejects live sessions. There is no enabled customer live-payment route in the inspected code.
- Auction bidding remains disabled. None of these changes enables payments or bidding.
- This patch does not delete or rewrite stored inventory, invoices, customer records or orders.

## Product checks

The shared catalog hold covers the six earlier flagged IDs plus the three additional IDs and SKUs supplied in Stripe's screenshots. It also matches the restricted origin names in the correspondence, including the existing typo `persin`. This is used by public catalog/product paths and the server rug checkout. The server fetches current inventory itself and checks again even for a resumed checkout attempt. Origin values that are empty or outside a conservative recognized-country list fail closed at sandbox checkout; for example `pure silk` cannot serve as a country of origin. Country-name recognition is not evidence of a rug's actual origin or Stripe approval.

### lib/catalog-visibility.mjs

```js
// Temporary public-listing hold during processor review. Never changes stored inventory.
const reviewIds = new Set(['rug-1783796414468','rug-1783796464917','rug-1783796714385','rug-1783796678943','rug-1783796608166','rug-1783796497538','rug-1783796651385','rug-1783796624127','rug-1783796404975']);
export function isRugOnReviewHold(rug) {
  if (!rug) return true;
  if (reviewIds.has(rug.id) || ['9224261','197919','2812574'].includes(String(rug.sku || '').trim())) return true;
  const origin = String(rug.origin || '').normalize('NFKC').trim().toLowerCase();
  return /(^|[^a-z])(iran|iranian|persia|persian|persin|cuba|cuban|north\s+korea|dprk|syria|syrian|crimea|crimean|donetsk|donetska|luhansk|lugansk)([^a-z]|$)/i.test(origin) || /ایران|ايران/.test(origin);
}
```

### lib/server/checkout-region.mjs

```js
// Interim sandbox scope. This is NOT identity, IP, bank or sanctions screening.
// Live checkout remains disabled by the existing test-key and owner-only gates.
const restricted = /(^|[^a-z])(iran|iranian|persia|persian|persin|cuba|cuban|north\s+korea|dprk|syria|syrian|crimea|crimean|donetsk|donetska|luhansk|lugansk)([^a-z]|$)|ایران|ايران/i;
export function checkoutRegionAllowed(customer) {
  if (!customer || customer.billingCountry !== 'US' || customer.shippingCountry !== 'US') return false;
  return ['shippingAddress', 'billingAddress'].every(key =>
    typeof customer[key] === 'string' && customer[key].trim().length > 0 &&
    !restricted.test(customer[key].normalize('NFKC')));
}
// Known country names only: ambiguous inventory such as "pure silk" needs staff review.
// Membership is data validation, not payment-provider approval for a product.
const knownOrigins = new Set(['afghanistan','pakistan','india','turkey','türkiye','turkiye','nepal','china','morocco','egypt','belgium','united states','usa','us','united states of america','tibet','bhutan','uzbekistan','turkmenistan','azerbaijan','armenia','romania','france','italy','spain','portugal','greece','mexico','peru']);
export function checkoutOriginKnown(rug) {
  return knownOrigins.has(String(rug?.origin || '').normalize('NFKC').trim().toLowerCase());
}
```

## Location checks and limits

The interim sandbox rug checkout requires an explicit U.S. billing/delivery declaration. The server rejects missing/non-US country codes for both delivery and pickup, and rejects restricted-region names in the supplied address text. The owner test UI does not silently fill countries: an explicit checkbox is required.

These checks do **not** verify a person's location or identity, detect false declarations, validate addresses through a third party, screen bank/card-issuer countries, inspect IP location, or establish complete sanctions compliance. They do not restrict external Stripe Payment Links, Dashboard-created charges, another website, or the separate $1 owner connection-test route. The latter is also test-only and does not sell a rug.

Before enabling live payments, structured billing/delivery data, provider-side controls, and the controls needed for the business's specific Stripe approval must be reviewed and tested. A screenshot of a US checkbox alone is not proof of complete geographic screening.

## Server enforcement excerpts

```ts
    const input = checkoutInput(JSON.parse(raw));
    const fingerprint = createHash('sha256').update(JSON.stringify({input, origin})).digest('hex');
    const id = 'MPR-TEST-' + createHash('sha256').update(user.uid + attempt).digest('hex').slice(0, 24);
    const db = serverDb(), ref = db.collection(TEST_ORDERS).doc(id);
    // Recheck saved inventory even when resuming an existing checkout attempt.
    const currentRugs = await db.getAll(...input.items.map((item: {id:string}) => db.collection('showroom_rugs').doc(item.id)));
    if (currentRugs.some(d => !d.exists || !checkoutOriginKnown(d.data()) || isRugOnReviewHold({...d.data(), id:d.id}))) throw new CheckoutError('An item is unavailable for online checkout.', 409);

```

```ts
export function stripeClient() { return new Stripe(testKey(process.env.STRIPE_TEST_SECRET_KEY), {maxNetworkRetries: 2, timeout: 15000}); }
export async function checkoutOwner(req: NextRequest) {
  const user = await caller(req);
  if (!user.email_verified || user.uid !== OWNER_UID || user.email?.toLowerCase() !== OWNER_EMAIL) throw new CheckoutError('Rug checkout testing is available only to the Marco Polo Rugs owner.', 403);
  return user;
}
```

```js
export function testKey(value) {
  const key = (value || '').trim();
  if (!/^sk_test_[A-Za-z0-9]+$/.test(key)) {
    throw new StripeTestError('Add STRIPE_TEST_SECRET_KEY in Vercel using a Stripe sandbox secret key beginning sk_test_. Live keys are not accepted.', 503);
  }
  return key;
}
```

## Automated checks

Command:

```sh
node --test tests/access/stripe-review.test.mjs tests/access/rug-checkout.test.mjs tests/access/stripe-test.test.mjs tests/auction/catalog.test.mjs
```

Result: **21 tests passed, 0 failed.** TypeScript validation also passed.

New cases cover all three additional IDs/SKUs despite changed origin metadata; listed restricted origins and spelling variants; ambiguous origins; missing and non-US countries for pickup/delivery; and contradictory restricted address text. Existing tests cover live-key rejection, server-authoritative prices, signed webhook verification and public auction holds.

## Evidence to capture AFTER deployment

1. Record the actual production deployment's commit, domain and verification time.
2. Open each of these URLs signed out and capture the unavailable/not-found result:
   - https://www.marcopolorugs.com/shop/rug-1783796651385
   - https://www.marcopolorugs.com/shop/rug-1783796624127
   - https://www.marcopolorugs.com/shop/rug-1783796404975
3. Confirm affected items are absent from public search and auction listings. Review the remaining inventory's actual origin records/photos; a spelling filter is not a substitute for this review.
4. In the owner sandbox, demonstrate a blocked restricted-origin cart and blocked non-US/missing-country request; redact credentials and customer information from screenshots. A rejected request should not create a Stripe checkout session.
5. Show a legitimate, eligible U.S. sandbox example separately. Use only Stripe test details; never a live charge for evidence.
6. Send Stripe the verified deployment reference, relevant code excerpts and actual screenshots. Ask them to identify any further account-specific controls required. Do not claim approval, full compliance, production verification or successful provider testing based only on this report.
