# Marco Polo Rugs: sandbox rug checkout

This stage tests the real rug cart using server inventory prices and Stripe-hosted card entry. Only the verified owner can start or view these tests. Customer pay-later ordering remains available. Test orders are stored separately in `showroom_stripe_test_orders`; no customer order, notification, stock reservation or promo redemption is created. No card numbers or CVCs enter the app server or Firestore.

## Configure the webhook

1. Keep `STRIPE_TEST_SECRET_KEY` in Vercel Production with the sandbox `sk_test_` key.
2. Deploy this code. Creating a draft PR alone does not deploy production.
3. In the same Stripe sandbox that issued the key, open Workbench → Webhooks → Add destination. Choose events from Your account, destination type Webhook endpoint.
4. Set the endpoint URL to `https://www.marcopolorugs.com/api/stripe/webhook` and the description to `Marco Polo Rugs — test order payments`.
5. Select `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, and `checkout.session.async_payment_failed`. Select event API version `2026-08-26.dahlia`, matching the installed Stripe SDK. If a different version is selected, test delivery and payload compatibility before continuing.
6. Reveal the destination's signing secret. In Vercel, save it as a Secret named `STRIPE_TEST_WEBHOOK_SECRET`, environment Production. Paste the complete `whsec_...` value privately; never put it in GitHub or chat.
7. Redeploy the code with that variable.

## Test

1. Sign in with the owner account and return to the shop. Add an In Stock rug (quantity one per unique rug).
2. Open the cart, enter contact/delivery details, and continue to Review your order.
3. Click **Test rug payment with Stripe**. Do not click the separate pay-later submit button for this test.
4. Check the item names, free padding, discount, shipping and total. The sandbox preserves the existing 6% tax and weight-based shipping estimate; this is not a production tax determination.
5. Pay using `4242 4242 4242 4242`, a future expiry and CVC `123`.
6. The return page must show Paid and **Automatic Stripe webhook received and verified**. Click Check again if the webhook has not arrived yet.
7. Close the return page and reopen `/checkout/result` to confirm the saved order remains Paid. Test returning without payment, and a declined card `4000 0000 0000 0002`. A decline stays unpaid so Stripe can allow retry; it does not cancel a real customer order.
8. In Stripe's webhook delivery log, confirm HTTP 200. Resend the completed event and check that the same order stays Paid without duplicates.

No sandbox credentials have been used by automated local tests. Actual delivery needs the user-configured Stripe destination and a deployed endpoint.

## Branding

Checkout uses `branding_settings.display_name = Marco Polo Rugs`; products, payment descriptions and the return page use Marco Polo Rugs. Set Stripe's public business name to Marco Polo Rugs and upload the shop logo in Stripe Branding for account-generated receipts and other surfaces. Keep the legal business name accurate for verification. This change does not modify existing legal account information.

## Before live customer payments

This implementation intentionally rejects live keys. Live launch still requires production tax/shipping decisions, transactional inventory reservations and release, one-time promotion reservations, customer order integration, customer receipts/notifications and live webhook credentials. Sandbox tests must not be presented as real purchases. Do not replace the test key with a live key.
