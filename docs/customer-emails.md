# Shared customer emails

Manual invoice/signature-link emails and automated customer communications reuse the current EmailJS sending service and one shared HTML template. The application generates the green/cream design, customer-specific subject, details and action button. No additional template subscription is required for this implementation; EmailJS sending quotas still apply.

## Setup and activation

1. Reuse the existing invoice template or order receipt template. Manual invoice and signature-link messages now also provide the complete shared HTML design. Set To Email to `{{to_email}}`, Subject to `{{subject}}`, and the HTML body to `{{{message}}}`. Set From Name to Marco Polo Oriental Rugs and Reply To to `{{reply_to}}`. Do not leave a fixed invoice title or invoice-specific wrapper around the message.
2. In Vercel Production, set `EMAILJS_TEMPLATE_CUSTOMER_MESSAGES` to that existing template ID. The existing `EMAILJS_TEMPLATE_ORDER_RECEIPT` is the fallback. Keep `EMAILJS_SERVICE_ID`, `EMAILJS_PUBLIC_KEY`, and `EMAILJS_PRIVATE_KEY` from the same account. Private keys remain server-side. EmailJS must allow server/non-browser requests.
3. Set a random `CRON_SECRET` in Vercel Production and redeploy. The daily cron in `vercel.json` invokes the authenticated worker at 13:00 UTC (9 AM EDT / 8 AM EST). Day-before reminders use the Alexandria calendar and include the correct Eastern timezone in the message.
4. Open Showroom Admin → Appointments → Customer emails. Send a preview to the signed-in manager's email. Check its design, inbox/spam, sending address and Reply To. Enable automatic customer emails and save. Sending remains paused until this step; a successful provider test is required before activation. Activation records the shared template ID in the existing cloud email configuration for manual invoice/signature links, without replacing their original template IDs. Those manual messages retain their existing format until activation. Server Service ID/Public Key must match existing cloud Invoice Settings before enabling this shared configuration.
5. Create an isolated appointment with your own email, accept it, and verify the request/confirmation in history and inbox. Test a tomorrow appointment and tomorrow pickup via Process pending emails, then verify the scheduled job's result in Vercel and the admin history.

The daily schedule is the lowest-frequency supported Vercel cron option. For timely recovery and larger queues, an existing authorized scheduler can invoke GET `/api/customer-emails/worker` every 5–15 minutes with `Authorization: Bearer <CRON_SECRET>`, or use a more frequent Vercel cron on a supporting plan. Do not expose this secret to the browser. One bounded worker run processes up to 25 pending events within its time budget; the admin can run additional batches. A configured secret is not proof the scheduler has run: the panel shows the last completed processing time.

## Events and integrity

- Appointment request received (pending), staff confirmation, cancellation/rejection, changed confirmed schedule, and tomorrow reminder.
- Estimate acknowledgment with each rug's service/type/size; a requested pickup date is not a booked pickup.
- Scheduled pickup, changed/canceled pickup, and tomorrow reminder with the customer's collection address.
- Saved main `invoices` wash/repair intake and ready status. Vendor `Ready` alone does not notify a customer; invoice `ready` is the showroom's completion state. Draft invoices are excluded. Invoice links use existing expiring, private customer-share tokens.
- Shipment and delivered updates from the showroom order mirror. The tracking button opens the existing site tracking page, which resolves the carrier. Live orders do not generate a duplicate shipment event from their payment record.
- Refund notices only from verified live-order `refundedAmount` increments. Pending/failed Stripe refunds do not produce notices. Amounts show this refund and cumulative refund.
- Existing paid-order receipt logic remains responsible for payment confirmations. Its rendering now uses the same shared design/provider template, preserves receipt status/cooldown, and includes every item, discount, shipping, tax, total, and refunds. It does not enqueue a second payment confirmation.

Source snapshots, settings, revision counters, worker cursors and email outbox are Firebase server-only collections, covered by the existing catch-all client deny rule. No Firestore rules or stored customer/financial records are migrated. First observations of historical records establish a baseline rather than send historical confirmations; upcoming confirmed reservations can still receive tomorrow reminders.

Immediate hooks run after successful saves. Before edits they capture the previous state. Polling cursor sweeps recover events when a browser closes, but can miss intermediate transitions between sweeps; direct save hooks are the primary path. Main showroom invoice collection is supported; unrelated prefixed store invoice collections are intentionally excluded.

Events are atomically created with source snapshots. Retries use the same event, not a new message. Before sending, canceled, rescheduled, deleted, changed-recipient or superseded records are checked. Account sends from this queue are serialized at a minimum 1.1 seconds. Worker and message leases prevent concurrent automatic sends. A provider timeout or crashed send is `uncertain`: no automatic retry because the provider may already have sent it. Inspect EmailJS history before manual retry. Explicit provider rejection is `failed`, visible for manual retry. The provider has no exactly-once guarantee across network failures.

`accepted` means provider acceptance, not inbox delivery; no delivery/open state is invented. Missing configuration leaves pending events saved. Message history holds the latest 100 events in admin. Changing a category toggle affects its pending automatic sends as well as new events; a manual retry requires enabled automation and rechecks the source.

Staff permissions protect all control/history/test/retry endpoints. Event requests accept only saved record references, verify staff permission or booking/request ownership, and never accept browser-supplied recipients, amounts or HTML. Tests are sent only to the signed-in email manager. No SMS, credentials, live records, or email-provider settings were changed by this code update.
