# Invoice financial reliability: first implementation

No backup, restore, migration, historical renumbering or database writes were performed during development.

Changes:
- Submit the current down payment, rather than only carrying an old value from initialData.
- Retain down payment, date, lump-sum settings, signature, pickup date and staff name in local draft recovery.
- Remove automatic number substitution for the customer name Martinez. Existing saved numbers remain as stored.
- Reserve generated invoice sequence values with a Firestore transaction. Cloud failure no longer silently substitutes a locally generated number.
- New invoices reserve their number and write their document in one transaction using counters documents. Existing-number lookup remains for legacy records. Editing/renaming historical invoices still needs a separate uniqueness review.
- New payment additions on the invoice create/preview and detail screens append against the latest cloud data transactionally. Same-ID retries do not add a second payment; conflicting same-ID details fail. General invoice edits and payment removal are not yet conflict-protected.
- Payment form retains entered data on failed saves, disables duplicate submissions and retains a payment ID across retries.
- Dashboard labels distinguish invoice totals and an estimated 20% margin from actual cash and actual profit.

Verification:
- Unit tests use an in-memory serialized transaction adapter to check sequence allocation, duplicate-number prevention, simultaneous payment additions and same-ID retries. This is not a Firestore emulator/deployed rules test.
- TypeScript and production build checks.
- Live two-device verification and deployed counter permissions still require checking.

Remaining work:
- Secure customer invoice read/sign links, without making invoice collections public.
- Optimistic concurrency for all general edits and payment correction/removal.
- Shared cloud drafts, durable audit history and clear unsynced service-order handling.
- Explicit adjustments instead of automatic balances-under-$1 waiver.
