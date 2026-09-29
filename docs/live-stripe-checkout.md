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
