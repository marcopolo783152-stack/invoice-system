# Marco Polo Rugs auction workspace — first implementation

Status: staff sandbox and customer preregistration. NOT ready for public bidding.

## Where to review

- `/?view=auction`: customer landing page and searchable, size-filtered public collection preview. No account is required for browsing or opening rug details. Preview rugs come from the existing in-stock public catalog and retain origin-review holds; they are not represented as scheduled auction lots.
- `/auctions/register`: bidder profile and verification checklist.
- `/admin/auctions`: staff sandbox, linked from the showroom admin sidebar and header.
- Staff require `settings.read` to view and `settings.write` for mutations. Owner and General Manager qualify through the existing policy; custom staff require explicit permission. Server authorization applies to every sandbox request.

## Try the sandbox

1. Sign in as Owner or General Manager and open Auction management.
2. Expand Create a test lot. Select a rug, describe its condition, enter a starting price/reserve and a closing time several minutes in the future. Dates are entered in the browser's local time and stored as UTC milliseconds.
3. Create the draft, then Schedule test lot. Choose fictional bidder test-a and a maximum bid. Choose pickup or a fictional shipping address.
4. Switch to test-b and bid a competing maximum. Refresh the lot to see the server result. Bids in the final two minutes extend the end to two minutes after acceptance. Earlier equal maximum wins. Reserves may raise the displayed price up to the reserve, but never above the bidder's maximum.
5. After the final closing time, use Finalize result. A winning lot receives a TEST order number and a deadline 48 hours after closing. Simulate payment failure/success, then record a test pickup or shipping reference.

No inventory lock, real sale, charge, shipping label, SMS or email is produced by sandbox operations. Staff test identities are not verified customer accounts. Do not use real card data or personal addresses in the sandbox. Shipping/tax totals are not calculated yet.

## Data and safety

- Existing showroom inventory, customers, invoices, Stripe settings and origin holds are untouched.
- `auction_sandbox_lots/{id}` contains copied rug details and test lifecycle state; subcollections `bidders` and `events` contain test maxima and activity.
- `auction_profiles/{uid}` contains customer contact details only. Email comes from Firebase Auth. Phone verification is derived from Firebase Auth's linked phone number; typing a phone does not verify it. Neither payment verification nor terms acceptance can be written by this form.
- Existing repository Firestore rules deny unknown collections. No client Firestore access is needed or added. Verify deployed rules before preview use; this work did not deploy rules or change production records.
- Sandbox bids and resulting activity are written in one server transaction. Requests use operation IDs and payload hashes to reject conflicting retries.
- Public `/api/auction/bid` always returns 423 without database/payment access. There is no UI or environment-variable switch to launch bidding.
- Published lot rules cannot be edited through this workspace. Cancellation requires a recorded reason; there is no history deletion action.
- No backup, export or migration was performed.

## Still required for completion

This commit deliberately does not claim a complete live auction system. Remaining work:

1. Provider approval for auctions and product origins; live payment integration, disclosed $1 authorization/release behavior if supported, payment-method attachment verification via signed webhook, revocation, failed/expired cards and charge consent. No raw card storage.
2. Phone verification with abuse controls and consent; SMS delivery has provider costs. Email verification uses the existing account and Firebase email verification action.
3. Final legal/operational terms, versioned acceptance, documented suspension/reinstatement and bidder support.
4. Real customer bid API enforcing verified profile, current verified payment method, terms version, account standing, quote acceptance, staff exclusions and product eligibility on every bid.
5. Inventory reservation integrated with ALL invoice, checkout and stock-edit paths. The sandbox makes no locks on real inventory.
6. Shipping quotes from verified packed dimensions/weight and destination, quote validity, tax and loading capacity/fees. No unquoted shipping bids.
7. Public catalog, watchlist, private customer maxima, bid alerts and customer wins dashboard. Use paginated queries; current sandbox lists latest 100 lots and first 500 inventory items.
8. Automatic reliable closing, one winning order, deadline monitoring, notification outbox/retries, payment capture/failure handling, refunds/cancellation approvals, disputes and reconciliation.
9. Shipment and pickup scheduling with identity checks, tracking, loading acknowledgment and completion records.
10. Firestore emulator concurrency/security tests, provider sandbox end-to-end tests, signed-out access checks, iPad/mobile/browser QA, rate limiting and deployment review.

## Verification performed

- 17 auction tests: rule behavior, authorization, profile forgery rejection, locked public API, retry handling, concurrent test bids, failed-payment fulfillment blocking and preservation of source inventory.
- 23 existing reliability/shopping/upgrade tests.
- Tests use pure rules and an in-memory serialized transaction adapter; they do not establish real Firestore conflict behavior or prove deployed permissions.
- Production build and TypeScript check. Existing optional `encoding` warning originates in employee clock / face-api dependencies.
- No authenticated browser/iPad or live Firebase/Stripe test was performed.

Technical reference: Firebase transaction semantics: https://firebase.google.com/docs/firestore/manage-data/transactions
