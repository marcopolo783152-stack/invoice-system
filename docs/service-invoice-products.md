# Products on service invoices

In the existing Wash/Repair invoice editor, use **Products sold with this service → Add product**. Enter name, quantity and final unit price. **Taxable (6%)** starts checked. Products appear separately in the customer invoice summary and share the invoice's existing payments and balance.

Example: $100 washing, one $50 padding product, $3 product tax, $153 total. Existing service discounts and service lump-sum prices apply only to service items. Enter any discounted product price directly as its final unit price. Existing additional charges retain their existing behavior.

Products are stored as `serviceProducts` on the same Firebase invoice. They never become wash items, receive wash SKUs, enter vendor handoff lists or affect the service completion status. Existing invoices have no new product charges. No existing saved records are migrated or modified by deployment.

The return checkbox removes a returned product and its tax from the net balance, consistent with existing invoice return accounting. It records accounting only; it does not issue a card refund. Removing a product removes its row from the edited invoice.

Product prices are calculated in cents. Products, totals and tax survive draft recovery, saving/editing, customer link projection and the shared printable invoice template. Existing retail and wholesale calculations remain unchanged when no products are present.

Validation: 224 pre-existing calculation combinations matched the previous engine exactly; service-product tests cover mixed tax, quantity, exemption, service discounts, lump sums, payments, returns, invalid amounts and safe customer projection. Virginia's repair regulation requires parts/materials sold to be separately itemized: https://law.lis.virginia.gov/admincode/title23/agency10/chapter210/section3050/
