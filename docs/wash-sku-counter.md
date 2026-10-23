# Persistent wash / repair SKU numbering

New automatic MPW numbers are reserved by an authenticated server endpoint. The high-water mark lives in Firestore at `system_counters/wash_sku`; it is not stored in the browser or deployment filesystem. With MPW1270 as the latest number, the first reservation is MPW1271. Higher existing numbers take precedence.

Before reserving a batch, the server reads item SKU fields from current and deleted invoice collections, including legacy store-prefixed collections. It then transactionally increments the shared counter. An operation receipt makes retries return the same numbers; concurrent requests get separate numbers. Deleted invoices and abandoned reservations never decrease the counter. Gaps can occur when drafts are abandoned, which prevents reusing a number already shown or printed.

The form requests SKUs for blank wash item rows. Existing nonblank SKUs are preserved, including when editing an old invoice. This change does not renumber old invoices or resolve pre-existing duplicate SKUs. It disables saving a wash invoice with unresolved blank item SKUs, displays allocation failures, and provides Retry. There is no offline/random-number fallback.

Redeployments continue the sequence provided they use the same Firebase project. Server Firebase credentials and invoice-write permission are required. The new collection remains server-only under the existing default-deny Firestore rules. No production records were changed while building this fix.

Validation: unit tests cover the 1270 baseline, higher historical SKUs, simultaneous requests, idempotent retries, process restart and corrupt counters. Production browser testing must verify actual credentials and the deployment selected for marcopolorugs.com before promoting.
