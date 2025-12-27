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
  updateDoc
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

  const counterRef = doc(db, 'counters', 'invoices');

  try {
    const newNumber = await runTransaction(db, async (transaction) => {
      const sfDoc = await transaction.get(counterRef);

      let currentNumber = 0;
      if (sfDoc.exists()) {
        currentNumber = sfDoc.data().current;
      }

      const next = currentNumber + 1;
      transaction.set(counterRef, { current: next });
      return next;
    });

    // Format: MP########
    return `MP${newNumber.toString().padStart(8, '0')}`;
  } catch (error) {
    console.error('Transaction failed: ', error);
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
