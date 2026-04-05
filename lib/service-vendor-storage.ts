import { getStorePrefix } from './user-storage';
/**
 * SERVICE VENDOR STORAGE SERVICE
 * 
 * Manages external companies for rug washing and repair.
 */

import { db, isFirebaseConfigured } from './firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy,
    Timestamp
} from 'firebase/firestore';

export interface ServiceVendor {
    id: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    serviceType: 'Wash' | 'Repair' | 'Both';
    notes: string;
    createdAt: string;
    updatedAt: string;
}

const STORAGE_KEY = 'service_vendors';
const getCollectionName = () => getStorePrefix() + 'service_vendors';

function generateId(): string {
    return 'vend_' + Math.random().toString(36).substr(2, 9);
}

export async function getServiceVendors(): Promise<ServiceVendor[]> {
    if (typeof window === 'undefined') return [];

    if (isFirebaseConfigured() && db) {
        try {
            const q = query(collection(db, getCollectionName()), orderBy('name', 'asc'));
            const snapshot = await getDocs(q);
            const vendors: ServiceVendor[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                vendors.push({
                    id: doc.id,
                    name: data.name || '',
                    contactPerson: data.contactPerson || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    address: data.address || '',
                    serviceType: data.serviceType || 'Both',
                    notes: data.notes || '',
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString()),
                    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || (data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString())
                });
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(vendors));
            return vendors;
        } catch (error) {
            console.error('Error fetching vendors from cloud:', error);
        }
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
        return JSON.parse(stored);
    } catch (e) {
        return [];
    }
}

export async function saveServiceVendor(vendor: Partial<ServiceVendor>): Promise<ServiceVendor> {
    const now = new Date();
    const vendorData = {
        name: vendor.name || '',
        contactPerson: vendor.contactPerson || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        address: vendor.address || '',
        serviceType: vendor.serviceType || 'Both',
        notes: vendor.notes || '',
        updatedAt: now.toISOString(),
    };

    if (isFirebaseConfigured() && db) {
        try {
            const finalData = { ...vendorData, updatedAt: Timestamp.now() };
            if (vendor.id && !vendor.id.startsWith('vend_')) {
                const docRef = doc(db, getCollectionName(), vendor.id);
                await updateDoc(docRef, finalData);
                return { ...vendorData, id: vendor.id, createdAt: vendor.createdAt || now.toISOString() } as ServiceVendor;
            } else {
                const docRef = await addDoc(collection(db, getCollectionName()), { ...finalData, createdAt: Timestamp.now() });
                return { ...vendorData, id: docRef.id, createdAt: now.toISOString() } as ServiceVendor;
            }
        } catch (error) {
            console.error('Error saving vendor to cloud:', error);
        }
    }

    const vendors = await getServiceVendors();
    let newVendor: ServiceVendor;
    if (vendor.id) {
        const idx = vendors.findIndex(v => v.id === vendor.id);
        if (idx >= 0) {
            newVendor = { ...vendors[idx], ...vendorData };
            vendors[idx] = newVendor;
        } else {
            newVendor = { ...vendorData, id: generateId(), createdAt: now.toISOString() } as ServiceVendor;
            vendors.push(newVendor);
        }
    } else {
        newVendor = { ...vendorData, id: generateId(), createdAt: now.toISOString() } as ServiceVendor;
        vendors.push(newVendor);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vendors));
    return newVendor;
}

export async function deleteServiceVendor(id: string): Promise<void> {
    const vendors = await getServiceVendors();
    const filtered = vendors.filter(v => v.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    if (isFirebaseConfigured() && db) {
        try {
            await deleteDoc(doc(db, getCollectionName(), id));
        } catch (e) {
            console.error('Error deleting vendor from cloud:', e);
        }
    }
}
