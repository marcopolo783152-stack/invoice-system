import test from 'node:test';
import assert from 'node:assert/strict';
import {toCents,fromCents,assertRepayment,assertReversal,loanStatus,safeIdempotencyKey,receiptNumber} from '../../lib/loan-ledger.mjs';

test('stores dollars as exact cents',()=>assert.equal(toCents('123.45'),12345));
test('rounds ordinary decimal input to cents',()=>assert.equal(toCents(10.1+0.2),1030));
test('rejects zero and invalid loan amounts',()=>{assert.throws(()=>toCents(0));assert.throws(()=>toCents('nope'));});
test('converts cents back to dollars',()=>assert.equal(fromCents(9876),98.76));
test('partial repayment reduces only the outstanding balance',()=>assert.equal(assertRepayment(10000,2500),7500));
test('final repayment can close the balance exactly',()=>assert.equal(assertRepayment(2500,2500),0));
test('repayment cannot exceed the amount owed',()=>assert.throws(()=>assertRepayment(2000,2001),/OVERPAYMENT/));
test('loan becomes overdue after its due date',()=>assert.equal(loanStatus(100,'2026-09-01',new Date('2026-09-24T12:00:00Z')),'overdue'));
test('future unpaid loan remains active',()=>assert.equal(loanStatus(100,'2026-10-01',new Date('2026-09-24T12:00:00Z')),'active'));
test('zero balance is paid even when due date passed',()=>assert.equal(loanStatus(0,'2026-09-01',new Date('2026-09-24T12:00:00Z')),'paid'));
test('audited reversal restores the repayment without exceeding principal',()=>assert.equal(assertReversal(1500,3500,5000),5000));
test('idempotency keys and receipt numbers are stable',()=>{assert.equal(safeIdempotencyKey('abc_DEF_123'),'abc_DEF_123');assert.equal(receiptNumber('abcdef123','pay12345678'),'LN-ABCDEF-12345678');});
