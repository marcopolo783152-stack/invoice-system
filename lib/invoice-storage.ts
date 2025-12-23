/**
 * Get all deduplicated customers from invoices
 */
export async function getCustomers(): Promise<any[]> {
  const invoices = await getAllInvoices();
  const customers: Record<string, any> = {};

  invoices.forEach(inv => {
    const docType = inv.data.documentType || inv.documentType;
    if (docType === 'INVOICE' || docType === 'CONSIGNMENT') {
      const soldTo = inv.data.soldTo;
      const key = `${soldTo.name}|${soldTo.phone}`;
      if (!customers[key]) {
        customers[key] = {
          ...soldTo,
          id: key,
          lastInvoiceDate: inv.createdAt
        };
      } else if (new Date(inv.createdAt) > new Date(customers[key].lastInvoiceDate)) {
        customers[key].lastInvoiceDate = inv.createdAt;
      }
    }
  });

  return Object.values(customers).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Export specific customers as CSV
 */
export function exportCustomersCSV(customers: any[]): string {
  let csv = 'Name,Last Name,Address,City,State,Zip Code,Phone Number,Email Address\n';
  customers.forEach(cust => {
    let firstName = cust.name;
    let lastName = '';
    if (cust.name.includes(' ')) {
      const parts = cust.name.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }
    csv += `"${firstName}","${lastName}","${cust.address}","${cust.city}","${cust.state}","${cust.zip}","${cust.phone}","${cust.email || ''}"\n`;
  });
  return csv;
}

/**
 * Export address book as CSV (for Excel)
 * Columns: Name,Last Name,Address,City,State,Zip Code,Phone Number,Email Address
 */
export function exportAddressBook(): string {
  // Keeping this for backward compatibility if needed, but we should use getCustomers + exportCustomersCSV
  let invoices: SavedInvoice[] = getAllInvoicesSync();
  const customers: Record<string, any> = {};
  invoices.forEach(inv => {
    const docType = inv.data.documentType || inv.documentType;
    if (docType === 'INVOICE' || docType === 'CONSIGNMENT') {
      const soldTo = inv.data.soldTo;
      const key = `${soldTo.name}|${soldTo.phone}`;
      if (!customers[key]) {
        let firstName = soldTo.name;
        let lastName = '';
        if (soldTo.name.includes(' ')) {
          const parts = soldTo.name.split(' ');
          firstName = parts[0];
          lastName = parts.slice(1).join(' ');
        }
        customers[key] = {
          firstName,
          lastName,
          address: soldTo.address,
          city: soldTo.city,
          state: soldTo.state,
          zip: soldTo.zip,
          phone: soldTo.phone,
          email: soldTo.email || '',
        };
      }
    }
  });
  let csv = 'Name,Last Name,Address,City,State,Zip Code,Phone Number,Email Address\n';
  Object.values(customers).forEach(cust => {
    csv += `"${cust.firstName}","${cust.lastName}","${cust.address}","${cust.city}","${cust.state}","${cust.zip}","${cust.phone}","${cust.email}"\n`;
  });
  return csv;
}
/**
 * INVOICE STORAGE SYSTEM
 * 
 * Hybrid storage: Firebase (cloud) + localStorage (backup)
 * Automatically syncs across all devices
 */

import { InvoiceData, calculateInvoice } from './calculations';
import {
  saveInvoiceToCloud,
  getInvoicesFromCloud,
  updateInvoiceInCloud,
  deleteInvoiceFromCloud,
  deleteMultipleInvoicesFromCloud
} from './firebase-storage';
import { isFirebaseConfigured } from './firebase';
import { updateInventoryStatusFromInvoice } from './inventory-storage';
import { updateCustomerFromInvoice } from './customer-storage';

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
 * If the customer is Martinez, force invoice number to MP00000002
 */
export async function saveInvoice(data: InvoiceData): Promise<SavedInvoice> {
  const invoices = getAllInvoicesSync();

  // Force invoice number for Martinez
  if (data.soldTo && typeof data.soldTo.name === 'string' && data.soldTo.name.trim().toLowerCase() === 'martinez') {
    data.invoiceNumber = 'MP00000002';
  }

  // Check if invoice already exists (by invoice number)
  const existingIndex = invoices.findIndex(
    inv => inv.data.invoiceNumber === data.invoiceNumber
  );

  const now = new Date().toISOString();
  let savedInvoice: SavedInvoice;

  // If this is a return, set returned/returnNote
  const isReturn = !!data.returned;

  if (existingIndex >= 0) {
    savedInvoice = {
      ...invoices[existingIndex],
      data: {
        ...data,
        returned: isReturn ? true : data.returned,
        returnNote: isReturn ? data.returnNote : data.returnNote,
      },
      updatedAt: now,
    };
    invoices[existingIndex] = savedInvoice;

    if (isFirebaseConfigured() && savedInvoice.id && savedInvoice.id.length >= 20) {
      try {
        await updateInvoiceInCloud(
          savedInvoice.id,
          data.invoiceNumber,
          data.soldTo.name,
          0, // Will be calculated
          savedInvoice.data
        );
      } catch (error) {
        console.error('Firebase update failed, saved locally:', error);
      }
    }
  } else {
    let firebaseId = '';
    if (isFirebaseConfigured()) {
      try {
        firebaseId = await saveInvoiceToCloud(
          data.invoiceNumber,
          data.soldTo.name,
          0, // Will be calculated
          data
        );
      } catch (error) {
        console.error('Firebase save failed, saved locally:', error);
      }
    }
    savedInvoice = {
      id: firebaseId || Math.random().toString(36).substr(2, 9),
      data: {
        ...data,
        returned: isReturn ? true : data.returned,
        returnNote: isReturn ? data.returnNote : data.returnNote,
      },
      createdAt: now,
      updatedAt: now,
    };
    invoices.push(savedInvoice);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));

  // Trigger inventory status update (fire and forget)
  // We don't await this to keep the UI snappy, but errors are logged
  updateInventoryStatusFromInvoice(savedInvoice.data).catch(err =>
    console.error('Error auto-updating inventory status:', err)
  );

  // Trigger customer DB update (fire and forget)
  updateCustomerFromInvoice(savedInvoice.data.soldTo).catch(err =>
    console.error('Error auto-updating customer DB:', err)
  );

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
 * Get invoice by ID (asynchronous, checks cloud + local)
 */
export async function getInvoiceByIdAsync(id: string): Promise<SavedInvoice | null> {
  // First try local
  const local = getInvoiceById(id);
  if (local) return local;

  // Then try fetching all (which checks cloud)
  // Optimization: In a real app we'd fetch just one, but here we reuse existing logic
  const all = await getAllInvoices();
  return all.find(inv => inv.id === id) || null;
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
  const idx = invoices.findIndex(inv => inv.id === id);
  if (idx === -1) return false;
  const [deletedInvoice] = invoices.splice(idx, 1);

  // Move to bin (deleted_invoices)
  let bin: SavedInvoice[] = [];
  try {
    bin = JSON.parse(localStorage.getItem('deleted_invoices') || '[]');
  } catch { }
  bin.push(deletedInvoice);
  localStorage.setItem('deleted_invoices', JSON.stringify(bin));

  // Delete from Firebase
  if (isFirebaseConfigured()) {
    try {
      await deleteInvoiceFromCloud(id);
    } catch (error) {
      console.error('Firebase delete failed, deleted locally:', error);
    }
  }

  // Update localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  return true;
}

// Move the following functions out of deleteInvoice

/**
 * Restore an invoice from the bin (deleted_invoices)
 */
export function restoreInvoiceFromBin(id: string): boolean {
  let bin: SavedInvoice[] = [];
  try {
    bin = JSON.parse(localStorage.getItem('deleted_invoices') || '[]');
  } catch { }
  const idx = bin.findIndex(inv => inv.id === id);
  if (idx === -1) return false;
  const [restored] = bin.splice(idx, 1);
  // Add back to invoices
  const invoices = getAllInvoicesSync();
  invoices.push(restored);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  localStorage.setItem('deleted_invoices', JSON.stringify(bin));
  return true;
}

/**
 * Get all deleted invoices in the bin
 */
export function getDeletedInvoices(): SavedInvoice[] {
  try {
    return JSON.parse(localStorage.getItem('deleted_invoices') || '[]');
  } catch {
    return [];
  }
}

/**
 * Restore multiple invoices from the bin
 */
export async function restoreMultipleInvoices(ids: string[]): Promise<boolean> {
  let bin: SavedInvoice[] = [];
  try {
    bin = JSON.parse(localStorage.getItem('deleted_invoices') || '[]');
  } catch { }

  const toRestore = bin.filter(inv => ids.includes(inv.id));
  const remainingBin = bin.filter(inv => !ids.includes(inv.id));

  if (toRestore.length === 0) return false;

  // Add back to active invoices
  const invoices = getAllInvoicesSync();
  const currentIds = invoices.map(i => i.id);

  // Clean potential collisions
  const cleanRestore = toRestore.filter(i => !currentIds.includes(i.id));
  invoices.push(...cleanRestore);

  // Re-upload to cloud if configured
  if (isFirebaseConfigured()) {
    for (const inv of cleanRestore) {
      try {
        await saveInvoiceToCloud(
          inv.data.invoiceNumber,
          inv.data.soldTo?.name || 'Unknown',
          0,
          inv.data
        );
      } catch (e) {
        console.error('Failed to restore to cloud', e);
      }
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  localStorage.setItem('deleted_invoices', JSON.stringify(remainingBin));
  return true;
}

/**
 * Permanently delete multiple invoices from the bin
 */
export function permanentlyDeleteInvoices(ids: string[]): boolean {
  let bin: SavedInvoice[] = [];
  try {
    bin = JSON.parse(localStorage.getItem('deleted_invoices') || '[]');
  } catch { }

  const remainingBin = bin.filter(inv => !ids.includes(inv.id));

  localStorage.setItem('deleted_invoices', JSON.stringify(remainingBin));
  return true;
}

/**
 * Delete multiple invoices (from both Firebase and localStorage)
 */
export async function deleteMultipleInvoices(ids: string[]): Promise<boolean> {
  const invoices = getAllInvoicesSync();
  const toDelete = invoices.filter(inv => ids.includes(inv.id));
  const remaining = invoices.filter(inv => !ids.includes(inv.id));

  if (toDelete.length === 0) {
    return false;
  }

  // Move to bin
  let bin: SavedInvoice[] = [];
  try {
    bin = JSON.parse(localStorage.getItem('deleted_invoices') || '[]');
  } catch { }
  bin.push(...toDelete);
  localStorage.setItem('deleted_invoices', JSON.stringify(bin));

  // Delete from Firebase
  if (isFirebaseConfigured()) {
    try {
      await deleteMultipleInvoicesFromCloud(ids);
    } catch (error) {
      console.error('Firebase delete failed, deleted locally:', error);
    }
  }

  // Update localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
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

/**
 * Get customer debt statistics
 * Returns total outstanding debt and number of overdue invoices (> 30 days)
 */
export async function getCustomerDebt(customerName: string): Promise<{ totalDebt: number; overdueCount: number }> {
  if (!customerName) return { totalDebt: 0, overdueCount: 0 };

  // We need to await here because getAllInvoices guarantees we have the latest from cloud
  const invoices = await getAllInvoices();
  const now = new Date();
  // 30 days ago
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

  const outstanding = invoices.filter(inv => {
    const d = inv.data;
    if (d.soldTo.name.trim().toLowerCase() !== customerName.trim().toLowerCase()) return false;

    // Exclude Consignments/Wash for debt calculation unless specified
    // But user asked for "Net 30" -> implies standard invoices
    if ((d.documentType || 'INVOICE') !== 'INVOICE') return false;

    // Exclude Paid
    const terms = (d.terms || '').toLowerCase();
    if (terms.includes('paid')) return false;

    return true;
  });

  let totalDebt = 0;
  let overdueCount = 0;

  outstanding.forEach(inv => {
    const calcs = calculateInvoice(inv.data);
    totalDebt += calcs.netTotalDue; // Use Net Total (after returns)

    // Check Overdue
    // If invoice date is older than 30 days
    const invDate = new Date(inv.createdAt);
    if (invDate < thirtyDaysAgo) {
      overdueCount++;
    }
  });

  return { totalDebt, overdueCount };
}
