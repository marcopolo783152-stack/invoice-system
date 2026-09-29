# Marco Polo Rugs: pickup payments and delivery quotes

This release is prepared for deployment, not evidence of a production payment test. No real card was charged and no production records were changed during development.

## Customer flow

- Verified customer accounts can request an order from the cart. A request does not charge a card or reserve inventory.
- Alexandria showroom pickup is free. Pickup tax is 6% of the discounted rug subtotal.
- Delivery requests wait for staff to enter shipping, applicable destination tax, the tax basis, and delivery details. There is no automatic $8/$16/$45 freight estimate and no blanket 6% delivery tax.
- Approved quotes expire after 24 hours. The customer reviews and accepts the final total before entering Stripe Checkout.
- Payment attempts reserve the actual showroom rug records transactionally. Only a verified live Stripe payment marks the order paid. Retries reuse the same checkout attempt.
- Customers find their orders under Account → Online orders & quotes, or `/orders/pay`.

## Staff flow

Open Admin → Online orders & quotes (`/admin/online-orders`). Existing orders.read/write permissions apply.

1. Select a delivery request, enter shipping and tax as dollar amounts, and record the tax basis and delivery service/exclusions.
2. Approve the quote and copy its customer link. Send it using your existing communication process. This release does not automatically email customers.
3. After Stripe verifies payment, mark pickup Ready for pickup / Collected, or delivery Shipped / Delivered. Shipping requires carrier and tracking details.
4. Print the order/receipt from the detail screen. Unpaid orders remain visibly unpaid.
5. Issue refunds in Stripe. The signed refund webhook records refunded amounts. Restocking is a separate staff action after a full refund and confirmation that the physical rugs are available again. Partial refunds do not automatically restock rugs.

Quotes, audit records, payment records, and inventory locks persist in Firestore across deployments. Existing invoice and customer records are not migrated or deleted. The legacy showroom order list displays paid orders, but editing live-managed orders must use the new screen. Separate invoice-system inventory is not claimed to be synchronized by this release.

## Production activation order

1. Deploy the release branch to the existing Vercel project. Preserve existing Firebase configuration and Stripe sandbox variables. The production server must have the existing Firebase Admin credentials and `STRIPE_LIVE_SECRET_KEY` for the verified Marco Polo account.
2. Deploy this release's `firestore.rules` to the existing Firebase project using the project's normal authenticated deployment workflow. Deploy rules only; do not reset or import the database. Vercel deployment alone does NOT deploy Firestore rules. The rules prevent old browser clients from overwriting live inventory locks, editing live-managed order records, or changing reserved one-time promotions.
3. In Stripe LIVE mode create an endpoint at `https://www.marcopolorugs.com/api/stripe/live-webhook`. Subscribe to `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `charge.refunded`. Save its signing secret privately as `STRIPE_LIVE_WEBHOOK_SECRET` in Vercel Production. Keep the existing test webhook separate.
4. Only after the rules deploy successfully, set `MARCO_POLO_LIVE_RULES_CONFIRMED=true` and `MARCO_POLO_ORDER_QUOTES_ENABLED=true` in Vercel Production and redeploy. Leave `MARCO_POLO_LIVE_CHECKOUT_ENABLED` absent or false while reviewing quotes and production configuration.
5. Confirm the account on `/payment-setup`, verify the live webhook configuration and customer/admin access, and review the final customer terms and delivery tax process. Set `MARCO_POLO_LIVE_CHECKOUT_ENABLED=true` and redeploy only when ready to accept real payments. This is a real-payment switch, not a test switch.

Live request mutations are limited to the canonical Marco Polo domains; preview deployments cannot create live orders through their own host. Configuration switches are server-side. Do not put secrets in NEXT_PUBLIC variables, screenshots, GitHub, or messages.

## Operational boundaries and recovery

- Existing catalog-origin review holds and unknown-origin rejection remain enforced at reservation and payment settlement. U.S. billing/delivery declarations are required. A non-U.S. billing country returned by Stripe causes a paid review hold; this is a post-payment check, not comprehensive sanctions screening or a guarantee that a foreign card cannot be charged.
- Payment or inventory review holds block fulfillment and require investigation. Do not rewrite origins to bypass a hold.
- If a customer abandons Checkout, its signed Stripe expiry event releases only the inventory locked by that order. Staff can reconcile/cancel an active unpaid session through the screen. Do not release inventory solely because a local timer elapsed.
- If Stripe accepted a session creation but the response was lost, retries use the same idempotency key and saved parameters. After 23 hours an unknown session is held for manual recovery rather than risking another charge. Look up the order ID in Stripe metadata and reconcile its real status; never delete a lock to retry a payment blindly.
- Disputes, automatic customer notifications, scheduled reconciliation jobs, automatic carrier quotes, and tax-service integration are not included. Monitor Stripe and order review holds during launch.
- To pause new charges, set `MARCO_POLO_LIVE_CHECKOUT_ENABLED=false` and redeploy. Keep the live webhook and existing keys working to reconcile outstanding payments and refunds. Do not reset Firestore.
- Auctions remain under construction; this release does not enable bidding or auction card verification.

## Validation

34 checkout/provider/catalog tests passed; 18 Firestore emulator access tests passed. Full TypeScript checking and Next.js production build passed. The build reports pre-existing optional face-api dependency warnings in the employee clock page. Production Vercel settings, live webhook deliveries, and actual card payments were not tested or enabled in this development session.

## UPS checkout update — 2026-09-29

New delivery requests can choose live UPS rates through Shippo, then continue directly to Stripe. Staff approval is not required. Existing unpaid manual quotes remain accessible. No label is purchased while fetching rates or taking payment.

- Keep `SHIPPO_API_KEY` in Production. It must be a live Shippo key with an active UPS carrier connection. Test-mode rates are rejected. Neither API keys nor raw provider errors are returned to customers.
- Add actual finished package length/width/height (inches) and weight (lb) in the inventory editor. Include complimentary padding. Each rug is one parcel. Missing/invalid measurements stop delivery checkout and offer pickup/contact instead. No weight is guessed from rug area.
- Owner-confirmed package for exact SKU `H.17022`: 26 × 6 × 6 inches, 8 lb. This is a code fallback only when no shippingPackage field exists; an explicit null disables it. Other SKUs have no default. Saving package fields overrides this fallback.
- Rates are server-stored per order, available for 15 minutes, UPS/USD/live only. Customer sends a rate ID, never the shipping price. Updated package measurements invalidate payment reservation. Carrier requests are limited to once per 30 seconds per order; existing order creation limits remain.
- Delivery tax uses Stripe automatic tax. BEFORE enabling delivery payment, configure Stripe Tax business location, the appropriate product/default tax classification and actual tax registrations. Confirm the setup in Stripe, then set `MARCO_POLO_STRIPE_TAX_CONFIRMED=true`. Stripe Tax may have separate fees. This flag does not create registrations or change tax settings.
- The customer sees shipping first, then the final tax and total in Stripe before confirming payment. The Stripe customer is dedicated to this order and its shipping address is the UPS-rated address. Address changes require a fresh checkout. The server verifies automatic-tax completion, merchandise amount, shipping and final total before fulfilling.
- Pickup remains free with the existing 6% pickup calculation. Existing `MARCO_POLO_LIVE_CHECKOUT_ENABLED` stays false until the launch check is complete. Do not enable it just to view rates.
- Payment success stores the final tax and total in both the protected live order and canonical showroom order. Existing refund reconciliation remains amount-checked. Use Stripe Tax reporting for automatic-tax records.
- Labels remain a separate staff action after payment. For multiple parcels use the saved shipment in Shippo; the legacy admin label form supports one parcel. Carrier adjustments can occur if packing differs from the rated measurements.

Validation needed in Production: H.17022 UPS rate retrieval, final Stripe tax/total, signed live webhook delivery, one paid order and inventory update. This update has not performed real charges, bought labels or changed Firebase inventory records.

### Shipping included and invoice-link repair

UPS carrier cost is included in the delivered merchandise price, clearly identified as "shipping included" after address/service selection. Stripe line items include that amount and the shipping line is $0; the saved carrier cost remains available internally. The customer must review the destination-dependent delivered price before payment. Existing inventory retail prices are not overwritten. This is not an assertion that the carrier transports the package at no cost.

Public invoices now use staff-issued 256-bit random capability links, with only a hash stored in `invoice_customer_links`, expiry 90 days and optional `revoked=true`. Invoice data stays private under existing rules. The server returns only customer-facing invoice fields, omitting inventory costs and internal payment notes. Public signature submission can only add a signature to that invoice, never alter prices/payments or replace an existing signature. Customers can inspect invoice contents before signing.

Old `/public/invoice?id=...` links must be reissued using Send Email after deployment. New retail invoice links always use `https://www.marcopolorugs.com`, irrespective of the staff browser's Vercel hostname. No emails were sent by this change. Existing service tracking and separate signature-request links are not migrated by this patch. Deploy before resending invoices; verify one fresh link while signed out. No invoice data was migrated or deleted.
