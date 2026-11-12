# Marco Polo auction launch

This update adds production bidding and fulfillment paths. It does not activate Firebase launch settings, deploy Vercel, configure Stripe/Firebase/EmailJS accounts, or prove real-device and bank behavior. Keep the customer page closed until the checks below are complete.

## Management

Open showroom admin → Auction management → **Live launch & orders**. The existing visibility panel controls Under construction, Coming soon, or Open catalog. Opening a catalog alone does not enable bidding. Live launch & orders provides a second **Enable live bidding** control, guarded by server configuration, signed-in staff permissions, recorded readiness confirmations, and a successful worker heartbeat within five minutes. Bidding also pauses automatically if the closing worker has no successful heartbeat for three minutes or reports a failure. **Pause bidding** stops new bids immediately; already accepted bids still close and their winning invoices still process.

Use Publish selected lots to create only the inventory lots you intend to sell at auction. Set condition, HTTPS photographs, exact dimensions, opening price, optional reserve, loading fee, and future opening/closing dates. Schedule the selected lots together (1–100) to create one auction. Scheduling changes only those stock rugs to Reserved; payment-confirmed winners become Sold. No cart or normal service workflow is changed. Unsold rugs return to In Stock. An unbid scheduled lot can be withdrawn with a recorded reason; accepted bids cannot be erased by this control.

The worker currently supports at most 100 simultaneously scheduled lots and 100 unclosed auction events. The catalog prioritizes scheduled and preview lots (up to 100 of each); closed results remain available through their direct lot link and winning invoices. Management shows the latest 100 records. Keep the initial launch to one auction of at most 100 lots. A stock reservation or review discrepancy blocks charging or release and is shown for staff review.

## Production configuration

Set in Vercel Production, then redeploy:

- Existing matching Firebase Admin credentials and public Firebase project.
- `STRIPE_AUCTION_LIVE_SECRET_KEY=sk_live_...` (dedicated auction credential).
- `NEXT_PUBLIC_STRIPE_AUCTION_LIVE_PUBLISHABLE_KEY=pk_live_...` for that same Stripe account.
- `STRIPE_AUCTION_LIVE_WEBHOOK_SECRET=whsec_...` from the auction live webhook.
- `CRON_SECRET`, a new random secret of at least 32 characters. Vercel sends this as a Bearer token. `AUCTION_CRON_SECRET` is supported for an external scheduler, but Vercel uses `CRON_SECRET`.
- `MARCO_POLO_AUCTION_LIVE_ENABLED=true` after configuration and review. This flag alone does not open bidding.
- Existing `EMAILJS_PRIVATE_KEY`, `EMAILJS_SERVICE_ID`, `EMAILJS_PUBLIC_KEY`, plus `EMAILJS_TEMPLATE_AUCTION_NOTICE`. Its recipient must be `{{to_email}}`; render `{{subject}}` and `{{message}}`. A dedicated auction template keeps auction notices separate from service invoices and retail receipts.

Register live Stripe webhook `https://marcopolorugs.com/api/auction/live-webhook` for `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.processing`, and `payment_intent.requires_action`. It verifies signatures, live mode, purpose, amount, currency, customer and buyer against the bound invoice. Internal processing failures return a retryable error.

The example `docs/auction-vercel-cron.example.json` schedules `/api/auction/worker` every minute. Merge its `crons` entry into the production `vercel.json` only after confirming a compatible paid Vercel plan. It is deliberately an example so this update cannot break a Hobby deployment. The worker uses bounded batches and a 60-second maximum duration. Verify the deployed cron in Vercel and watch the last-success timestamp in management; merely setting an environment variable does not prove a working scheduler. An external scheduler can call the same endpoint once a minute with the configured secret.

Enable Firebase Authentication **Phone** sign-in and authorize the production domain for reCAPTCHA/SMS. Configure Firebase SMS region restrictions and billing appropriately. Google-confirmed email is accepted; password/email users must verify email. Phone verification links to the same buyer identity and must match their saved profile phone.

Review auction business requirements and final terms with your adviser, and confirm auction eligibility with Stripe before checking the legal/provider approvals. The administrative confirmations are attestations by staff, not automatic verification by this software.

## Buyer flow

Browsing is public. Sign in using the existing shared sign-in page, save a complete bidder profile, verify email/phone, and save a card through Stripe's secure setup page. Staff cannot bid. Card setup redirects to Stripe and returns to the bidder account; no raw card data is stored by this app. These saved-card automatic charges use cards; this update does not claim automatic Apple Pay/Google Pay auction enrollment.

The first bid in each auction asks for pickup/loading or approved shipping and explicit binding-bid/card authorization. Later bids reuse that frozen choice and fee policy. A shipping buyer must receive one quote covering all desired lots before the first bid: provide the admin the shipping account ID shown in the buyer profile and full destination. Select the auction and enter a dollar shipping price beside each desired rug; leave other rugs blank. Only won lots' shipping is charged. Shipping changes after bidding need staff resolution rather than silently substituting rates.

The bidding panel shows tax, premium, loading/shipping and an estimate of the total at the buyer's maximum. Default premium is 0%; default sales tax is 6%. A private maximum is never returned in the public catalog. The proxy engine enforces increments, server opening/closing times, earliest equal-maximum priority, and a two-minute extension for late bids. Public displays poll; server transactions decide the result.

Once all lots close, exactly one invoice per buyer contains all that buyer's wins from that auction (including 1 or 100 rugs). It freezes accepted fees and lists each rug, subtotal, premium, loading, shipping, tax and total. The worker attempts the saved-card charge. Declines and bank authentication appear in both the buyer account and management. Buyers can verify with their bank or update their saved card and retry the **same** original PaymentIntent. Retries are serialized and capped at five. Refresh the account to see confirmed status. Paid invoices can be printed or saved as PDF.

## Exceptions and fulfillment

Never release unpaid or inventory-review rugs. Staff can reconcile an existing Stripe payment. An uncertain create request blocks another automatic intent; inspect Stripe for the invoice metadata, then bind only the matching original `pi_...` reference through management. If no matching intent exists, staff/support must resolve the operation; do not delete the operation and start another charge casually.

Refund entered amounts with a recorded reason from management. A pending/uncertain refund remains blocked for provider review. These refunds do not automatically return a rug to stock. Use Reconcile original refund to confirm a pending outcome. For an interrupted request with no saved provider reference, enter the original `re_...` reference from Stripe; server validation must match the frozen operation, amount, invoice and original PaymentIntent. A full refund or pending refund blocks release. Refund reconciliation is an explicit staff workflow rather than an automatic webhook.

For paid pickup orders, mark ready, then record selected rugs collected and receiver reference. The ready notice includes the pickup deadline. Storage starts after 10 business days (excluding weekends, observed federal holidays and configured closures), then $40 per calendar day per uncollected rug. Partial pickup stops future fees for collected rugs. Storage is separate from the already-paid winning invoice: collect it through the showroom's existing payment process and record its external receipt reference, or record a reasoned waiver. The system blocks release while an unwaived, unrecorded storage balance remains. Delivery orders do not accrue pickup storage; record carrier/tracking when dispatched.

Email notices are queued for outbid, wins, receipts, payment issues, ready pickup and dispatch. Outbid email respects the buyer preference; transaction receipts remain transactional. The worker records sent/needs-review states. EmailJS has no idempotent delivery acknowledgment, so uncertain deliveries are not blindly resent. Inspect the provider before resending a failed or interrupted notice. The management Email delivery review panel supports a reasoned requeue after confirming non-delivery; interrupted sending notices must be at least five minutes old. This update does not add SMS notices or a recurring storage-reminder delivery service.

## Required production acceptance before introducing customers

1. Deploy and confirm the correct production domain/branch and all green readiness flags.
2. Open the catalog, enroll a separate real buyer account, and verify email, SMS and card return flow on phone and desktop.
3. Enter the real buyer account IDs in Private rehearsal, confirm legal/provider/worker readiness, and start the rehearsal. It uses real bids and real card charges but accepts bids only from those 1–5 buyers; the general public remains blocked. Review a small deliberately scheduled auction: two separate buyers, competing maxima, reserve-not-met result, last-minute extension and inventory holds against ordinary checkout.
4. Observe scheduled close and a single consolidated invoice with exact tax and shipping/loading.
5. Verify an authorized small live charge, actual receipt delivery, buyer visibility and stock becoming Sold. Test any required bank authentication and a declined-card recovery through an appropriate controlled provider test; never manufacture production declines using fake card data.
6. Check refund, pickup/partial pickup, ready notification, shipping dispatch and storage accounting. Confirm print/PDF output.
7. Check an unauthorized caller cannot see buyer contacts, private maxima or payment references, and that closing the page/pause prevents further bids.
8. Only attest to end-to-end verification once these checks have actually been performed. Then enable bidding and introduce the auction.

Automated tests exercise ledger transactions and provider stubs, not a production bank, real SMS/reCAPTCHA, email deliverability, a deployed cron, or physical inventory. Do not advertise those as verified based on a successful build alone.
