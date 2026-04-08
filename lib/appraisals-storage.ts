import { getStorePrefix } from './user-storage';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { updateCustomerFromInvoice } from './customer-storage';

export interface Appraisal {
    id: string;
    date: string;
    customerName: string;
    customerAddress: string;
    rugNumber: string;
    type: string;
    size: string;
    composition: string;
    origin: string;
    condition: string;
    value: number;
    rugImage?: string; // Base64 representation of the rug photo
    createdAt: string;
    updatedAt?: string;
}

const getCollectionName = () => 'appraisals'; // Reverted to root collection to prevent data loss across stores
const LOCAL_KEY = 'mns_appraisals_local';

/**
 * Helper to sanitize data for Firestore (remove undefined)
 */
const sanitizeForFirestore = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
      const val = sanitizeForFirestore(obj[key]);
      if (val !== undefined) newObj[key] = val;
    });
    return newObj;
  }
  return obj;
};

export async function saveAppraisal(appraisal: Appraisal): Promise<string> {
    const id = appraisal.id || `APP-${Date.now()}`;
    const data = { ...appraisal, id, updatedAt: new Date().toISOString() };

    if (isFirebaseConfigured() && db) {
        try {
            const safeData = sanitizeForFirestore(data);
            await setDoc(doc(db, getCollectionName(), id), safeData);
        } catch (e: any) {
            console.error('Error saving appraisal to cloud Firestore:', e);
            if (typeof window !== 'undefined') {
                alert(`Failed to sync to server (Saved to local device only): ${e.message}`);
            }
            // DO NOT THROW HERE: We must proceed to save to Local Storage as a fallback!
        }
    }

    if (typeof window !== 'undefined') {
        const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
        const idx = local.findIndex((a: Appraisal) => a.id === id);
        if (idx >= 0) local[idx] = data;
        else local.push(data);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(local));

        // Update customer database
        updateCustomerFromInvoice({
            name: appraisal.customerName,
            address: appraisal.customerAddress.split(' ').slice(0, -3).join(' '), // Rough extraction
            city: appraisal.customerAddress.split(' ').slice(-3, -2)[0] || '',
            state: appraisal.customerAddress.split(' ').slice(-2, -1)[0] || '',
            zip: appraisal.customerAddress.split(' ').slice(-1)[0] || '',
            phone: '' // Appraisals don't have phone in the current schema
        }).catch(err => console.error('Error updating customer from appraisal:', err));

        // Dispatch event for UI updates (immediate detection)
        window.dispatchEvent(new Event('backup-trigger'));
    }

    return id;
}

export async function getAppraisals(): Promise<Appraisal[]> {
    if (isFirebaseConfigured() && db) {
        try {
            const snapshot = await getDocs(query(collection(db, getCollectionName()), orderBy('date', 'desc')));
            const cloudData = snapshot.docs.map(doc => doc.data() as Appraisal);
            
            // Merge local and cloud so we don't accidentally erase unsynced local appraisals
            if (typeof window !== 'undefined') {
                const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
                const cloudMap = new Map(cloudData.map(a => [a.id, a]));
                for (const l of local) {
                    if (!cloudMap.has(l.id)) {
                        cloudData.push(l); // Keep orphaned local appraisals visible
                    }
                }
                cloudData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                localStorage.setItem(LOCAL_KEY, JSON.stringify(cloudData));
            }
            return cloudData;
        } catch (e: any) {
            console.error('Error fetching appraisals from cloud:', e);
            if (typeof window !== 'undefined' && e.message?.includes('Missing or insufficient permissions')) {
                alert("CRITICAL ALARM: Your Firebase Rules are blocking access to Appraisals. Please update your Firestore Rules.");
            }
        }
    }

    if (typeof window !== 'undefined') {
        const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
        return local.sort((a: Appraisal, b: Appraisal) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return [];
}

export async function getAppraisalById(id: string): Promise<Appraisal | null> {
    if (isFirebaseConfigured() && db) {
        try {
            const snapshot = await getDoc(doc(db, getCollectionName(), id));
            if (snapshot.exists()) return snapshot.data() as Appraisal;
        } catch (e) {
            console.error('Error fetching appraisal by ID:', e);
        }
    }

    if (typeof window !== 'undefined') {
        const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
        return local.find((a: Appraisal) => a.id === id) || null;
    }
    return null;
}

export async function deleteAppraisal(id: string): Promise<void> {
    if (isFirebaseConfigured() && db) {
        try {
            await deleteDoc(doc(db, getCollectionName(), id));
        } catch (e) {
            console.error('Error deleting appraisal from cloud:', e);
        }
    }

    if (typeof window !== 'undefined') {
        let local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
        local = local.filter((a: Appraisal) => a.id !== id);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
        // Dispatch event for UI updates (immediate detection)
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('backup-trigger'));
        }
    }
}
