# Direct UPS shipment updates

UPS shipments now use the production UPS Tracking API when both server environment variables are present:

- `UPS_CLIENT_ID`
- `UPS_CLIENT_SECRET`

Create/select an application at https://developer.ups.com/ with access to the Tracking API, then add its production OAuth credentials in Vercel for this project. Redeploy the latest branch commit. Never put these credentials in NEXT_PUBLIC variables or customer settings.

Without both variables, or if UPS is unavailable, the existing live Shippo feed remains available and the customer page identifies that source. Shippo scans can lag behind the UPS website. Repeated redeploys cannot remove that upstream delay.

Direct UPS responses include the exact matching package's latest activity description, city/state/country, scan date and time, earlier events, estimated delivery date and delivery window when UPS supplies them. Signature, proof of delivery, recipient addresses and payment data are excluded. The stored order and carrier must match before either provider is called. Requests are rate limited and cached for at most one minute.

Newest dated history events supersede stale summary events. Date-only estimated arrivals are displayed as calendar dates rather than converted from UTC midnight. Request check time is separate from carrier scan time; the page never presents a fresh request timestamp as a fresh scan.

Validation: fixture tests cover RFID pickup, offset/GMT scan times, delivery windows, mismatched packages, suppressed details, safe fields and production OAuth request shape. These tests do not establish live UPS access. After configuring credentials, compare the same tracking number on the customer page and UPS. The footer must say “Updates directly from UPS”. UPS APIs and the public website can still differ temporarily; exact instantaneous parity is not guaranteed.
