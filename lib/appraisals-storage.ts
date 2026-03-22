import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

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
}

const COLLECTION_NAME = 'appraisals';
const LOCAL_KEY = 'mns_appraisals_local';

export async function saveAppraisal(appraisal: Appraisal): Promise<string> {
    const id = appraisal.id || `APP-${Date.now()}`;
    const data = { ...appraisal, id };

    if (isFirebaseConfigured() && db) {
        try {
            await setDoc(doc(db, COLLECTION_NAME, id), data);
        } catch (e) {
            console.error('Error saving appraisal to cloud:', e);
        }
    }

    if (typeof window !== 'undefined') {
        const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
        const idx = local.findIndex((a: Appraisal) => a.id === id);
        if (idx >= 0) local[idx] = data;
        else local.push(data);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
    }

    return id;
}

export async function getAppraisals(): Promise<Appraisal[]> {
    if (isFirebaseConfigured() && db) {
        try {
            const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), orderBy('date', 'desc')));
            const cloudData = snapshot.docs.map(doc => doc.data() as Appraisal);
            // Optionally cache to local
            if (typeof window !== 'undefined') {
                localStorage.setItem(LOCAL_KEY, JSON.stringify(cloudData));
            }
            return cloudData;
        } catch (e) {
            console.error('Error fetching appraisals from cloud:', e);
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
            const snapshot = await getDoc(doc(db, COLLECTION_NAME, id));
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
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (e) {
            console.error('Error deleting appraisal from cloud:', e);
        }
    }

    if (typeof window !== 'undefined') {
        let local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
        local = local.filter((a: Appraisal) => a.id !== id);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
    }
}
