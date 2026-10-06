# Auction buyer accounts, consolidated invoices and storage — private preparation

Public auctions, lot pages, registration and account pages still show Under construction. The public catalog returns no lots and public bids return HTTP 423. There is no publish/live-charge settings switch. No production inventory or customer invoices are changed by test processing.

## Management
Open `/admin/auctions`:
- **Auctions & bulk catalog** prepares explicitly selected rugs. Nothing automatically lists showroom inventory.
- **Bidding test lab** requires pickup/delivery and acceptance on the first fictional buyer bid for each test auction. Further bids reuse the saved choice. Accepted terms, timestamp and settings snapshot are kept in Firebase.
- **Invoices, payments & policy** consolidates all closed test lots into exactly one invoice per buyer per auction, up to 100 items. All lots must be finalized first. Separately paid/fulfilled lots cannot be consolidated twice. The auction is sealed after consolidation and cannot receive another test copy or bid.
- **Buyer account preview** is the authenticated staff member's own account. Contact/address details, bidder number, optional demographic fields, notification preferences, saved searches and language preference save to Firebase. Public buyers cannot access this UI yet. There is no gender/income requirement for bidding. Password reset uses Firebase Auth. Preferences do not activate email/SMS delivery.

Test invoices show buyer ID/name, full balance, payment failure/action status, delivery choice, line items, premium, tax and other fees. Print/download invoices through the browser's PDF printer. Declines leave invoices due; successful verified test payments cannot be undone by an older event. No real customer is charged by simulations.

## Storage policy
Default: 10 business days after the paid pickup invoice is marked ready. The ready date is excluded. Business days exclude weekends, observed U.S. federal holidays and configured showroom closure dates. The next calendar day after the deadline starts $40 per day per uncollected rug, including weekends. Partial collection records the date per rug and stops future accrual for those rugs. Shipping orders do not accrue pickup storage.

Storage is a separate accrual, not silently added to an already-paid winning invoice. Staff can waive accrued fees with a reason; policy versions, invoice changes, collection references and bidder suspension/reinstatement have retained audit records. Monetary fees and business-day count can be changed for future acceptances. Existing accepted policies are frozen in the invoice. Before launch, obtain review of tax sourcing, auction terms, storage fee enforceability, collection rules, disputes and abandoned property handling.

## Dedicated Stripe test integration (not live)
No credentials were added, changed or inspected during implementation. To enable provider tests, configure these server-only variables in the desired Vercel test/preview environment:
- `MARCO_POLO_AUCTION_STRIPE_TEST_ENABLED=true`
- `STRIPE_AUCTION_TEST_SECRET_KEY=sk_test_...` (dedicated test key; live keys are rejected)
- `STRIPE_AUCTION_TEST_WEBHOOK_SECRET=whsec_...` for `/api/auction/test-webhook`

Subscribe the test webhook to `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.processing`, and `payment_intent.requires_action`. Signed test events are checked against exact amount, currency, customer and invoice metadata before reconciliation. Live events are ignored. Public bid/charge paths remain disabled regardless of these variables.

Choose a fictional buyer, explicitly accept test charge consent, save a Stripe test card using hosted secure Setup mode, then verify the returned setup session. Provider confirmation, customer/PaymentMethod binding and off-session consent are required; no browser field can declare a card verified. Real card numbers must never be entered in the test workspace.

The invoice action creates one test PaymentIntent and confirms it off-session. The durable operation prevents duplicate charges. Uncertain results require reconciliation rather than another charge. A declined invoice can explicitly retry the same PaymentIntent after saving a replacement test card; attempts are serialized and capped at five. Bank authentication remains a separate unpaid/action state; the customer-facing authentication completion path must be built and validated before launch.

**Process due test closings, invoices and saved test cards** runs the complete private processing sequence. It refuses a truncated collection (>100 test lots), closes due test lots, consolidates fully closed test auctions, and attempts up to three saved test-card payments per invocation. Press again to process remaining unpaid invoices. There is no scheduled production worker or live automatic charging yet.

## Remaining launch work
- Provider approval for auctions/product origins and live secure card enrollment, consent and bank-authentication completion.
- Phone/age verification as required, account standing checks, staff-bidding exclusions and abuse/rate limits in real customer bid endpoints.
- Real inventory locks across online checkout, in-store invoices and staff stock editing; no double selling.
- Shipping quotes accepted before bidding, final tax sourcing, pickup appointments and proof of collection.
- Scheduled reliable lot closing/consolidation/payment processing, retryable notification outbox and receipt delivery. Preferences alone do not send notifications.
- Live fulfillment, storage assessment/payment invoices, returns/refunds/disputes and manual exceptional reconciliation with audit controls.
- Database emulator contention/security, actual Stripe test account integration, signed-in mobile/browser tests and operational/legal sign-off.

The public remains under construction until those launch steps are completed and separately authorized. Nothing in this release claims a live auction system.

## Customer page availability
Auction management now has a **Customer auction page** card. Settings are stored in Firebase at `auction_visibility/current`, with version checks and staff audit events. The default remains Under construction. Staff with settings write access can choose Under construction, Coming soon, or Open catalog and save. The switch affects `/auctions`, the showroom auction view, the catalog API and direct lot pages. Catalog clients refresh every 15 seconds. Closed modes expose no lots. Opening exposes only explicitly published preview lots whose linked showroom rug remains eligible; drafts, test lots, sold rugs and review holds remain hidden. Database read failures default to closed.

**Open catalog is not live bidding activation.** Public bidding remains disabled, buyer registration remains under construction, and live charging is not enabled. Complete the remaining launch work before opening bidding.

The planning inventory selector is collapsed by default and fetched when **Choose rugs from inventory** is clicked. CSV import loads inventory to match reviewed rugs. **Publish selected lots** provides separate draft creation and explicit preview publication; this never publishes the entire inventory or a test lot.
