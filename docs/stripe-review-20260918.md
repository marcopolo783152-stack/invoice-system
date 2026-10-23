# Marco Polo Rugs: Stripe review preparation

Status: patch prepared for the review branch. This document is not proof of a production deployment or Stripe approval.

## Reversible listing hold

The shared catalog policy hides rugs whose origin explicitly identifies Iran, Iranian, Persia or Persian, including Persian/Arabic spellings of Iran. It also holds the six product IDs identified in the owner's screenshots. It filters public shop, product details, homepage selections, blog product selections, chatbot catalog context and generated catalog/sitemap entries. The server rejects held rugs before creating or returning a checkout session; client pay-later ordering also checks the hold.

Inventory records, original origin labels, photographs, invoices and customers are not deleted or migrated. Admin inventory remains available. Reverting the code can restore public visibility, but do not restore restricted offerings without resolving the processor review.

This is a targeted hold, not a complete sanctions or provenance screening system. Missing or inaccurate origin information requires manual inventory review. Existing Stripe-hosted sessions are not expired by this patch. Existing external caches may retain older pages. No alternative processor is configured.

## Before making a completion statement to Stripe

1. Deploy and verify the patch on the public production domain, including direct links to the six held rugs and mixed-cart rejection.
2. Review the full inventory for missing or inaccurate origins and any other offerings covered by Stripe's email. Preserve accurate provenance.
3. Review both the regular Stripe account and WooPayments account, their transaction history, payment links and open sessions. Disable any active links/sessions for affected items.
4. Confirm sourcing and any historical processing with the owner. Do not certify historical non-use based on sandbox tests.
5. Attach actual production screenshots and relevant code evidence, then respond by September 30, 2026. Stripe decides whether the response satisfies its review.

## Initial reply draft — owner review required; not sent

Subject: Marco Polo Oriental Rugs Inc — account review response

Hello Stripe Review Team,

Marco Polo Oriental Rugs Inc operates a rug showroom and website. Our intended Stripe use is online payment collection for eligible rug purchases. We have been testing the website checkout in Stripe's sandbox.

We understand your concern about Iranian-origin products. We are preparing a reversible hold that removes identified Iranian-origin rugs from public listings and blocks those items from the website's Stripe checkout, while preserving internal inventory records. We will provide production evidence after deployment and verification.

We are also reviewing the inventory and the activity and configuration of both accounts mentioned in your email so that our formal confirmation is accurate. Please confirm any additional documentation you require and whether the proposed removal and checkout controls meet your requirements. We are not claiming that an alternative processor has approved these products.

Thank you,
Marco Polo Oriental Rugs Inc

This initial reply is not the requested final attestation. Complete the review and provide the truthful final response before the deadline. Do not claim all restrictions are resolved or payouts will resume automatically.
