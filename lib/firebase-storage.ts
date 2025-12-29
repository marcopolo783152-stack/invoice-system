/**
 * FIREBASE STORAGE SERVICE
 * 
 * Cloud-based invoice storage that syncs across all devices
 */

import {
  orderBy,
  Timestamp,
  runTransaction,
  doc,
  onSnapshot,
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  query,
  updateDoc,
  limit
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { InvoiceData } from './calculations';

export interface SavedInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  totalAmount: number;
  data: InvoiceData;
  createdAt: Date;
}

const COLLECTION_NAME = 'invoices';
const DELETED_COLLECTION_NAME = 'deletedInvoices';

/**
 * Save invoice to Firebase
 */
export async function saveInvoiceToCloud(
  invoiceNumber: string,
  customerName: string,
  totalAmount: number,
  data: InvoiceData
): Promise<string> {
  if (!isFirebaseConfigured() || !db) {
    throw new Error('Firebase not configured. Please set up your Firebase project.');
  }

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      invoiceNumber,
      customerName,
      date: data.date,
      totalAmount,
      data,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving invoice to cloud:', error);
    throw error;
  }
}

/**
 * Get next invoice number atomically
 */
export async function getNextInvoiceNumber(): Promise<string> {
  if (!isFirebaseConfigured() || !db) {
    throw new Error('Firebase not configured can not generate global invoice number.');
  }

  try {
    // Query the most recent invoices by invoiceNumber (lexical sort works for fixed format)
    // Actually, sorting by invoiceNumber string desc is safer to find the max number than createdAt
    const q = query(collection(db, COLLECTION_NAME), orderBy('invoiceNumber', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);

    let maxNumber = 0;

    if (!querySnapshot.empty) {
      const lastInvoice = querySnapshot.docs[0].data();
      const lastInvoiceNumber = lastInvoice.invoiceNumber; // e.g., "MP00000011"

      // Parse the numeric part
      const match = lastInvoiceNumber.match(/^MP(\d+)$/);
      if (match && match[1]) {
        maxNumber = parseInt(match[1], 10);
      }
    }

    const next = maxNumber + 1;
    // Format: MP########
    return `MP${next.toString().padStart(8, '0')}`;
  } catch (error) {
    console.error('Failed to generate next invoice number from cloud:', error);
    throw error;
  }
}

/**
 * Get all invoices from Firebase
 */
export async function getInvoicesFromCloud(): Promise<SavedInvoice[]> {
  if (!isFirebaseConfigured() || !db) {
    return [];
  }

  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const invoices: SavedInvoice[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      invoices.push({
        id: doc.id,
        invoiceNumber: data.invoiceNumber,
        customerName: data.customerName,
        date: data.date,
        totalAmount: data.totalAmount,
        data: data.data,
        createdAt: data.createdAt.toDate()
      });
    });

    return invoices;
  } catch (error) {
    console.error('Error getting invoices from cloud:', error);
    return [];
  }
}

/**
 * Update invoice in Firebase
 */
export async function updateInvoiceInCloud(
  id: string,
  invoiceNumber: string,
  customerName: string,
  totalAmount: number,
  data: InvoiceData
): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    throw new Error('Firebase not configured.');
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      invoiceNumber,
      customerName,
      date: data.date,
      totalAmount,
      data
    });
  } catch (error) {
    console.error('Error updating invoice in cloud:', error);
    throw error;
  }
}

/**
 * Delete invoice from Firebase
 */
export async function deleteInvoiceFromCloud(id: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    throw new Error('Firebase not configured.');
  }

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error('Error deleting invoice from cloud:', error);
    throw error;
  }
}

/**
 * Delete multiple invoices from Firebase
 */
export async function deleteMultipleInvoicesFromCloud(ids: string[]): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    throw new Error('Firebase not configured.');
  }

  try {
    const deletePromises = ids.map(id => deleteDoc(doc(db!, COLLECTION_NAME, id)));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting multiple invoices from cloud:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time invoice updates
 */
export function subscribeToInvoices(callback: (invoices: SavedInvoice[]) => void): () => void {
  if (!isFirebaseConfigured() || !db) {
    console.warn('Firebase not configured, real-time updates disabled');
    return () => { };
  }

  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const invoices: SavedInvoice[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      invoices.push({
        id: doc.id,
        invoiceNumber: data.invoiceNumber,
        customerName: data.customerName,
        date: data.date,
        totalAmount: data.totalAmount,
        data: data.data,
        createdAt: data.createdAt.toDate()
      });
    });
    callback(invoices);
  }, (error) => {
    console.error('Error in invoice subscription:', error);
  });
}

/**
 * Move invoice to Cloud Recycle Bin
 */
export async function moveToCloudBin(id: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase not configured');

  try {
    await runTransaction(db, async (transaction) => {
      const sourceRef = doc(db!, COLLECTION_NAME, id);
      const sourceSnap = await transaction.get(sourceRef);

      if (!sourceSnap.exists()) throw new Error('Invoice not found');

      const targetRef = doc(collection(db!, DELETED_COLLECTION_NAME));
      transaction.set(targetRef, {
        ...sourceSnap.data(),
        deletedAt: Timestamp.now(),
        originalId: id
      });
      transaction.delete(sourceRef);
    });
  } catch (error) {
    console.error('Error moving to cloud bin:', error);
    throw error;
  }
}

/**
 * Restore invoice from Cloud Recycle Bin
 */
export async function restoreFromCloudBin(cloudBinId: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase not configured');

  try {
    await runTransaction(db, async (transaction) => {
      const sourceRef = doc(db!, DELETED_COLLECTION_NAME, cloudBinId);
      const sourceSnap = await transaction.get(sourceRef);

      if (!sourceSnap.exists()) throw new Error('Deleted invoice not found');

      const data = sourceSnap.data();
      const originalId = data.originalId;

      // We use originalId to maintain history if possible, or just generate new
      const targetRef = originalId ? doc(db!, COLLECTION_NAME, originalId) : doc(collection(db!, COLLECTION_NAME));

      const cleanData = { ...data };
      delete cleanData.deletedAt;
      delete cleanData.originalId;

      transaction.set(targetRef, {
        ...cleanData,
        updatedAt: Timestamp.now()
      });
      transaction.delete(sourceRef);
    });
  } catch (error) {
    console.error('Error restoring from cloud bin:', error);
    throw error;
  }
}

/**
 * Fetch all invoices from Cloud Recycle Bin
 */
export async function getBinInvoicesFromCloud(): Promise<SavedInvoice[]> {
  if (!isFirebaseConfigured() || !db) return [];

  try {
    const q = query(collection(db, DELETED_COLLECTION_NAME), orderBy('deletedAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const invoices: SavedInvoice[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      invoices.push({
        id: doc.id,
        invoiceNumber: data.invoiceNumber,
        customerName: data.customerName,
        date: data.date,
        totalAmount: data.totalAmount,
        data: data.data,
        createdAt: data.createdAt.toDate()
      });
    });

    return invoices;
  } catch (error) {
    console.error('Error getting bin invoices from cloud:', error);
    return [];
  }
}

/**
 * Permanently delete from Cloud Recycle Bin
 */
export async function permanentlyDeleteFromCloudBin(ids: string[]): Promise<void> {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase not configured');

  try {
    const deletePromises = ids.map(id => deleteDoc(doc(db!, DELETED_COLLECTION_NAME, id)));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error permanently deleting from cloud bin:', error);
    throw error;
  }
}
