import { getStorePrefix } from './user-storage';
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
  getDoc,
  getDocs,
  query,
  updateDoc,
  limit
} from 'firebase/firestore';
import { db, isFirebaseConfigured, checkFirebaseQuotaError } from './firebase';
import { InvoiceData } from './calculations';

export interface SavedInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  totalAmount: number;
  data: InvoiceData;
  createdAt: Date;
  updatedAt: Date;
}

const getCollectionName = () => getStorePrefix() + 'invoices';
const getDeletedCollectionName = () => getStorePrefix() + 'deletedInvoices';

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
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, getCollectionName()), {
      invoiceNumber,
      customerName,
      date: data.date,
      totalAmount,
      data,
      createdAt: now,
      updatedAt: now
    });
    return docRef.id;
  } catch (error) {
    checkFirebaseQuotaError(error);
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
    const q = query(collection(db, getCollectionName()), orderBy('invoiceNumber', 'desc'), limit(1));
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
    checkFirebaseQuotaError(error);
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
    const q = query(collection(db, getCollectionName()), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const invoices: SavedInvoice[] = [];
    querySnapshot.forEach((doc) => {
      try {
        const data = doc.data();
        let createdAt = new Date();
        let updatedAt = new Date();

        try {
          createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt?.seconds ? data.createdAt.seconds * 1000 : (data.createdAt || Date.now()));
          if (isNaN(createdAt.getTime())) createdAt = new Date();
        } catch (e) { }

        try {
          const ud = data.updatedAt || data.createdAt;
          updatedAt = ud?.toDate ? ud.toDate() : new Date(ud?.seconds ? ud.seconds * 1000 : (ud || Date.now()));
          if (isNaN(updatedAt.getTime())) updatedAt = createdAt;
        } catch (e) { updatedAt = createdAt; }

        invoices.push({
          id: doc.id,
          invoiceNumber: data.invoiceNumber || 'UNKNOWN',
          customerName: data.customerName || 'Unknown',
          date: data.date || '',
          totalAmount: data.totalAmount || 0,
          data: data.data || {} as InvoiceData,
          createdAt,
          updatedAt
        });
      } catch (e) {
        console.warn('Skipping corrupted invoice doc:', doc.id);
      }
    });

    return invoices;
  } catch (error) {
    checkFirebaseQuotaError(error);
    console.error('Error getting invoices from cloud:', error);
    return [];
  }
}

/**
 * Get a specific invoice from Firebase by ID
 */
export async function getInvoiceByIdFromCloud(id: string): Promise<SavedInvoice | null> {
  if (!isFirebaseConfigured() || !db) {
    return null;
  }

  try {
    const docRef = doc(db, getCollectionName(), id);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return null;
    }

    const data = snap.data();
    let createdAt = new Date();
    let updatedAt = new Date();

    try {
      createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt?.seconds ? data.createdAt.seconds * 1000 : (data.createdAt || Date.now()));
      if (isNaN(createdAt.getTime())) createdAt = new Date();
    } catch (e) { }

    try {
      const ud = data.updatedAt || data.createdAt;
      updatedAt = ud?.toDate ? ud.toDate() : new Date(ud?.seconds ? ud.seconds * 1000 : (ud || Date.now()));
      if (isNaN(updatedAt.getTime())) updatedAt = createdAt;
    } catch (e) { updatedAt = createdAt; }

    return {
      id: snap.id,
      invoiceNumber: data.invoiceNumber || 'UNKNOWN',
      customerName: data.customerName || 'Unknown',
      date: data.date || '',
      totalAmount: data.totalAmount || 0,
      data: data.data || {} as InvoiceData,
      createdAt,
      updatedAt
    };
  } catch (error) {
    checkFirebaseQuotaError(error);
    console.error('Error getting invoice by ID from cloud:', error);
    return null;
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
    const docRef = doc(db, getCollectionName(), id);
    await updateDoc(docRef, {
      invoiceNumber,
      customerName,
      date: data.date,
      totalAmount,
      data,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    checkFirebaseQuotaError(error);
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
    await deleteDoc(doc(db, getCollectionName(), id));
  } catch (error) {
    checkFirebaseQuotaError(error);
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
    const deletePromises = ids.map(id => deleteDoc(doc(db!, getCollectionName(), id)));
    await Promise.all(deletePromises);
  } catch (error) {
    checkFirebaseQuotaError(error);
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

  const q = query(collection(db, getCollectionName()), orderBy('createdAt', 'desc'));

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
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt?.seconds ? data.createdAt.seconds * 1000 : (data.createdAt || Date.now())),
        updatedAt: (data.updatedAt || data.createdAt)?.toDate ? (data.updatedAt || data.createdAt).toDate() : new Date((data.updatedAt || data.createdAt)?.seconds ? (data.updatedAt || data.createdAt).seconds * 1000 : (data.updatedAt || data.createdAt || Date.now()))
      });
    });
    callback(invoices);
  }, (error) => {
    checkFirebaseQuotaError(error);
    console.error('Error in invoice subscription:', error);
  });
}

/**
 * Move invoice to Cloud Recycle Bin
 */
/**
 * Move invoice to Cloud Recycle Bin
 * Uses Batch Write for offline support (Transactions fail offline)
 */
export async function moveToCloudBin(id: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase not configured');

  try {
    const sourceRef = doc(db!, getCollectionName(), id);
    const sourceSnap = await getDocs(query(collection(db!, getCollectionName()), limit(1))); // Just a check? No, get exact doc
    // Note: getDoc is not imported, let's use getDocs with query or add getDoc to imports? 
    // Wait, getDocs(query(...)) is more complex. Let's just assume we can't easily read-then-write atomically offline.
    // Instead: Read first (if online/cached), then Batch (Create Bin Item, Delete Source).

    // We need to fetch data first. 'getDocs' works with cache.
    // But 'doc' + 'getDoc' is better.
    // Let's use the pattern: 
    // 1. Get Data (supports offline cache)
    // 2. Write to Bin (offline queue)
    // 3. Delete Source (offline queue)

    // We need 'getDoc'
    const { getDoc, writeBatch } = await import('firebase/firestore');

    const snap = await getDoc(sourceRef);
    if (!snap.exists()) throw new Error('Invoice not found');

    const batch = writeBatch(db!);
    const targetRef = doc(collection(db!, getDeletedCollectionName()));

    batch.set(targetRef, {
      ...snap.data(),
      deletedAt: Timestamp.now(),
      originalId: id
    });

    batch.delete(sourceRef);

    await batch.commit();

  } catch (error) {
    checkFirebaseQuotaError(error);
    console.error('Error moving to cloud bin:', error);
    throw error;
  }
}

/**
 * Restore invoice from Cloud Recycle Bin
 * Uses Batch Write for offline support
 */
export async function restoreFromCloudBin(cloudBinId: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase not configured');

  try {
    const { getDoc, writeBatch } = await import('firebase/firestore');

    const sourceRef = doc(db!, getDeletedCollectionName(), cloudBinId);
    const snap = await getDoc(sourceRef);

    if (!snap.exists()) throw new Error('Deleted invoice not found');

    const data = snap.data();
    const originalId = data.originalId;

    const targetRef = originalId ? doc(db!, getCollectionName(), originalId) : doc(collection(db!, getCollectionName()));

    const cleanData = { ...data };
    delete cleanData.deletedAt;
    delete cleanData.originalId;

    const batch = writeBatch(db!);

    batch.set(targetRef, {
      ...cleanData,
      updatedAt: Timestamp.now()
    });

    batch.delete(sourceRef);

    await batch.commit();

  } catch (error) {
    checkFirebaseQuotaError(error);
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
    const q = query(collection(db, getDeletedCollectionName()), orderBy('deletedAt', 'desc'));
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
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt?.seconds ? data.createdAt.seconds * 1000 : (data.createdAt || Date.now())),
        updatedAt: (data.updatedAt || data.createdAt)?.toDate ? (data.updatedAt || data.createdAt).toDate() : new Date((data.updatedAt || data.createdAt)?.seconds ? (data.updatedAt || data.createdAt).seconds * 1000 : (data.updatedAt || data.createdAt || Date.now()))
      });
    });

    return invoices;
  } catch (error) {
    checkFirebaseQuotaError(error);
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
    const deletePromises = ids.map(id => deleteDoc(doc(db!, getDeletedCollectionName(), id)));
    await Promise.all(deletePromises);
  } catch (error) {
    checkFirebaseQuotaError(error);
    console.error('Error permanently deleting from cloud bin:', error);
    throw error;
  }
}

/**
 * USER MANAGEMENT (Cloud Sync)
 */

const USERS_COLLECTION = 'users';

export async function saveUserToCloud(user: any): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;

  try {
    // We use username (email) as the Doc ID for uniqueness and easy updates
    const docRef = doc(db, USERS_COLLECTION, user.username);
    await import('firebase/firestore').then(({ setDoc }) =>
      setDoc(docRef, { ...user, updatedAt: Timestamp.now() })
    );
  } catch (error) {
    checkFirebaseQuotaError(error);
    console.error('Error saving user to cloud:', error);
    throw error;
  }
}

export async function getUsersFromCloud(): Promise<any[]> {
  if (!isFirebaseConfigured() || !db) return [];

  try {
    const q = query(collection(db, USERS_COLLECTION));
    const querySnapshot = await getDocs(q);
    const users: any[] = [];
    querySnapshot.forEach((doc) => users.push(doc.data()));
    return users;
  } catch (error) {
    checkFirebaseQuotaError(error);
    console.error('Error getting users from cloud:', error);
    return [];
  }
}

export async function deleteUserFromCloud(username: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;

  try {
    await deleteDoc(doc(db, USERS_COLLECTION, username));
  } catch (error) {
    checkFirebaseQuotaError(error);
    console.error('Error deleting user from cloud:', error);
    throw error;
  }
}

/**
 * SIGNATURE TOKEN MANAGEMENT
 */

const TOKENS_COLLECTION = 'signatureTokens';

/**
 * Create a one-time signature token for an invoice
 */
export async function createSignatureToken(invoiceId: string): Promise<string> {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase not configured');

  try {
    const docRef = await addDoc(collection(db, TOKENS_COLLECTION), {
      invoiceId,
      createdAt: Timestamp.now(),
      used: false,
      expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating signature token:', error);
    throw error;
  }
}

/**
 * Validate and retrieve info for a signature token
 */
export async function validateSignatureToken(tokenId: string): Promise<{ invoiceId: string } | null> {
  if (!isFirebaseConfigured() || !db) return null;

  try {
    const { getDoc } = await import('firebase/firestore');
    const docRef = doc(db, TOKENS_COLLECTION, tokenId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return null;

    const data = snap.data();
    if (data.used) return null;

    // Check expiry
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
      return null;
    }

    return { invoiceId: data.invoiceId };
  } catch (error) {
    console.error('Error validating token:', error);
    return null;
  }
}

/**
 * Mark a signature token as used
 */
export async function useSignatureToken(tokenId: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;

  try {
    const docRef = doc(db, TOKENS_COLLECTION, tokenId);
    await updateDoc(docRef, {
      used: true,
      usedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error marking token as used:', error);
  }
}
