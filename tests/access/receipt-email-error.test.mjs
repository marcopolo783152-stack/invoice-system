import test from 'node:test';
import assert from 'node:assert/strict';
import {receiptEmailError} from '../../lib/server/receipt-email-error.mjs';
test('email failures identify key mismatch, server access, missing templates and disconnected mailboxes',()=>{
 for(const [status,text,hint] of [[400,'The Public Key is invalid','EMAILJS_PUBLIC_KEY'],[403,'API calls are disabled for non-browser applications','non-browser'],[400,'Template ID not found','EMAILJS_TEMPLATE_INVOICE'],[412,'Gmail_API authentication failed','SERVICE_ID'],[429,'Too many requests','limit']])assert.ok(receiptEmailError(status,text).includes(hint));
});
test('raw provider details, addresses and secrets never enter the customer-facing error',()=>{
 const secret='very-secret-value',email='customer@example.com';
 for(const body of ['The Public Key is invalid '+secret,'SMTP failure for '+email,'Unrecognized '+secret]){
 const message=receiptEmailError(400,body);assert.ok(!message.includes(secret));assert.ok(!message.includes(email));
 }
});
