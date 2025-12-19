/**
 * INVOICE STORAGE SYSTEM
 * 
 * Manages saving and retrieving invoices from localStorage
 * Allows searching by multiple criteria
 */

import { InvoiceData } from './calculations';

const STORAGE_KEY = 'saved_invoices';

export interface SavedInvoice {
  id: string;
  data: InvoiceData;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all saved invoices
 */
export function getAllInvoices(): SavedInvoice[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error parsing invoices:', error);
    return [];
  }
}

/**
 * Save an invoice
 */
export function saveInvoice(data: InvoiceData): SavedInvoice {
  const invoices = getAllInvoices();
  
  // Check if invoice already exists (by invoice number)
  const existingIndex = invoices.findIndex(
    inv => inv.data.invoiceNumber === data.invoiceNumber
  );
  
  const now = new Date().toISOString();
  
  if (existingIndex >= 0) {
    // Update existing invoice
    invoices[existingIndex] = {
      ...invoices[existingIndex],
      data,
      updatedAt: now,
    };
  } else {
    // Create new invoice
    const newInvoice: SavedInvoice = {
      id: Math.random().toString(36).substr(2, 9),
      data,
      createdAt: now,
      updatedAt: now,
    };
    invoices.push(newInvoice);
  }
  
  // Save to localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  
  return existingIndex >= 0 ? invoices[existingIndex] : invoices[invoices.length - 1];
}

/**
 * Get invoice by ID
 */
export function getInvoiceById(id: string): SavedInvoice | null {
  const invoices = getAllInvoices();
  return invoices.find(inv => inv.id === id) || null;
}

/**
 * Get invoice by invoice number
 */
export function getInvoiceByNumber(invoiceNumber: string): SavedInvoice | null {
  const invoices = getAllInvoices();
  return invoices.find(
    inv => inv.data.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase()
  ) || null;
}

/**
 * Search invoices by multiple criteria
 */
export function searchInvoices(query: string): SavedInvoice[] {
  if (!query.trim()) return getAllInvoices();
  
  const invoices = getAllInvoices();
  const searchTerm = query.toLowerCase().trim();
  
  return invoices.filter(inv => {
    const data = inv.data;
    
    // Search by invoice number
    if (data.invoiceNumber.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Search by customer name
    if (data.soldTo.name.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Search by phone
    if (data.soldTo.phone.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Search by address
    if (data.soldTo.address.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Search by city
    if (data.soldTo.city.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Search by zip
    if (data.soldTo.zip.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    return false;
  });
}

/**
 * Delete an invoice
 */
export function deleteInvoice(id: string): boolean {
  const invoices = getAllInvoices();
  const filtered = invoices.filter(inv => inv.id !== id);

  if (filtered.length === invoices.length) {
    return false; // Invoice not found
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Get invoices count
 */
export function getInvoicesCount(): number {
  return getAllInvoices().length;
}

/**
 * Export all invoices as JSON
 */
export function exportInvoices(): string {
  const invoices = getAllInvoices();
  return JSON.stringify(invoices, null, 2);
}

/**
 * Import invoices from JSON
 */
export function importInvoices(jsonString: string): boolean {
  try {
    const invoices = JSON.parse(jsonString);
    if (!Array.isArray(invoices)) {
      throw new Error('Invalid format');
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
    return true;
  } catch (error) {
    console.error('Error importing invoices:', error);
    return false;
  }
}

/**
 * Clear all invoices (use with caution)
 */
export function clearAllInvoices(): void {
  if (confirm('Are you sure you want to delete all invoices? This cannot be undone.')) {
    localStorage.removeItem(STORAGE_KEY);
  }
}
