# Washing tracker

Admin route: `/admin/invoices/washing` (sidebar: **Washing Tracker**).
Company route: `/washing-company#<private-token>`.

## First setup

1. Open Washing Tracker → Companies & private links.
2. Add the washing company workspace. Existing Service Vendor names appear as suggestions.
3. Select the company and create its private link. Copy and share it manually with the company. Replacing or disabling the link immediately removes previous-link access.
4. Save customer wash invoices with their individual MPW numbers and rug photos.
5. Choose **Weekly handoff**, select the rugs, set the sent date and agreed return deadline, and save. Up to 40 rugs per handoff; use several handoffs for larger collections.

The company sees only its rugs: MPW tag, reference photo, description, dimensions, recorded rug condition, handoff, return deadline, inspection feedback and delivery history. Customer names, contact details, invoice numbers, prices and customer pickup dates are excluded from its job response. The private link is a bearer capability: anyone possessing it can view that company’s jobs and submit permitted delivery updates. Keep it private; admin can replace or disable it. The random token is kept in the URL fragment, sent in an API header, stored only as a SHA-256 digest, and is never saved in plaintext on the server. The portal has no analytics and uses no-referrer/no-index metadata.

## Weekly workflow

- Print the handoff list or save it as a PDF. Match each physical MPW tag and photo during handoff.
- The company confirms receipt per rug and marks it ready, schedules a delivery date or reports a delay.
- The board highlights overdue returns, rugs due over the next seven calendar days, and returned rugs awaiting inspection. Dates use America/New_York calendar dates. It refreshes every 45 seconds.
- On return, staff must type the matching MPW tag and confirm the reference photo/description before recording arrival. Early, on-time or late arrival is recorded against the agreed deadline.
- Staff checks cleaning and condition separately. Passing inspection completes the job and releases its washing custody lock. A cleaning/damage problem stays open and can be sent for correction with new dates. Historical actions are retained.
- Wrong rugs, missing deliveries and other exceptions are recorded separately, with optional uploaded photos. An exception never marks an expected rug returned. Only staff can resolve exceptions.

The customer invoice status is managed separately. This feature does not mark an invoice ready automatically, change inventory, contact customers, send messages to the company, or modify legacy Service Tracking records. Existing jobs need to be added through a handoff if staff wants them tracked here.

## Access and data

Staff endpoints require active verified staff plus `services.read` or `services.write` according to the operation. Creating a handoff additionally requires `invoices.read`. Owner and General Manager already have these permissions. Existing service vendor records are not modified.

Server-only collections: `wash_tracking_companies`, `wash_tracking_links`, `wash_tracking_jobs`, `wash_tracking_active`, `wash_tracking_requests`, `wash_tracking_exceptions`; immutable audit events live in company/job `history` subcollections. Existing default-deny Firestore rules keep these collections inaccessible from client SDKs. No new environment variables or public Firestore grants are needed; the existing Firebase Admin configuration is reused.

New handoffs reserve every rug atomically, with idempotency and a unique active MPW lock. Mutations use saved versions; stale changes and cross-company changes fail before writes. History retains every event; the UI loads up to 100 history events per rug and up to 100 completed returns/exceptions per company. The API refuses to silently truncate more than 500 active rugs. Photos are compressed before client upload; imported invoice images have a bounded size.

## Validation

`node --test tests/access/washing.test.mjs tests/invoices/wash-sku.test.mjs`

Tests use isolated in-memory transactional adapters and execute the actual API route with mocked authorization/database dependencies. They do not contact production Firebase or send deliveries/notifications. Run TypeScript and a production build before deployment. Complete one real handoff and return with staff after deployment to verify the production Firebase configuration and physical workflow.

The completed change passed 50 combined tests (washing, MPW allocation, live orders and checkout contact validation), TypeScript, and production compilation/page generation. Local HTTP checks verified both new pages and denied unauthenticated API requests and malformed company links. The final local build used a temporary filesystem cleanup retry for Next.js `.next/export` after this workspace returned `ENOTEMPTY`; no compilation, type check or page-generation step was bypassed. Authenticated browser interactions and production Firebase handoffs still require a real post-deployment check.

## Organized returns update

- Company names are unique after Unicode normalization, trimming, case folding and whitespace normalization. Concurrent duplicate adds return `Company already added` and the existing company ID.
- The admin tracker automatically repairs legacy duplicate names on first load for staff with services write access. Duplicate workspaces are merged into the active company; job IDs, reports, delivery records and audit histories are preserved. Only the retained company's private link stays active. The duplicate workspace is archived, never destructively erased. Merges exceeding 450 record writes stop without removing records.
- Removing a company hides it from the active list and disables its link. Outstanding rugs prevent removal; historical records remain available.
- Staff can search MPW, description, customer, invoice and company names. The handoff picker also searches rug/customer names. Click a rug photo or MPW title for a quick preview.
- Open and Solved report folders are separate, with pagination for older reports. Each report has a preview and a dedicated print/PDF view containing the original report, photos and resolution.
- The effective return target is the earlier of the agreed return date and three calendar days before customer pickup. The company receives the return target and priority flags, not private customer pickup dates. Priority lists are sorted by target date, then handoff date. Missing pickup dates are flagged to staff for correction.
- The company must select the actual rugs, save a delivery plan, and confirm their MPW tags before marking departure. Admin sees the marked rugs under Planned deliveries / on the way.
- Earlier rugs without an upcoming plan for an equal or earlier delivery date trigger a server-enforced warning. Late selected rugs also trigger a warning. Proceeding requires explicit acknowledgement and a written reason; the manifest and job history retain that reason and the MPW numbers left behind. Missed past delivery plans do not excuse leaving those rugs behind. Company boundaries and saved versions are enforced atomically for bulk plans.
- Alerts appear on the company page, washing board and active staff admin dashboard. Admin alert checks run every 60 seconds while that dashboard is open, with focus refresh, persistent summary and notification toasts. These are in-app alerts; no email, SMS or device push service is configured or claimed. Alerts are recalculated from saved dates when pages are opened. Pickup dates must be recorded and kept accurate by staff.

Validation: 64 combined tests passed, including duplicate registration/merge, company removal, three-day targets across month boundaries, priority acknowledgement, tagged departures, report pagination and company isolation. TypeScript and the production build passed with the same local filesystem cleanup retry described above. No production records were changed by testing. Duplicate cleanup runs under the signed-in admin account on the first post-deployment tracker load.
