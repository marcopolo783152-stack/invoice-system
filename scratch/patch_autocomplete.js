const fs = require('fs');

const file = 'components/public/CartView.tsx';
let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// Standard replacements
const replacements = [
  // Contact Info
  { search: 'value={name}', insert: ' autoComplete="name"' },
  { search: 'value={phone}', insert: ' autoComplete="tel"' },
  { search: 'value={email}', insert: ' autoComplete="email"' },

  // Shipping Info
  { search: 'value={shippingStreet}', insert: ' autoComplete="street-address"' },
  { search: 'value={shippingApt}', insert: ' autoComplete="address-line2"' },
  { search: 'value={shippingCity}', insert: ' autoComplete="address-level2"' },
  { search: 'value={shippingState}', insert: ' autoComplete="address-level1"' },
  { search: 'value={shippingZip}', insert: ' autoComplete="postal-code"' },

  // Billing Info (if separated, but in this case billing is a single text area 'billingAddress')
  // We can leave billingAddress alone since it's just a textarea, or add autocomplete
  { search: 'value={billingAddress}', insert: ' autoComplete="street-address"' },

  // Credit Card Info
  { search: 'value={cardName}', insert: ' autoComplete="cc-name"' },
  { search: 'value={cardNumber}', insert: ' autoComplete="cc-number"' },
  { search: 'value={cardExpiry}', insert: ' autoComplete="cc-exp"' },
  { search: 'value={cardCVC}', insert: ' autoComplete="cc-csc"' },
];

replacements.forEach(({ search, insert }) => {
  // We only want to inject if it's not already there
  if (content.includes(search) && !content.includes(search + insert)) {
    content = content.replace(new RegExp(search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), search + insert);
  }
});

fs.writeFileSync(file, content);
console.log('Injected autoComplete tags into CartView');
