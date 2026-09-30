/** Fields shared by the existing EmailJS invoice and receipt templates. */
export function invoiceEmailFields(customerName, invoiceNumber, invoiceLink) {
  const name = String(customerName ?? '').trim() || 'Customer';
  const number = String(invoiceNumber ?? '').trim();
  const link = String(invoiceLink ?? '').trim();
  if (!number) throw new Error('Invoice number is required before sending email.');
  let url;
  try { url = new URL(link); } catch { throw new Error('A valid invoice link is required before sending email.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('A valid invoice link is required before sending email.');
  }
  return {
    to_name: name,
    customer_name: name,
    from_name: 'Marco Polo Oriental Rugs',
    invoice_number: number,
    invoice_link: link,
    invoice_url: link,
  };
}
