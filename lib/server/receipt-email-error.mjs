export function receiptEmailError(status,body=''){
  const text=String(body).toLowerCase();
  if(/non.browser|api calls.*disabled|api requests.*disabled/.test(text))return 'Enable EmailJS API for non-browser applications in EmailJS Account → Security.';
  if(/public key|user.?id|account.*not found|invalid.*account/.test(text))return 'Check EMAILJS_PUBLIC_KEY in Vercel. It must belong to the same EmailJS account as your private key.';
  if(/service|gmail|smtp|oauth/.test(text))return 'Check EMAILJS_SERVICE_ID and reconnect or test the email service in EmailJS.';
  if(/private key|access.?token|authentication|unauthorized/.test(text)||status===401)return 'Check EMAILJS_PRIVATE_KEY in Vercel and private-key authorization in EmailJS Account → Security.';
  if(/template/.test(text))return 'Check EMAILJS_TEMPLATE_INVOICE in Vercel. Use the exact template ID from your EmailJS account.';
  if(status===429||/quota|limit/.test(text))return 'EmailJS sending limit reached. Check account quota and retry later.';
  if(status===403)return 'EmailJS denied the request. Check Account → Security, non-browser API access, and matching public/private keys.';
  return 'EmailJS could not send the receipt'+(Number.isInteger(status)?' (HTTP '+status+')':'')+'. Check EmailJS Email History for the provider error.';
}
