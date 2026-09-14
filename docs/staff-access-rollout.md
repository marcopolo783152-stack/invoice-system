# Staff accounts and permissions — review rollout

This branch is not a production security certification. Code and Firestore rules must be rolled out together after the checks and compatibility work below. The live project reportedly still has `allow read, write: if true`; UI roles cannot secure that database.

## What is implemented

- Verified Firebase email/password and Google staff sign-in at /staff-login.
- Existing Google users can link an email/password credential at /staff-account, retaining the same UID.
- Owner: marcopolo783152@gmail.com, UID msQJKLOsWceWK5A75V6ZBLQRvsl2. Owner identity and a matching role document are both required.
- General Manager: all admin business permissions and staff management. The owner account cannot be changed through staff management.
- Seller: view inventory; view/create/edit invoices, orders and customers. No deletion, payroll, settings or user-management access.
- Custom: choose view, create/edit and delete by section. Custom users cannot manage users.
- Invitations expire after seven days, require the exact verified email, and are accepted with an atomic role/invitation transaction. Invited staff cannot choose a different role.
- Staff can be disabled, re-enabled or have their permissions edited. Disabled role records are retained so old invitations cannot recreate access.
- Invoice routes, including print and clock routes, require the shared Firebase session. The former local-password login screens redirect to staff sign-in.
- Notification/private collection subscriptions respect the current staff section access and stop on changes.
- Legacy browser flags remain solely for compatibility with older display/storage code, not as Firestore authorization.

## Owner instructions after release

1. Open /staff-login and use Continue with Google with marcopolo783152@gmail.com.
2. Open My account. Enter and confirm a new website password (12 or more characters), then save. If asked to sign in again, use Google and retry. Never send the password in chat.
3. Open Users & Permissions. Enter the employee name and email, for example marcopolorugs@aol.com.
4. Choose General Manager, Seller or Custom and press Create invitation.
5. Copy the invitation link and send it to the employee yourself. This version does not automatically send invitation emails.
6. The employee opens the link, creates a password account and verifies their email, or uses a matching Google account. AOL accounts can use email/password.
7. Edit access or Disable from the same staff screen as needed.

## Required pre-release checks / compatibility blockers

Do not paste these rules into the live console before addressing the following:

- Run the GitHub Staff access checks workflow. It checks TS/TSX syntax, builds the website, and runs the Firebase emulator on a demo project without production credentials.
- Perform browser checks with owner, General Manager, Seller, Custom and disabled users. Verify Google-to-password linking keeps the same UID and email verification works.
- The current guest chatbot writes assistant messages directly from the customer browser. The reviewed rules deliberately reject customer-created staff messages. Move AI reply persistence to an authenticated server endpoint before release; migrate existing chat ownership or start new conversations.
- Existing orders without customerId and chats without ownerUid are staff-only under the new rules. Migrate only after matching real customer identities; do not assign ownership by a browser-provided email.
- Existing checkout also tries to reserve catalog rugs and change promo codes from the browser. Move these writes and trusted price/payment validation to server endpoints before enabling restricted production rules.
- Public invoice/signature links currently depend on direct private Firestore access. Replace that with validated expiring server-side share tokens before release. Do not reopen all invoice reads to preserve old links.
- Review any store-prefixed collections. The new policy covers the root Marco Polo collections explicitly and denies unknown collections. Move or explicitly map other stores only after confirming ownership; never broad-grant arbitrary collection names.
- Verify the actual collections used for audit logs, counters, backups, appraisals, kiosk and employee sync. The old users/password documents are denied; retire legacy employee sync that reads them.
- Review Firebase Storage rules and privileged API routes separately. Firestore rules do not protect Storage or server endpoints using administrative credentials.
- Complete the appointment migration and server-side future-time validation described in appointment-rollout.md. Test cancellation/reconfirmation and simultaneous bookings. Public appointment IDs contain no customer contacts, but request throttling remains necessary.
- Browser-local legacy invoice caches may contain old records or unsynced work. Do not delete them blindly. Back up/reconcile before migrating a shared device between staff accounts.
- Existing writes sometimes use optimistic UI/local fallback. Verify permission-denied errors are surfaced and do not look like successful cloud saves for view-only staff.

## Release order

1. Back up current Firestore data and rules. Confirm owner UID/email in Firebase Authentication and the existing role document.
2. Test against a separate Firebase project with restricted rules and representative data.
3. Complete the compatibility blockers above; keep this PR draft until then.
4. Merge the reviewed website changes and coordinate the Firestore rules deployment with that release. Publishing rules is separate from pushing GitHub code.
5. Verify owner login, employee invitation, denied direct requests, booking and customer flows in production.
6. Vercel environment-variable changes require a new deployment to take effect. No password or private API key belongs in GitHub or NEXT_PUBLIC variables.

References: [Firebase provider linking](https://firebase.google.com/docs/auth/web/account-linking), [Firestore rule conditions](https://firebase.google.com/docs/firestore/security/rules-conditions), [Firebase rules tests](https://firebase.google.com/docs/rules/unit-tests).

Additional payment-data blocker: existing order documents may contain raw card fields. Migrate payments to a provider and a separate safe order summary before giving Sellers order access. Reauthentication in the UI is not field-level Firestore protection. No existing payment records were deleted by this change.

## Environment setup
Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, NEXT_PUBLIC_FIREBASE_APP_ID and NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID in Vercel from Firebase Project Settings > Your apps. The Firebase browser configuration is environment-driven; this branch has no embedded live API key. Redeploy after setting it. Missing configuration uses an unconfigured demo project, not production.
