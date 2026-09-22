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
