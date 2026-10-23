# Invoice workspace update

No backup, export, restore, database migration or production data edit was performed for this update.

Implemented:
- Marco Polo branding and warm white/deep green invoice editor styling.
- Clear invoice list labels and email/phone search.
- Existing calculated total, amount paid and remaining balance on desktop and mobile invoice lists.
- Larger form fields and action targets for tablets.
- Local draft save feedback, including storage failure guidance.
- Draft removal occurs only after saveInvoice resolves, not immediately on form submission. Editing another invoice does not clear the new-invoice draft.
- Save button disabled while saving; immediate repeat submissions guarded.
- Invoice-saved audit entry moved after successful persistence.
- Correct admin invoice print route.

Not included in this batch:
- Shared cloud drafts, concurrent edit protection and multiple drafts per staff member.
- Dashboard redesign, combined customer timeline and delivery-confirmed email events.
- Payment calculation changes, including the existing under-$1 balance waiver.

Validation: TypeScript and production build; authenticated browser, print layout and iPad acceptance checks still required. Financial calculations, document identities, existing records and Stripe behavior are unchanged.
