/**
 * EMAIL SERVICE
 * Send invoices via email and security confirmations
 */

import emailjs from '@emailjs/browser';

// EmailJS Configuration Keys
const STORAGE_KEY_EMAIL_CONFIG = 'emailjs_config';

export interface EmailConfig {
  serviceId: string;
  templateIdInvoice: string;
  templateIdSignature?: string; // Dedicated template for signatures
  templateIdConfirm: string; // Optional for now
  publicKey: string;
  privateKey?: string; // Optional, only needed for backend sending with attachments
}

const DEFAULT_CONFIG: EmailConfig = {
  serviceId: 'marcopolo2',
  templateIdInvoice: 'rm8govh',
  templateIdSignature: 'rm8govh',
  templateIdConfirm: '',
  publicKey: 'Anj9zrEUo-VEWvMVw',
  privateKey: 'ZgV1UYxVUy0UQKBmgj3I5',
};

// Admin email for security confirmations
const ADMIN_EMAIL = 'arianaorientalrugs@gmail.com';

/**
 * Get email configuration from local storage
 */
export function getEmailConfig(): EmailConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;

  try {
    const stored = localStorage.getItem(STORAGE_KEY_EMAIL_CONFIG);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to parse email config', e);
  }
  return DEFAULT_CONFIG;
}

/**
 * Save email configuration to local storage
 */
export function saveEmailConfig(config: EmailConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_EMAIL_CONFIG, JSON.stringify(config));
  // Re-init emailjs with new key
  if (config.publicKey) {
    emailjs.init(config.publicKey);
  }
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  const config = getEmailConfig();
  return !!(config.serviceId && config.templateIdInvoice && config.publicKey);
}

// Initialize EmailJS on load if configured
if (typeof window !== 'undefined') {
  const config = getEmailConfig();
  if (config.publicKey) {
    emailjs.init(config.publicKey);
  }
}

/**
 * Send invoice to customer via email
 */
/**
 * Send invoice to customer via email (Link Strategy)
 */
export async function sendInvoiceEmail(
  customerEmail: string,
  customerName: string,
  invoiceNumber: string,
  invoiceLink: string,
  configOverride?: EmailConfig
): Promise<boolean> {
  const config = configOverride || getEmailConfig();

  // Basic validation
  if (!config.serviceId || !config.templateIdInvoice || !config.publicKey) {
    throw new Error('Email service not configured. Please check settings.');
  }

  try {
    // Initialize just in case (e.g. first run)
    emailjs.init(config.publicKey);

    const templateParams: Record<string, any> = {
      to_email: customerEmail,
      to_name: customerName,
      from_name: 'Ariana Oriental Rugs',
      invoice_number: invoiceNumber,
      // Updated message with Direct Link
      message: `Dear ${customerName},\n\nYou can view and download your invoice #${invoiceNumber} at the link below:\n\n${invoiceLink}\n\nThank you for your business!\n\nBest regards,\nAriana Oriental Rugs\n+1 (703) 801 1640`,
      invoice_link: invoiceLink, // Sending as separate param too just in case template uses it
      // invoice_html: removed to save size
    };

    const response = await emailjs.send(
      config.serviceId,
      config.templateIdInvoice,
      templateParams
    );

    if (response.status === 200) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error sending invoice email:', error);
    throw error; // Throw so UI can handle it
  }
}

/**
 * Send invoice email via Server-Side API (allows PDF attachments)
 */
export async function sendInvoiceEmailServer(
  customerEmail: string,
  customerName: string,
  invoiceNumber: string,
  pdfBlob: Blob
): Promise<boolean> {
  const config = getEmailConfig();

  if (!config.serviceId || !config.templateIdInvoice || !config.publicKey || !config.privateKey) {
    throw new Error('Missing configuration for secure email sending (Private Key required).');
  }

  // Convert Blob to Base64
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onloadend = async () => {
      try {
        const base64data = reader.result as string;

        const payload = {
          service_id: config.serviceId,
          template_id: config.templateIdInvoice,
          user_id: config.publicKey,
          accessToken: config.privateKey,
          template_params: {
            to_email: customerEmail,
            to_name: customerName,
            from_name: 'Ariana Oriental Rugs',
            invoice_number: invoiceNumber,
            // Removed invoice_html to avoid 50kb EmailJS variable limit
            message: `Dear ${customerName},\n\nPlease find attached your invoice ${invoiceNumber} (PDF).\n\nThank you for your business!\n\nBest regards,\nAriana Oriental Rugs\n+1 (703) 801 1640`,
          },
          attachment_data: {
            name: `Invoice_${invoiceNumber}.pdf`,
            base64: base64data
          }
        };

        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const text = await res.text();
          try {
            const json = JSON.parse(text);
            throw new Error(json.error || 'Failed to send email via server');
          } catch (e: any) {
            throw new Error(`Server Error (${res.status}): ${text.substring(0, 200)}...`);
          }
        }

        resolve(true);

      } catch (err) {
        console.error('Server email send error:', err);
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read PDF blob'));
    reader.readAsDataURL(pdfBlob);
  });
}

/**
 * Send security confirmation code to admin email
 */
export async function sendSecurityConfirmation(
  action: string,
  details: string
): Promise<string> {
  const config = getEmailConfig();

  if (!config.serviceId || !config.templateIdConfirm || !config.publicKey) {
    throw new Error('Email service not configured for security confirmations.');
  }

  try {
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const templateParams = {
      to_email: ADMIN_EMAIL,
      action: action,
      details: details,
      confirmation_code: confirmationCode,
      timestamp: new Date().toLocaleString(),
    };

    const response = await emailjs.send(
      config.serviceId,
      config.templateIdConfirm,
      templateParams
    );

    if (response.status === 200) {
      return confirmationCode;
    }
    throw new Error('Failed to send confirmation email');
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw error;
  }
}

/**
 * Verify security code entered by user
 */
export function verifySecurityCode(
  enteredCode: string,
  expectedCode: string
): boolean {
  return enteredCode === expectedCode;
}

/**
 * Request security confirmation for sensitive operations
 */
export async function requestSecurityConfirmation(
  action: string,
  details: string
): Promise<boolean> {
  // Check if email is configured
  if (!isEmailConfigured()) {
    // Allow operation without email confirmation if not configured
    const proceed = confirm(
      `⚠️ Email security is not configured yet.\n\n` +
      `Action: ${action}\n` +
      `Details: ${details}\n\n` +
      `Do you want to proceed without email confirmation?\n\n` +
      `(Set up EmailJS to enable secure confirmations)`
    );
    return proceed;
  }

  try {
    // Send confirmation code to admin email
    const confirmationCode = await sendSecurityConfirmation(action, details);

    // Show prompt for user to enter code
    const enteredCode = prompt(
      `Security Confirmation Required\n\n` +
      `Action: ${action}\n` +
      `Details: ${details}\n\n` +
      `A 6-digit confirmation code has been sent to ${ADMIN_EMAIL}\n` +
      `Please check your email and enter the code to proceed:\n\n` +
      `(Code expires in 5 minutes)`
    );

    if (!enteredCode) {
      alert('Security confirmation cancelled.');
      return false;
    }

    // Verify the code
    if (verifySecurityCode(enteredCode.trim(), confirmationCode)) {
      return true;
    } else {
      alert('Invalid confirmation code. Action cancelled.');
      return false;
    }
  } catch (error) {
    alert('Failed to send confirmation email. Proceeding without confirmation.');
    const proceed = confirm(`Do you want to proceed with: ${action}?`);
    return proceed;
  }
}

/**
 * Convert invoice HTML to email-friendly format
 */
export function prepareInvoiceForEmail(invoiceElement: HTMLElement): string {
  // Clone the element to avoid modifying the original
  const clone = invoiceElement.cloneNode(true) as HTMLElement;

  // Convert relative image paths to absolute URLs
  if (typeof window !== 'undefined') {
    const images = clone.querySelectorAll('img');
    images.forEach((img) => {
      const src = img.getAttribute('src');
      if (src && src.startsWith('/')) {
        img.src = `${window.location.origin}${src}`;
      }
    });
  }

  // Add inline styles for email compatibility
  const styles = `
    <style>
      .email-invoice {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        font-family: Arial, sans-serif;
        background: white;
        color: black;
      }
      .email-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #000;
        padding-bottom: 10px;
        margin-bottom: 15px;
      }
      .email-business-info h1 {
        margin: 0 0 5px 0;
        font-size: 16pt;
        font-weight: bold;
        color: #000;
      }
      .email-business-info p {
        margin: 2px 0;
        font-size: 8pt;
        line-height: 1.3;
      }
      .email-logo {
        max-width: 120px;
      }
      .email-document-title h2 {
        text-align: center;
        margin: 10px 0 5px 0;
        letter-spacing: 2px;
      }
      .email-info-section {
        display: flex;
        justify-content: space-between;
        margin-bottom: 15px;
        gap: 20px;
      }
      .email-client-details {
        flex: 1;
      }
      .email-invoice-info {
        flex: 0 0 220px;
        border: 2px solid #000;
        padding: 10px;
      }
      .email-invoice-info table {
        width: 100%;
        border-collapse: collapse;
      }
      .email-invoice-info td {
        padding: 3px 0;
        font-size: 9pt;
      }
      .email-items-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 8pt;
      }
      .email-items-table th {
        background-color: #f0f0f0;
        border: 1px solid #000;
        padding: 4px 3px;
        text-align: center;
        font-weight: bold;
      }
      .email-items-table td {
        border: 1px solid #999;
        padding: 3px 2px;
      }
      .email-subheader th {
        background-color: #e0e0e0;
        font-size: 7pt;
      }
      .email-footer {
        display: flex;
        justify-content: space-between;
        margin-top: 30px;
        gap: 20px;
      }
      .email-notes-section {
        flex: 1;
      }
      .email-notes-section h4 {
        margin: 0 0 5px 0;
        font-size: 9pt;
        font-weight: bold;
        text-decoration: underline;
      }
      .email-notes-section p {
        margin: 3px 0;
        font-size: 8pt;
      }
      .email-sales-terms {
        margin-top: 10px;
        padding: 8px;
        background-color: #f9f9f9;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      .email-totals-section {
        flex: 0 0 240px;
      }
      .email-totals-table {
        width: 100%;
        border-collapse: collapse;
      }
      .email-totals-table td {
        padding: 4px 8px;
        font-size: 9pt;
      }
      .email-total-due-row td {
        border-top: 2px double #000;
        border-bottom: 2px double #000;
        padding: 8px;
        font-size: 11pt;
        font-weight: bold;
      }
      .email-signature-section {
        margin-top: 30px;
        padding: 20px;
        border-top: 1px solid #ddd;
      }
      .email-signature-section img {
        max-width: 200px;
        height: auto;
      }
    </style>
  `;

  return styles + clone.outerHTML;
}

/**
 * Send signature request email to customer
 */
export async function sendSignatureRequestEmail(
  toEmail: string,
  customerName: string,
  invoiceNumber: string,
  signatureLink: string
): Promise<boolean> {
  const config = getEmailConfig();
  const templateId = config.templateIdSignature || config.templateIdInvoice;

  if (!config.serviceId || !templateId || !config.publicKey) {
    console.warn('EmailJS not configured for signature request. Link:', signatureLink);
    return false;
  }

  try {
    await emailjs.send(
      config.serviceId,
      templateId,
      {
        to_email: toEmail,
        to_name: customerName,
        subject: `Signature Required: Invoice #${invoiceNumber}`,
        email_title: "Sign Your Invoice",
        button_text: "Sign the Invoice",
        invoice_number: invoiceNumber,
        signature_link: signatureLink,
        invoice_link: signatureLink,
        invoice_url: signatureLink,
        message: `Dear ${customerName},\n\nYour signature is required for invoice #${invoiceNumber}. Please click the link below to sign electronically. This link is for one-time use:\n\n${signatureLink}\n\nThank you!`
      },
      config.publicKey
    );
    return true;
  } catch (error) {
    console.error('Failed to send signature request email:', error);
    return false;
  }
}

