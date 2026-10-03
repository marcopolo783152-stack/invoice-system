# Online order receipt email

Order receipts use a separate EmailJS template. Existing invoice templates remain available for invoices.

1. In EmailJS → Email Templates, create a template named **Order receipt**.
2. Set **To Email** to `{{to_email}}`, **Subject** to `{{subject}}`, and the HTML content to `{{{message}}}`. The application supplies the full receipt with customer name, short order number, items, payment, shipping, tax, and refund information. The application escapes customer-provided text before generating HTML.
3. Copy its exact template ID into Vercel's Production environment variable `EMAILJS_TEMPLATE_ORDER_RECEIPT`.
4. Set `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`, and `EMAILJS_SERVICE_ID` from that same EmailJS account. The public key must match the private key's account. Keep the private key server-side.
5. Allow non-browser API requests in EmailJS Account → Security, save, and redeploy the current GitHub branch in Vercel.
6. Open Customer Orders and use **Email receipt / resend**. Check the displayed send status and the customer's inbox.

EmailJS configuration cannot be changed through GitHub. A successful API response records provider acceptance, not guaranteed inbox delivery.
