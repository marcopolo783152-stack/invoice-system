# Stripe connection test

This owner-only test connects the website to Stripe Checkout without enabling customer payments.

1. In Stripe switch into the sandbox/test environment belonging to the business account you want to use.
2. Open its API keys and copy its secret key beginning `sk_test_`. Do not copy a live key or share the key in chat/GitHub.
3. In Vercel, invoice-system > Environment Variables, add `STRIPE_TEST_SECRET_KEY` as a Secret for Production. Production refers to the deployed website; this separate credential is still strictly a Stripe test key.
4. Redeploy the latest main commit after saving the variable.
5. Sign into the website with the verified owner account. Open `https://marcopolorugs.com/payment-test`.
6. Click Start $1 test checkout. Use `4242 4242 4242 4242`, a future expiry, and any three-digit CVC. No real card should be used.
7. On return, the server retrieves the Checkout Session directly from Stripe and checks its owner, test mode, purpose, USD amount and completed/paid status before showing success.
8. For a decline use `4000 0000 0000 0002`. Stripe should decline it. Test the back/cancel link as well.

The site uses the existing Firebase owner identity. Other users and unauthenticated requests cannot create or inspect test sessions. Live keys are rejected before network requests. Stripe holds all checkout details; this integration writes nothing to Firestore and creates no real orders, inventory changes or fulfillment notifications. No publishable key or webhook is required for this isolated connection check.

This is not production order checkout. Before customer payments are enabled, implement server-calculated cart totals and stock validation, persistent orders, signed webhook handling with idempotent payment updates, tax/shipping decisions and end-to-end payment/fulfillment tests. A return-page visit alone must never mark a real order paid.

Run safeguards locally: `node --test tests/access/stripe-test.test.mjs`.

References: https://docs.stripe.com/api/checkout/sessions/create and https://docs.stripe.com/testing
