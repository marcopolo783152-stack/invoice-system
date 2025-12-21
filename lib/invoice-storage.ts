/**
 * INVOICE STORAGE SYSTEM
 * 
 * Hybrid storage: Firebase (cloud) + localStorage (backup)
 * Automatically syncs across all devices
 */

import { InvoiceData } from './calculations';
import { 
  saveInvoiceToCloud, 
  getInvoicesFromCloud, 
  updateInvoiceInCloud,
  deleteInvoiceFromCloud,
  deleteMultipleInvoicesFromCloud 
} from './firebase-storage';
import { isFirebaseConfigured } from './firebase';

const STORAGE_KEY = 'saved_invoices';

export interface SavedInvoice {
  id: string;
  data: InvoiceData;
  createdAt: string;
  updatedAt: string;
  documentType?: 'INVOICE' | 'CONSIGNMENT'; // For future compatibility
}

/**
 * Get all saved invoices (from Firebase or localStorage)
 */
export async function getAllInvoices(): Promise<SavedInvoice[]> {
  if (typeof window === 'undefined') return [];
  
  // Try Firebase first
  if (isFirebaseConfigured()) {
    try {
      const cloudInvoices = await getInvoicesFromCloud();
      // Convert Firebase format to local format
      return cloudInvoices.map(invoice => ({
        id: invoice.id,
        data: invoice.data,
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.createdAt.toISOString()
      }));
    } catch (error) {
      console.error('Error fetching from Firebase, using localStorage:', error);
    }
  }
  
  // Fallback to localStorage
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
 * Get all invoices synchronously (localStorage only)
 */
export function getAllInvoicesSync(): SavedInvoice[] {
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
 * Save an invoice (to both Firebase and localStorage)
 */
export async function saveInvoice(data: InvoiceData): Promise<SavedInvoice> {
  const invoices = getAllInvoicesSync();
  
  // Check if invoice already exists (by invoice number)
  const existingIndex = invoices.findIndex(
    inv => inv.data.invoiceNumber === data.invoiceNumber
  );
  
  const now = new Date().toISOString();
  let savedInvoice: SavedInvoice;
  
  if (existingIndex >= 0) {
    // Update existing invoice
    savedInvoice = {
      ...invoices[existingIndex],
      data,
      updatedAt: now,
    };
    invoices[existingIndex] = savedInvoice;
    
    // Update in Firebase
    if (isFirebaseConfigured()) {
      try {
        await updateInvoiceInCloud(
          savedInvoice.id,
          data.invoiceNumber,
          data.soldTo.name,
          0, // Will be calculated
          data
        );
      } catch (error) {
        console.error('Firebase update failed, saved locally:', error);
      }
    }
  } else {
    // Create new invoice
    savedInvoice = {
      id: Math.random().toString(36).substr(2, 9),
      data,
      createdAt: now,
      updatedAt: now,
    };
    invoices.push(savedInvoice);
    
    // Save to Firebase
    if (isFirebaseConfigured()) {
      try {
        const firebaseId = await saveInvoiceToCloud(
          data.invoiceNumber,
          data.soldTo.name,
          0, // Will be calculated
          data
        );
        savedInvoice.id = firebaseId; // Use Firebase ID
      } catch (error) {
        console.error('Firebase save failed, saved locally:', error);
      }
    }
  }
  
  // Always save to localStorage as backup
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  
  return savedInvoice;
}

/**
 * Get invoice by ID (synchronous)
 */
export function getInvoiceById(id: string): SavedInvoice | null {
  const invoices = getAllInvoicesSync();
  return invoices.find(inv => inv.id === id) || null;
}

/**
 * Get invoice by invoice number (synchronous)
 */
export function getInvoiceByNumber(invoiceNumber: string): SavedInvoice | null {
  const invoices = getAllInvoicesSync();
  return invoices.find(
    inv => inv.data.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase()
  ) || null;
}

/**
 * Search invoices by multiple criteria (async for Firebase)
 */
export async function searchInvoices(query: string): Promise<SavedInvoice[]> {
  const invoices = await getAllInvoices();
  
  if (!query.trim()) return invoices;
  
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
    
      // Search by rug number (SKU) in items
      if (Array.isArray(data.items) && data.items.some(item => item.sku && item.sku.toLowerCase().includes(searchTerm))) {
        return true;
      }
    
    return false;
  });
}

/**
 * Delete an invoice (from both Firebase and localStorage)
 */
export async function deleteInvoice(id: string): Promise<boolean> {
  const invoices = getAllInvoicesSync();
  const filtered = invoices.filter(inv => inv.id !== id);

  if (filtered.length === invoices.length) {
    return false; // Invoice not found
  }

  // Delete from Firebase
  if (isFirebaseConfigured()) {
    try {
      await deleteInvoiceFromCloud(id);
    } catch (error) {
      console.error('Firebase delete failed, deleted locally:', error);
    }
  }

  // Delete from localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Delete multiple invoices (from both Firebase and localStorage)
 */
export async function deleteMultipleInvoices(ids: string[]): Promise<boolean> {
  const invoices = getAllInvoicesSync();
  const filtered = invoices.filter(inv => !ids.includes(inv.id));

  if (filtered.length === invoices.length) {
    return false; // No invoices found
  }

  // Delete from Firebase
  if (isFirebaseConfigured()) {
    try {
      await deleteMultipleInvoicesFromCloud(ids);
    } catch (error) {
      console.error('Firebase delete failed, deleted locally:', error);
    }
  }

  // Delete from localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Get invoices count (synchronous)
 */
export function getInvoicesCount(): number {
  return getAllInvoicesSync().length;
}

/**
 * Export all invoices as JSON (synchronous)
 */
export function exportInvoices(): string {
  const invoices = getAllInvoicesSync();
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
