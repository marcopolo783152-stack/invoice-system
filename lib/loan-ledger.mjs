export function toCents(value) {
  const n = typeof value === 'string' ? Number(value.trim()) : Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error('INVALID_AMOUNT');
  const cents = Math.round(n * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('INVALID_AMOUNT');
  return cents;
}

export function fromCents(cents) {
  if (!Number.isSafeInteger(cents)) throw new Error('INVALID_CENTS');
  return cents / 100;
}

export function assertRepayment(balanceCents, amountCents) {
  if (!Number.isSafeInteger(balanceCents) || balanceCents < 0) throw new Error('INVALID_BALANCE');
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('INVALID_AMOUNT');
  if (amountCents > balanceCents) throw new Error('OVERPAYMENT');
  return balanceCents - amountCents;
}

export function assertReversal(originalAmountCents, currentBalanceCents, principalCents) {
  for (const value of [originalAmountCents, currentBalanceCents, principalCents]) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('INVALID_BALANCE');
  }
  const restored = currentBalanceCents + originalAmountCents;
  if (restored > principalCents) throw new Error('INVALID_REVERSAL');
  return restored;
}

export function loanStatus(balanceCents, dueDate, now = new Date()) {
  if (balanceCents === 0) return 'paid';
  if (dueDate && new Date(dueDate).getTime() < now.getTime()) return 'overdue';
  return 'active';
}

export function safeIdempotencyKey(value) {
  const key = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(key)) throw new Error('INVALID_IDEMPOTENCY_KEY');
  return key;
}

export function receiptNumber(loanId, paymentId) {
  return ('LN-' + loanId.slice(0, 6) + '-' + paymentId.slice(-8)).toUpperCase();
}
