# Marco Polo Rugs: live connection verification

This change verifies the live credentials without creating payments, sessions, orders, refunds, or inventory writes. It does not enable customer card checkout.

## Owner setup

1. Preserve the existing `STRIPE_TEST_SECRET_KEY` and `STRIPE_TEST_WEBHOOK_SECRET`.
2. Save the correct account's `sk_live_...` key as a sensitive, server-only Vercel Production environment variable named `STRIPE_LIVE_SECRET_KEY`. Do not prefix it with `NEXT_PUBLIC_` or paste it in code, chat, or screenshots.
3. Deploy the code containing this page. Redeploying older code only adds the environment variable; it does not add the connection checker.
4. Sign in as the authorized owner and visit `/payment-setup`. Click **Check live connection**.
5. The account must match `acct_1UFwpwEwq0Jt8pyt`. The separate account mentioned in earlier correspondence is not verified by this check.

Account capability checks are read-only and do not establish approval for every product or the readiness of website checkout. The endpoint requires owner identity, verified email, and current settings-read staff access. Responses are private and not cached. Secret values and raw Stripe errors are never returned.

## Remaining live checkout work

- Implement a separate live order flow; do not substitute a live key in the existing owner-only sandbox routes.
- Confirm final tax and delivery pricing. `priceCart` currently uses a flat 6% **sandbox estimate** and weight estimates; these must not silently become live quotes.
- Reserve unique inventory with concurrency controls across payment and other sales paths; settle paid orders and safely release abandoned reservations.
- Add a live webhook handler with signature, mode, account, amount, currency, order and duplicate-event checks. The current `/api/stripe/webhook` is test-only and must not be presented as a live endpoint.
- Configure `STRIPE_LIVE_WEBHOOK_SECRET` only once the live endpoint exists. This page checks only whether a secret is saved, not whether its signature or deliveries are valid.
- Verify order confirmation, customer ownership/privacy, restricted-origin and address checks, failed payments, duplicate retries, inventory conflicts, and the deployment before opening customer checkout.

No public auction change or database migration is included. All existing inventory, invoices, customer records, and test-payment routes are preserved.

## Validation

Run `node --test tests/access/stripe-live-status.test.mjs` and the project's TypeScript check. Unit tests use fabricated keys and accounts. No live API call or charge is part of the test suite.
