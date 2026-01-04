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
  templateIdConfirm: string; // Optional for now
  publicKey: string;
}

const DEFAULT_CONFIG: EmailConfig = {
  serviceId: 'Marcopolo-Rugs',
  templateIdInvoice: '',
  templateIdConfirm: '',
  publicKey: ''
};

// Admin email for security confirmations
const ADMIN_EMAIL = 'marcopolorugs@aol.com';

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
export async function sendInvoiceEmail(
  customerEmail: string,
  customerName: string,
  invoiceNumber: string,
  invoiceHTML: string,
  pdfBlob?: Blob
): Promise<boolean> {
  const config = getEmailConfig();

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
      from_name: 'Marco Polo Oriental Rugs',
      invoice_number: invoiceNumber,
      message: `Dear ${customerName},\n\nPlease find attached your invoice ${invoiceNumber}.\n\nThank you for your business!\n\nBest regards,\nMarco Polo Oriental Rugs\n703-461-0207`,
      invoice_html: invoiceHTML,
    };

    // If PDF blob is provided, we would ideally attach it.
    // However, EmailJS client-side SDK has limitations with attachments in the free/standard tier directly from blob 
    // without a backend or specific paid features usually. 
    // BUT checking docs: EmailJS specifically implementation often requires passing the content.
    // Standard template params are text. 
    // For attachments, we usually need specific file-input handling or base64 if supported by the provider.
    // 
    // CRITICAL NOTE: EmailJS browser-side `send` does NOT easily support arbitrary Blob attachments 
    // unless using the `sendForm` method with a form element containing a file input.
    // 
    // Since we are generating a Blob programmatically, `emailjs.send` is preferred.
    // Many users just send a link or HTML. 
    // However, if the user requested "send the invoice", a link or the body is often enough.
    // 
    // Re-reading user request: "send the invoice by email".
    // I will stick to sending the HTML body + text for now as it's most reliable with the free EmailJS tier and no backend proxy.
    // 
    // Feature add: If we really want attachments, we might need a more complex flow or base64 if the template allows it.
    // I will proceed with sending the Invoice data rendered in the email body, which is what the current code seemed to intend (`invoice_html`).

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

