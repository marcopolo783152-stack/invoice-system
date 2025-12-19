# Email Setup Guide

Your invoice system now supports:
- ✅ Sending invoices via email to customers
- ✅ Security confirmations for delete/export operations (sent to marcopolorugs@aol.com)

## Setup EmailJS (Free Service)

### Step 1: Create EmailJS Account
1. Go to https://www.emailjs.com/
2. Click "Sign Up" (Free plan - 200 emails/month)
3. Confirm your email

### Step 2: Add Email Service
1. Go to "Email Services" tab
2. Click "Add New Service"
3. Choose your email provider (Gmail recommended):
   - **For Gmail:** Select Gmail
   - Enter marcopolorugs@aol.com
   - Click "Connect Account" and authorize
4. Copy the **Service ID** (e.g., `service_xyz123`)

### Step 3: Create Email Templates

#### Template 1: Invoice Email
1. Go to "Email Templates" tab
2. Click "Create New Template"
3. Template Name: `invoice_template`
4. Subject: `Invoice {{invoice_number}} from Marco Polo Oriental Rugs`
5. Content:
```
Dear {{to_name}},

Thank you for your business!

Please find your invoice below:

Invoice Number: {{invoice_number}}

{{message}}

{{invoice_html}}

---
Marco Polo Oriental Rugs, Inc.
3260 Duke St, Alexandria, VA 22314
Phone: 703-461-0207
www.marcopolorugs.com
```
6. Save and copy the **Template ID**

#### Template 2: Security Confirmation
1. Create another new template
2. Template Name: `security_confirmation`
3. Subject: `Security Confirmation Required - {{action}}`
4. Content:
```
Security Confirmation Request

Action: {{action}}
Details: {{details}}
Time: {{timestamp}}

Your confirmation code is:

{{confirmation_code}}

This code expires in 5 minutes.

If you did not request this action, please ignore this email.

---
Marco Polo Oriental Rugs Invoice System
```
5. Save and copy the **Template ID**

### Step 4: Get Public Key
1. Go to "Account" tab
2. Find "API Keys" section
3. Copy your **Public Key**

### Step 5: Update Configuration
1. Open `lib/email-service.ts`
2. Replace these values:
```typescript
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID'; // Replace with Service ID from Step 2
const EMAILJS_TEMPLATE_ID_INVOICE = 'YOUR_TEMPLATE_ID'; // Invoice template ID
const EMAILJS_TEMPLATE_ID_CONFIRM = 'YOUR_CONFIRM_TEMPLATE_ID'; // Security template ID
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY'; // Public Key from Step 4
```

Example:
```typescript
const EMAILJS_SERVICE_ID = 'service_xyz123';
const EMAILJS_TEMPLATE_ID_INVOICE = 'template_abc456';
const EMAILJS_TEMPLATE_ID_CONFIRM = 'template_def789';
const EMAILJS_PUBLIC_KEY = 'xKs8_P3nQ2mR9tY4';
```

### Step 6: Test

1. Create an invoice
2. Click "📧 Email Invoice"
3. Enter test email address
4. Check if email is received

For security operations:
1. Try to delete an invoice
2. Check marcopolorugs@aol.com for confirmation code
3. Enter code to complete action

## Features

### Send Invoice to Customer
- Click "📧 Email Invoice" button
- System prompts for customer email
- Invoice sent as HTML email
- Includes all invoice details

### Security Confirmations
Operations requiring confirmation:
- ❌ Delete invoice (single)
- ❌ Delete multiple invoices (bulk)
- 📥 Export all invoices as PDFs

Process:
1. Attempt protected operation
2. System sends 6-digit code to marcopolorugs@aol.com
3. Check email and enter code
4. Operation proceeds if code matches

## Troubleshooting

### Emails not sending:
- Verify all IDs are correctly copied
- Check EmailJS dashboard for quota
- Ensure marcopolorugs@aol.com is verified

### Security codes not working:
- Check spam folder
- Codes expire in 5 minutes
- Verify EMAILJS_TEMPLATE_ID_CONFIRM is set

### Rate limits:
- Free plan: 200 emails/month
- Upgrade if needed at https://www.emailjs.com/pricing

## Alternative: SendGrid

If you prefer SendGrid:
1. Get API key from https://sendgrid.com
2. Replace EmailJS code with SendGrid API
3. Same functionality

## Security Notes

- Confirmation codes are 6 digits
- Codes sent only to marcopolorugs@aol.com
- Prevents unauthorized deletions/exports
- No code = operation cancelled
