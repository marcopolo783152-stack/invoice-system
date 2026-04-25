/**
 * INVOICE NUMBER GENERATOR
 * 
 * Generates unique invoice numbers in format: MP########
 * AR = Ariana
 * ######## = 8-digit number
 */

import { getNextInvoiceNumber as getNextInvoiceNumberFromCloud } from './firebase-storage';
import { isFirebaseConfigured } from './firebase';
import { getAllInvoicesSync } from './invoice-storage';

const INVOICE_PREFIX = 'MP';
const STORAGE_KEY = 'lastInvoiceNumber';

/**
 * Get the last used invoice number from localStorage
 */
function getLastInvoiceNumber(): number {
  if (typeof window === 'undefined') return 0;

  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

/**
 * Save the last used invoice number to localStorage
 */
function saveLastInvoiceNumber(number: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, number.toString());
}

/**
 * Generate next invoice number
 * Format: MP########
 */
export async function generateInvoiceNumber(): Promise<string> {
  let nextNumber = 0;

  // 1. Try to get number from Cloud
  if (isFirebaseConfigured()) {
    try {
      const cloudNextStr = await getNextInvoiceNumberFromCloud();
      const match = cloudNextStr.match(/^MP(\d+)$/);
      if (match && match[1]) {
        nextNumber = parseInt(match[1], 10);
      }
    } catch (e) {
      console.warn('Failed to get number from cloud, falling back to local calculation:', e);
    }
  }

  // 2. Check local counter (AND scan actual invoices for safety)
  // Trusting 'getLastInvoiceNumber' alone is dangerous if invoices were imported or cache cleared.
  // We scan the actual list to find the true max.
  const invoices = getAllInvoicesSync();
  let maxLocal = getLastInvoiceNumber(); // Start with stored counter

  invoices.forEach(inv => {
    const numStr = inv.data.invoiceNumber || '';
    if (numStr.startsWith('MP')) {
      const numPart = parseInt(numStr.replace('MP', ''), 10);
      if (!isNaN(numPart) && numPart > maxLocal) {
        maxLocal = numPart;
      }
    }
  });

  const localNext = maxLocal + 1;

  // 3. Take the higher of the two (Safety net)
  if (localNext > nextNumber) {
    nextNumber = localNext;
  }

  // Double check we haven't produced a zero (if DB empty)
  if (nextNumber === 0) nextNumber = 1;

  // Pad with zeros to make 8 digits
  const paddedNumber = nextNumber.toString().padStart(8, '0');

  // Save for next time (keep local sync updated)
  saveLastInvoiceNumber(nextNumber);

  return `${INVOICE_PREFIX}${paddedNumber}`;
}

/**
 * Validate invoice number format
 */
export function isValidInvoiceNumber(invoiceNumber: string): boolean {
  const pattern = /^MP\d{8}$/;
  return pattern.test(invoiceNumber);
}

/**
 * Reset invoice counter (admin function)
 */
export function resetInvoiceCounter(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Set invoice counter to specific number (admin function)
 */
export function setInvoiceCounter(number: number): void {
  if (typeof window === 'undefined') return;
  saveLastInvoiceNumber(number);
}

/**
 * Get current counter value (for display/debugging)
 */
export function getCurrentCounter(): number {
  return getLastInvoiceNumber();
}
