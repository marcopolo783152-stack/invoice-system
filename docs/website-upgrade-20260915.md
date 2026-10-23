# Marco Polo Rugs website improvements — staged release

Base: d03f8d5011262a5c6ddde4db76143c227b26e72c (successful sandbox rug checkout).

## Preservation

This branch contains no database migration, bulk deletion, image replacement, or automatic seed operation. It preserves existing record IDs. New pay-later orders use UUIDs and wait for database persistence before displaying success or clearing the cart. Existing raw legacy data is not exported or copied into this repository. Live Stripe remains disabled.

Code rollback is the base commit above. A code rollback is NOT a database backup. Before production release the owner must verify a Firestore export/backup and Firebase Storage recovery, and verify currently deployed rules. Do not assume repository rules are deployed. Perform recovery testing in an isolated project, not the live project. Do not import an export over live data as a test.

## Implemented

- Verified staff permission checks before shipping purchases and refunds; refund IDs must match the saved order.
- Server reads saved shipping addresses, validates dimensions, returns selectable USD rates, then requires staff to confirm the selected rate. A durable operation record prevents automatic repeated purchases after uncertain provider results.
- Label creation means Preparing for Shipping, not Shipped. Existing tracking/label records are protected from replacement. Refund status is recorded without deleting label metadata.
- Shipping status is fetched independently from Shippo before order changes; incoming status fields are never trusted. Currently maps USPS, UPS, FedEx and DHL Express. Other providers require a mapping before automatic updates.
- Notification requests use Firebase identity and saved order details; private EmailJS key comes from server environment. Records attempt/outcome and rate-limits retries per order/type. Removes default private key from browser source. Old key must be rotated because history and legacy Android bundles may contain it.
- Image proxy restricts HTTPS hosts, denies redirects/API paths, accepts raster types only, and limits time/size.
- Product metadata and sitemap read live inventory; product URLs stay on the product page and link to interactive shopping. No starter inventory fallback. Missing products return 404. Data-service failures are not disguised as missing products.
- Restores TypeScript build enforcement and corrects notification fields to existing data types.
- Groups existing admin navigation with permission gates intact. Adds non-mutating missing-photo/dimensions/description filters.
- Hides chat during checkout; lazy-loads below-fold listing images; clarifies free padding and removes unsupported escrow copy.

## Before release — operator setup

1. Verify Firestore and Storage backups and live access rules. Export production data only through the approved Firebase/Google Cloud account into a private backup destination. Record backup time and test restore separately.
2. Rotate the exposed EmailJS private key directly in EmailJS. Store the replacement as EMAILJS_PRIVATE_KEY (Secret, Production) in Vercel. Do not paste into chat or GitHub. Optional EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_TEMPLATE_INVOICE can override existing public template IDs. Test an email to the owner with authorization before customer rollout.
3. Review the legacy invoice PDF attachment sender: it references /api/send-email, which is absent from this repo. This branch does not claim to repair that independent invoice flow. Its private browser configuration must be migrated before relying on attachment delivery.
4. Confirm actual rug image hosts. Proxy permits Firebase Storage, Google Storage, Unsplash and Marco Polo domains only. Other original images are retained but proxy use requires an explicitly reviewed host.
5. Test shipping rates without buying labels. A purchase is a separate confirmed staff action and may incur a carrier charge. Do not use a real purchase as an automated test.
6. For uncertain shipping operations, inspect Shippo and reconcile the actual transaction before resetting any operation lock. No timed blind retry is permitted.

## Remaining work / decisions

- Live customer Stripe workflow, paid stock reservations/releases, actual tax calculation and receipts remain pending payout review and shipping/tax decisions; do not replace test keys with live keys.
- Confirm shipping policy, service area, returns window/conditions, privacy/contact policy and store hours before publishing factual policy text. Do not invent these business terms.
- Full responsive redesign, gallery thumbnail generation (keeping originals), mobile device accessibility checks, legacy URL mapping, photo cutouts/advanced room placement, scheduled backups and external alerting remain later stages. No external paid service or backup schedule was enabled in this branch.
- Replace legacy pay-later client pricing/reservation with a server transaction before live payments. This release fixes save acknowledgment and IDs but does not claim that older workflow is fully transactional.

## Validation

Local checks: 23 focused tests passed, including shipping rate review, repeat-purchase prevention, permission rejection and proxy restrictions. TypeScript passed. Clean production build passed. Existing face-api browser filesystem warning remains; lint enforcement remains a later task.

Run: npx tsc --noEmit; npm run build; node --test tests/upgrade/integrations.test.mjs tests/access/stripe-test.test.mjs tests/access/rug-checkout.test.mjs tests/access/listing-stats.test.mjs.
Also run existing Firebase emulator/browser workflow before release. No production record changes are part of these tests.

## Publication status

Local commit prepared on improve/site-reliability-20260915. Automatic approval review rejected pushing to the existing public GitHub repository; explicit user approval of that publication destination is required. No merge or deployment performed. No production database export verified yet.
