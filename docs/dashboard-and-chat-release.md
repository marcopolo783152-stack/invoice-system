# Dashboard, customer access and chat release

## Built on the review branch
- Warm green, ivory and gold dashboard styling, readable labels, responsive navigation and a real-data overview.
- Customer dashboard at /account: own purchases, appointment records, locally saved rugs, profile editing and support chat.
- /sign-in for customer access; the existing account popup uses this same sign-in component.
- /forgot-password is a separate page accepting the registered email (also the account username). Reset responses do not disclose whether someone has an account.
- /verify-email keeps password registrations outside the dashboard until Firebase confirms email verification. Google identities use Firebase’s verified-email result. Registration does not grant staff privileges.
- Chat messages now go through a Firebase-authenticated server endpoint, with a database-backed per-user rate limit. Customer browsers cannot write AI/staff messages.
- Cyrus uses canonical shop information plus a matching sample of the live rug catalog. It does not receive customer orders or payment details as AI context.
- A factual fallback answers greetings, business hours, location and service questions if OpenAI is unavailable.
- Contact handoff collects full name, email and phone. A staff member enters their name and accepts the chat; an atomic claim prevents two employees claiming it together. A friendly greeting announces the joining employee. In-flight AI replies stop after a human accepts.
- Staff can reply from the small chat window or the main inbox. Subscription errors and failed sends are shown rather than reported as delivered.
- The old raw-card reveal/password screen is removed. Existing payment records were not deleted or migrated.

## Required Vercel configuration
Set these under Project > Settings > Environment Variables for the intended Preview/Production environment, then redeploy:
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID

Copy these browser configuration values from Firebase > Project Settings > Your apps. For a test preview use a separate Firebase test project rather than the live business data.

For server chat, set private server-only values:
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY
- OPENAI_API_KEY
- OPENAI_MODEL (optional; default gpt-4.1-mini)

The Firebase server values come from a dedicated Firebase service account. Keep the private key and OpenAI key in Vercel only. Do not send keys through chat or commit them. Enable Anonymous sign-in for guests, Email/Password and Google, and add each exact preview/custom hostname under Firebase Authentication > Settings > Authorized domains.

Publish the reviewed Firestore rules and the chat index only to the test project first. The chat history query needs showroom_chat: sessionId ascending, timestamp descending. The repo’s firestore.indexes.json contains that index.

## Production release gate
This branch is a draft until the browser checks below and the remaining compatibility items in staff-access-rollout.md are complete. Pushing code does not publish Firebase rules or configure Vercel secrets.
1. Register a new customer. Verify dashboard access is blocked before email verification and works after the link.
2. Reset a password from the customer popup and staff sign-in; confirm the separate page, email delivery and successful reset.
3. Check owner, General Manager, Seller, Custom and disabled accounts. Attempt direct invoice links.
4. On desktop and mobile, test menus, purchases, appointments, favorites and profile save errors.
5. Send a greeting, a real rug question and an unknown question. Submit contact details, accept from one staff account, attempt a second claim, and reply both ways.
6. Check OpenAI timeout/missing configuration and verify no false promise that a person joined.
7. Complete legacy order/payment migration, checkout server validation, shared invoice tokens and storage/API access review before production restrictions. The existing live public Firestore rule must not be considered safe for employee/customer privacy.
