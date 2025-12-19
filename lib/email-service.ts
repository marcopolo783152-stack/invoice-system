/**
 * EMAIL SERVICE
 * Send invoices via email and security confirmations
 */

import emailjs from '@emailjs/browser';

// EmailJS Configuration (Get these from emailjs.com after signup)
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID'; // Replace with your EmailJS service ID
const EMAILJS_TEMPLATE_ID_INVOICE = 'YOUR_TEMPLATE_ID'; // Template for sending invoices
const EMAILJS_TEMPLATE_ID_CONFIRM = 'YOUR_CONFIRM_TEMPLATE_ID'; // Template for security confirmation
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY'; // Your EmailJS public key
const ADMIN_EMAIL = 'marcopolorugs@aol.com';

// Initialize EmailJS
if (typeof window !== 'undefined') {
  emailjs.init(EMAILJS_PUBLIC_KEY);
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
  try {
    const templateParams = {
      to_email: customerEmail,
      to_name: customerName,
      from_name: 'Marco Polo Oriental Rugs',
      invoice_number: invoiceNumber,
      message: `Dear ${customerName},\n\nPlease find attached your invoice ${invoiceNumber}.\n\nThank you for your business!\n\nBest regards,\nMarco Polo Oriental Rugs\n703-461-0207`,
      invoice_html: invoiceHTML,
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID_INVOICE,
      templateParams
    );

    if (response.status === 200) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return false;
  }
}

/**
 * Send security confirmation code to admin email
 */
export async function sendSecurityConfirmation(
  action: string,
  details: string
): Promise<string> {
  try {
    // Generate 6-digit confirmation code
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const templateParams = {
      to_email: ADMIN_EMAIL,
      action: action,
      details: details,
      confirmation_code: confirmationCode,
      timestamp: new Date().toLocaleString(),
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID_CONFIRM,
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
      body { font-family: Arial, sans-serif; }
      .invoice { max-width: 800px; margin: 0 auto; padding: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; }
    </style>
  `;
  
  return styles + clone.outerHTML;
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return (
    EMAILJS_SERVICE_ID !== 'YOUR_SERVICE_ID' &&
    EMAILJS_TEMPLATE_ID_INVOICE !== 'YOUR_TEMPLATE_ID' &&
    EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY'
  );
}
