# Marco Polo Rugs: reliability and customer follow-up

## Included in this update
- One five-hour staff inactivity monitor in both layouts, sharing activity across same-account tabs. Background tabs check elapsed wall-clock time; browser storage failures retain an in-memory fallback. No authorization rules changed.
- Signature email requests use shared cloud configuration, consistent with invoice email requests. Invalid provider credentials still require correction in Invoice Settings; code cannot repair an EmailJS account.
- Public invoice loading resets stale state, computes totals before displaying the record, and offers retry/contact guidance. This does not establish the cause of a previously reported browser exception.
- Customer account purchases display existing carrier/tracking fields and cost breakdown. No orders are modified or new tracking information invented.
- Customer account controls use 16px inputs, 44px buttons and wrapping layouts on phones.

## Acceptance checks before release
1. Open the improvement preview as staff on desktop and iPad. Switch between showroom and invoices. Verify activity in either tab keeps both sessions active. Simulated-clock unit tests cover the five-hour boundary; live five-hour browser testing is outstanding.
2. Open an existing customer invoice link in a signed-out browser. Check the document, signature and download. No invoice should be resent without choosing its intended recipient. Actual email delivery and the previously reported browser crash still need authenticated reproduction.
3. Sign in as a customer and confirm only that customer's orders appear. Compare displayed totals and tracking against the existing order. Test narrow screens and keyboard access.
4. Keep Stripe live checkout disabled pending the account review. Existing origin restrictions remain unchanged.

## Data protection review
Source contains invoice backup/export and restore functionality. Its presence is not evidence of a recent successful complete backup. Confirm backup coverage for Firestore collections, Storage images, authentication recovery and necessary configuration. Record export date, collection counts and recovery ownership. Restore only into an isolated non-production Firebase project and compare sample records and attachments. Never test restore by overwriting production.

## Next improvements, after verification
- Inventory quality: review missing photos/dimensions/descriptions using current filters; verify shipping weights separately with actual measurements.
- Product photography: consistent backgrounds and real detail photos; avoid generating inaccurate rug details.
- Customer invoice downloads: link invoices only after a verified customer-to-invoice ownership mapping exists. Do not expose invoice records by email matching alone.
- Delivery: confirm real carrier estimates and pickup readiness; preserve approved final-sale/exchange policies.
- Mobile and accessibility: authenticated iPad checks, keyboard dialogs, readable totals, and image loading measurements.
