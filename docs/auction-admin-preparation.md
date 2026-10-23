# Marco Polo Rugs — private auction preparation

Open `/admin/auctions` on the deployment containing this branch and sign in as staff with Settings permission. Customer auction routes and the public catalog API remain under construction.

## Prepare an auction
1. Select **Prepare an auction**, enter the name, opening time, first closing time and seconds between closings. Times use the device's timezone.
2. Search inventory and add selected rugs in bulk, or download and import the CSV template. CSV imports append up to 100 rows. SKU or rugId links a row to existing inventory; unmatched rows remain drafts. Images use HTTPS URLs. This release imports data and photo URLs, not binary image files.
3. Open each lot and enter its condition, opening bid, optional reserve and assisted-loading fee. Review photos and dimensions. Save to see readiness issues.
4. Choose **Ready to publish**, **Coming soon**, or **Next auction** when complete. These are internal planning labels; none makes the auction public. Use **Private catalog preview** to review the layout and staggered closing times.
5. Save, then select **Create bidding test copy** on a lot. In the test lab, schedule the copy, enter maximum bids with fictional bidders, test late-bid extensions, finalize after closing, simulate payment outcomes and record fulfillment.

## Data behavior
- New preparation records use `auction_workspaces_v1`; audit operations are retained in its events subcollection.
- No inventory, invoice, customer or payment records are altered by planning or test copies.
- Saving rechecks referenced inventory availability and review holds. The server enforces staff permission, version checks and idempotent operation IDs.
- Imports are saved atomically. Invalid rows stop the save instead of partially creating an auction.
- Existing test lots remain available in the test lab. Historical legacy `auction_lots` records are retained; the replacement workspace does not migrate them or publish them.
- Catalogs support 100 lots per auction; lists show the latest 100 auctions and inventory selection the first 500 inventory records. Split larger catalogs into auctions.

## What this release does not enable
There is no public publish switch. The lab uses fictional bidders and simulated payment/fulfillment. Shipping quotes, taxes, verified live bidders, payment-provider approval, live inventory reservations, automated settlement and notification delivery require further implementation and live-environment validation. The current lab requires staff to finalize after the closing time.

## Validation
`node --test tests/auction/*.test.mjs`
`npx tsc --noEmit`
`npm run build`
Authenticated deployment testing is still necessary with the project's Firebase server credentials. No production database was used during local tests.
