/**
 * INVENTORY STORAGE SERVICE
 * 
 * Manages the "Digital Pick List" of rugs.
 * Syncs between localStorage and Firebase.
 */

import { RugShape, InvoiceData } from './calculations';
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
    Timestamp,
    where
} from 'firebase/firestore';

export interface InventoryItem {
    id: string; // Firebase ID or local UUID
    sku: string;
    description: string;
    shape: RugShape;
    widthFeet: number;
    widthInches: number;
    lengthFeet: number;
    lengthInches: number;
    price: number;
    status: 'AVAILABLE' | 'SOLD' | 'ON_APPROVAL';
    image?: string; // Base64
    createdAt: string;
    updatedAt: string;
}

const STORAGE_KEY = 'inventory_items';
const COLLECTION_NAME = 'inventory';

/**
 * Generate a local ID if not using Firebase (or for temp local storage)
 */
function generateId(): string {
    return 'inv_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Get all inventory items (Hybrid: Cloud > Local)
 */
export async function getInventoryItems(): Promise<InventoryItem[]> {
    if (typeof window === 'undefined') return [];

    // Try Firebase first
    if (isFirebaseConfigured() && db) {
        try {
            const q = query(collection(db, COLLECTION_NAME), orderBy('sku', 'asc'));
            const snapshot = await getDocs(q);
            const items: InventoryItem[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                items.push({
                    id: doc.id,
                    sku: data.sku,
                    description: data.description,
                    shape: data.shape,
                    widthFeet: data.widthFeet,
                    widthInches: data.widthInches,
                    lengthFeet: data.lengthFeet,
                    lengthInches: data.lengthInches,
                    price: data.price,
                    status: data.status,
                    image: data.image,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
                });
            });

            // Update local cache
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            return items;
        } catch (error) {
            console.error('Error fetching inventory from cloud:', error);
            // Fallback to local
        }
    }

    // Local Storage Fallback
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
        return JSON.parse(stored);
    } catch (e) {
        console.error('Error parsing local inventory:', e);
        return [];
    }
}

/**
 * Get item by SKU
 */
export async function getItemBySku(sku: string): Promise<InventoryItem | null> {
    const items = await getInventoryItems(); // This uses the cache/fetch logic
    return items.find(i => i.sku.toLowerCase() === sku.toLowerCase()) || null;
}

/**
 * Save inventory item (Create or Update)
 */
export async function saveInventoryItem(item: Partial<InventoryItem>): Promise<InventoryItem> {
    const now = new Date();

    // Prepare data object
    const itemData = {
        sku: item.sku || '',
        description: item.description || '',
        shape: item.shape || 'rectangle',
        widthFeet: Number(item.widthFeet) || 0,
        widthInches: Number(item.widthInches) || 0,
        lengthFeet: Number(item.lengthFeet) || 0,
        lengthInches: Number(item.lengthInches) || 0,
        price: Number(item.price) || 0,
        status: item.status || 'AVAILABLE',
        image: item.image || '',
        updatedAt: now.toISOString()
    };

    // 1. Cloud Save
    if (isFirebaseConfigured() && db) {
        try {
            if (item.id && !item.id.startsWith('inv_')) {
                // Update existing
                const docRef = doc(db, COLLECTION_NAME, item.id);
                await updateDoc(docRef, {
                    ...itemData,
                    updatedAt: Timestamp.now()
                });
                return { ...itemData, id: item.id, createdAt: item.createdAt! } as InventoryItem;
            } else {
                // Create new
                const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                    ...itemData,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });
                return { ...itemData, id: docRef.id, createdAt: now.toISOString() } as InventoryItem;
            }
        } catch (error) {
            console.error('Error saving to cloud:', error);
            throw error;
        }
    }

    // 2. Local Storage (Fallback / Offline)
    const items = await getInventoryItems();
    let newItem: InventoryItem;

    if (item.id) {
        const idx = items.findIndex(i => i.id === item.id);
        if (idx >= 0) {
            newItem = { ...items[idx], ...itemData };
            items[idx] = newItem;
        } else {
            newItem = { ...itemData, id: generateId(), createdAt: now.toISOString() } as InventoryItem;
            items.push(newItem);
        }
    } else {
        newItem = { ...itemData, id: generateId(), createdAt: now.toISOString() } as InventoryItem;
        items.push(newItem);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return newItem;
}

/**
 * Delete inventory item
 */
export async function deleteInventoryItem(id: string): Promise<void> {
    // Cloud
    if (isFirebaseConfigured() && db && !id.startsWith('inv_')) {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (e) {
            console.error('Error deleting from cloud:', e);
        }
    }

    // Local
    const items = await getInventoryItems();
    const filtered = items.filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Update inventory status based on invoice data
 */
export async function updateInventoryStatusFromInvoice(invoiceData: InvoiceData): Promise<void> {
    const items = await getInventoryItems();
    let updates = 0;

    for (const invoiceItem of invoiceData.items) {
        if (!invoiceItem.sku) continue;

        // Find matching inventory item
        const inventoryItem = items.find(i => i.sku.toLowerCase() === invoiceItem.sku.toLowerCase());
        if (!inventoryItem) continue;

        let newStatus: 'AVAILABLE' | 'SOLD' | 'ON_APPROVAL' = inventoryItem.status;

        // Logic:
        // 1. If Returned -> AVAILABLE
        // 2. If Consignment -> ON_APPROVAL
        // 3. If Invoice (Sold) -> SOLD

        if (invoiceItem.returned || invoiceData.returned) {
            newStatus = 'AVAILABLE';
        } else if (invoiceData.documentType === 'CONSIGNMENT') {
            newStatus = 'ON_APPROVAL';
        } else {
            newStatus = 'SOLD';
        }

        // Only update if status changed
        if (newStatus !== inventoryItem.status) {
            await saveInventoryItem({ ...inventoryItem, status: newStatus });
            updates++;
        }
    }

    if (updates > 0) {
        console.log(`Updated status for ${updates} inventory items.`);
    }
}
