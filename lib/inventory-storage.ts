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
    // New Fields
    category?: string; // e.g. "Runner", "9x12"
    origin?: string;
    material?: string;
    quality?: string;
    design?: string;
    colorBorder?: string;
    colorBg?: string;
    importCost?: number;
    totalCost?: number;
    zone?: string;
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
 * Derive category from dimensions and shape
 */
export function deriveCategory(widthFt: number, widthIn: number, lengthFt: number, lengthIn: number, shape: RugShape): string {
    if (shape === 'round') return 'Round';

    // Calculate total feet for comparison
    const width = widthFt + (widthIn / 12);
    const length = lengthFt + (lengthIn / 12);

    // Swap if width > length (standardize)
    const min = Math.min(width, length);
    const max = Math.max(width, length);

    // Runner Logic: Length is > 2.5x Width (approx) AND Width is usually < 4ft
    if (max > (min * 2.2) && min < 4.5) return 'Runner';

    // Size Buckets (Approximate)
    const area = min * max;

    if (min < 2.5 && max < 4) return 'Small / 2x3';
    if (min >= 2.5 && min < 3.5 && max >= 4 && max < 6) return '3x5 / 4x6';
    if (min >= 3.5 && min < 5.5 && max >= 6 && max < 8.5) return '5x7 / 6x9';
    if (min >= 5.5 && min < 7.5 && max >= 8.5 && max < 11) return '8x10';
    if (min >= 7.5 && min < 9.5 && max >= 11 && max < 13) return '9x12';
    if (min >= 9.5 && min < 11 && max >= 13 && max < 15) return '10x14';
    if (min >= 11) return 'Oversize / Palace';

    return 'Other';
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
    const items = await getInventoryItems();
    return items.find(i => i.sku.toLowerCase() === sku.toLowerCase()) || null;
}

/**
 * Search Inventory (Advanced)
 */
export async function searchInventory(query: string, category?: string): Promise<InventoryItem[]> {
    const items = await getInventoryItems();
    const term = query.toLowerCase().trim();

    return items.filter(item => {
        // Filter by category if provided
        if (category && category !== 'All' && item.category !== category) {
            return false;
        }

        if (!term) return true;

        // Search text fields
        return (
            item.sku.toLowerCase().includes(term) ||
            item.description.toLowerCase().includes(term) ||
            (item.origin || '').toLowerCase().includes(term) ||
            (item.design || '').toLowerCase().includes(term) ||
            (item.quality || '').toLowerCase().includes(term) ||
            (item.colorBg || '').toLowerCase().includes(term) ||
            (item.colorBorder || '').toLowerCase().includes(term)
        );
    });
}

/**
 * Bulk Import Inventory
 */
export async function importInventoryBatch(newItems: Partial<InventoryItem>[]): Promise<number> {
    const currentItems = await getInventoryItems();
    const now = new Date().toISOString();
    let count = 0;

    // We process locally first to avoid 500 Firebase writes at once if not needed, 
    // but ideally we should batch write to Firebase.
    // For now, let's just append to local and background sync or let the standard save logic handle it.
    // To be safe and fast:

    // 1. Map to full objects
    const processed: InventoryItem[] = newItems.map(item => ({
        id: item.id || generateId(),
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
        createdAt: now,
        updatedAt: now,
        // New Fields
        category: item.category || deriveCategory(
            Number(item.widthFeet) || 0, Number(item.widthInches) || 0,
            Number(item.lengthFeet) || 0, Number(item.lengthInches) || 0,
            item.shape || 'rectangle'
        ),
        origin: item.origin || '',
        material: item.material || '',
        quality: item.quality || '',
        design: item.design || '',
        colorBorder: item.colorBorder || '',
        colorBg: item.colorBg || '',
        importCost: Number(item.importCost) || 0,
        totalCost: Number(item.totalCost) || 0,
        zone: item.zone || ''
    }));

    // 2. Merge (Deduplicate by SKU preferred, but for now just add)
    // Actually, let's remove existing SKUs if they exist in the import (Update/Overwrite)
    const newSkus = new Set(processed.map(i => i.sku.toLowerCase()));

    const preserved = currentItems.filter(i => !newSkus.has(i.sku.toLowerCase()));

    const final = [...preserved, ...processed];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(final));

    // Todo: Trigger background upload to Cloud if needed
    // For now we return count
    return processed.length;
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
        updatedAt: now.toISOString(),
        // New Fields
        category: item.category || deriveCategory(Number(item.widthFeet) || 0, Number(item.widthInches) || 0, Number(item.lengthFeet) || 0, Number(item.lengthInches) || 0, item.shape as RugShape),
        origin: item.origin || '',
        material: item.material || '',
        quality: item.quality || '',
        design: item.design || '',
        colorBorder: item.colorBorder || '',
        colorBg: item.colorBg || '',
        importCost: Number(item.importCost) || 0,
        totalCost: Number(item.totalCost) || 0,
        zone: item.zone || ''
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
                    updatedAt: Timestamp.now(),
                    category: itemData.category || deriveCategory(itemData.widthFeet, itemData.widthInches, itemData.lengthFeet, itemData.lengthInches, itemData.shape as RugShape),
                    zone: item.zone || '',
                    origin: item.origin || '',
                    design: item.design || '',
                    quality: item.quality || '',
                    colorBg: item.colorBg || '',
                    colorBorder: item.colorBorder || '',
                    importCost: item.importCost || 0,
                    totalCost: item.totalCost || 0
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
