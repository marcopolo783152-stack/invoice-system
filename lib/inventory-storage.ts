import { getStorePrefix } from './user-storage';
/**
 * INVENTORY STORAGE SERVICE
 * 
 * Manages the "Digital Pick List" of rugs.
 * Syncs between localStorage and Firebase.
 */

import { RugShape, InvoiceData, InvoiceItem } from './calculations';
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
    writeBatch
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
    status: 'AVAILABLE' | 'SOLD' | 'ON_APPROVAL' | 'WHOLESALE' | 'OUT_FOR_SERVICE' | 'BACK_FROM_SERVICE';
    image?: string; // Legacy: Base64
    images?: string[]; // New: Array of base64 images
    createdAt: string;
    updatedAt: string;
    serviceHistory?: {
        dateSent: string;
        vendorName: string;
        dateReturned?: string;
        serviceType: string;
        cost: number;
        notes?: string;
        receivedBy?: string;
    }[];
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
    tagsPrinted?: boolean; // Track if tag has been printed
}

const STORAGE_KEY = 'inventory_items';
const getCollectionName = () => getStorePrefix() + 'inventory';

/**
 * Mark inventory tags as printed
 */
export async function markInventoryTagsPrinted(ids: string[]): Promise<void> {
    const items = await getInventoryItems();
    const idSet = new Set(ids);
    const updates: Promise<any>[] = [];

    // Local update
    const newItems = items.map(item => {
        if (idSet.has(item.id)) {
            return { ...item, tagsPrinted: true };
        }
        return item;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));

    // Cloud update
    if (isFirebaseConfigured() && db) {
        try {
            const batchSize = 500;
            const firestore = db;

            for (let i = 0; i < ids.length; i += batchSize) {
                const chunk = ids.slice(i, i + batchSize);
                const batch = writeBatch(firestore);

                chunk.forEach(id => {
                    const ref = doc(firestore, getCollectionName(), id);
                    batch.update(ref, { tagsPrinted: true, updatedAt: Timestamp.now() });
                });

                updates.push(batch.commit());
            }
            await Promise.all(updates);
        } catch (error) {
            console.error('Error updating tagsPrinted status:', error);
        }
    }
}

function generateId(): string {
    return 'inv_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Safe localStorage setter that handles QuotaExceededError
 * by stripping images if necessary to save space.
 */
function safeLocalStorageSet(key: string, items: InventoryItem[]): void {
    try {
        localStorage.setItem(key, JSON.stringify(items));
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.warn('LocalStorage quota exceeded. Retrying without images...');
            try {
                // Strip images and try again
                const stripped = items.map(item => ({
                    ...item,
                    image: '',
                    images: []
                }));
                localStorage.setItem(key, JSON.stringify(stripped));
            } catch (innerError) {
                console.error('Failed to save even without images:', innerError);
            }
        } else {
            console.error('Error saving to localStorage:', e);
        }
    }
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
            const q = query(collection(db, getCollectionName()), orderBy('sku', 'asc'));
            const snapshot = await getDocs(q);
            const items: InventoryItem[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                items.push({
                    id: doc.id,
                    sku: data.sku || '',
                    description: data.description || '',
                    shape: data.shape || 'rectangle',
                    widthFeet: Number(data.widthFeet) || 0,
                    widthInches: Number(data.widthInches) || 0,
                    lengthFeet: Number(data.lengthFeet) || 0,
                    lengthInches: Number(data.lengthInches) || 0,
                    price: Number(data.price) || 0,
                    status: data.status || 'AVAILABLE',
                    image: data.image || '',
                    images: data.images || [],
                    category: data.category || '',
                    origin: data.origin || '',
                    material: data.material || '',
                    quality: data.quality || '',
                    design: data.design || '',
                    colorBorder: data.colorBorder || '',
                    colorBg: data.colorBg || '',
                    importCost: Number(data.importCost) || 0,
                    totalCost: Number(data.totalCost) || 0,
                    zone: data.zone || '',
                    serviceHistory: data.serviceHistory || [],
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString()),
                    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || (data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString())
                });
            });

            // Update local cache
            safeLocalStorageSet(STORAGE_KEY, items);
            return items;
        } catch (error) {
            console.error('Error fetching inventory from cloud:', error);
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
export async function searchInventory(queryStr: string, category?: string): Promise<InventoryItem[]> {
    const items = await getInventoryItems();
    const term = queryStr.toLowerCase().trim();

    return items.filter(item => {
        if (category && category !== 'All' && item.category !== category) {
            return false;
        }
        if (!term) return true;
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
        images: item.images || [],
        createdAt: item.createdAt || now,
        updatedAt: item.updatedAt || now,
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

    const newSkus = new Set(processed.map(i => i.sku.toLowerCase()));
    const preserved = currentItems.filter(i => !newSkus.has(i.sku.toLowerCase()));
    const final = [...preserved, ...processed];
    safeLocalStorageSet(STORAGE_KEY, final);

    if (isFirebaseConfigured() && db) {
        try {
            const batchSize = 500;
            for (let i = 0; i < processed.length; i += batchSize) {
                const chunk = processed.slice(i, i + batchSize);
                const firestore = db;
                const batch = writeBatch(firestore);
                chunk.forEach(item => {
                    const ref = doc(firestore, getCollectionName(), item.id);
                    batch.set(ref, {
                        ...item,
                        createdAt: Timestamp.fromDate(new Date(item.createdAt)),
                        updatedAt: Timestamp.fromDate(new Date(item.updatedAt))
                    });
                });
                await batch.commit();
            }
        } catch (error) {
            console.error('Error batch writing to Firebase:', error);
        }
    }

    return processed.length;
}

/**
 * Save inventory item (Create or Update)
 */
export async function saveInventoryItem(item: Partial<InventoryItem>): Promise<InventoryItem> {
    const now = new Date();
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
        images: item.images || [],
        updatedAt: now.toISOString(),
        category: item.category || deriveCategory(Number(item.widthFeet) || 0, Number(item.widthInches) || 0, Number(item.lengthFeet) || 0, Number(item.lengthInches) || 0, item.shape as RugShape),
        origin: item.origin || '',
        material: item.material || '',
        quality: item.quality || '',
        design: item.design || '',
        colorBorder: item.colorBorder || '',
        colorBg: item.colorBg || '',
        importCost: Number(item.importCost) || 0,
        totalCost: Number(item.totalCost) || 0,
        zone: item.zone || '',
        serviceHistory: item.serviceHistory || []
    };

    if (isFirebaseConfigured() && db) {
        try {
            const finalData = { ...itemData, updatedAt: Timestamp.now() };
            if (item.id && !item.id.startsWith('inv_')) {
                const docRef = doc(db, getCollectionName(), item.id);
                await updateDoc(docRef, finalData);
                return { ...itemData, id: item.id, createdAt: item.createdAt || now.toISOString() } as InventoryItem;
            } else {
                const docRef = await addDoc(collection(db, getCollectionName()), { ...finalData, createdAt: Timestamp.now() });
                return { ...itemData, id: docRef.id, createdAt: now.toISOString() } as InventoryItem;
            }
        } catch (error: any) {
            console.error('Error saving to cloud:', error);
            if (error.code === 'permission-denied') {
                alert('Firebase Sync Failed: Permission Denied. Please check login.');
            } else if (error.message?.includes('too large') || error.message?.includes('1048576 bytes')) {
                alert('Cloud Sync Failed: Item too large (likely too many high-quality images). Please try removing one image or reducing quality.');
            } else {
                alert('Cloud Sync Failed: Check internet connection. Item saved locally.');
            }
            // Fall back to local storage update below
        }
    }

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
    safeLocalStorageSet(STORAGE_KEY, items);

    // Dispatch event for UI updates (immediate detection)
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('backup-trigger'));
    }

    return newItem;
}

/**
 * Delete inventory item
 */
export async function deleteInventoryItem(id: string): Promise<void> {
    // 1. Local update first (Optimistic)
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const items: InventoryItem[] = JSON.parse(stored);
            const filtered = items.filter(i => i.id !== id);
            safeLocalStorageSet(STORAGE_KEY, filtered);
        } catch (e) { console.error(e); }
    }

    // 2. Cloud update
    if (isFirebaseConfigured() && db) {
        try {
            await deleteDoc(doc(db, getCollectionName(), id));
        } catch (e) {
            console.error('Error deleting from cloud:', e);
            throw e; // Reraise to let UI know
        }
    }
}

/**
 * Bulk Delete Inventory Items
 */
export async function deleteInventoryBatch(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    // 1. Local update first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const items: InventoryItem[] = JSON.parse(stored);
            const idSet = new Set(ids);
            const filtered = items.filter(i => !idSet.has(i.id));
            safeLocalStorageSet(STORAGE_KEY, filtered);
        } catch (e) { console.error(e); }
    }

    // 2. Cloud update
    if (isFirebaseConfigured() && db) {
        const firestore = db;
        
        // Dispatch event for UI updates (immediate detection)
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('backup-trigger'));
        }

        try {
            const batchSize = 500;
            for (let i = 0; i < ids.length; i += batchSize) {
                const chunk = ids.slice(i, i + batchSize);
                const batch = writeBatch(firestore);
                chunk.forEach(id => batch.delete(doc(firestore, getCollectionName(), id)));
                await batch.commit();
            }
        } catch (error) {
            console.error('Error batch deleting from Firebase:', error);
            throw error;
        }
    }
}

/**
 * Update inventory status based on invoice data
 */
export async function updateInventoryStatusFromInvoice(
    invoiceData: InvoiceData,
    existingItems?: InventoryItem[]
): Promise<InventoryItem[]> {
    const items = existingItems || await getInventoryItems();
    const updatedItems = [...items];
    let updates = 0;

    for (const invoiceItem of invoiceData.items) {
        if (!invoiceItem.sku) continue;
        const skuLower = invoiceItem.sku.toLowerCase();
        const itemIdx = updatedItems.findIndex(i => i.sku.toLowerCase() === skuLower);
        const inventoryItem = itemIdx >= 0 ? updatedItems[itemIdx] : null;

        let newStatus: InventoryItem['status'];
        if (invoiceItem.returned || (invoiceData as any).returned) {
            newStatus = 'AVAILABLE';
        } else if (invoiceData.documentType === 'CONSIGNMENT') {
            newStatus = 'ON_APPROVAL';
        } else if (invoiceData.mode.toLowerCase().includes('wholesale')) {
            newStatus = 'WHOLESALE';
        } else {
            newStatus = 'SOLD';
        }

        if (inventoryItem) {
            if (newStatus !== inventoryItem.status) {
                const updated = await saveInventoryItem({ ...inventoryItem, status: newStatus });
                updatedItems[itemIdx] = updated;
                updates++;
            }
        } else {
            // New rug found in invoice - add to inventory as SOLD/ON_APPROVAL
            const newItem = await saveInventoryItem({
                sku: invoiceItem.sku,
                description: invoiceItem.description,
                shape: invoiceItem.shape,
                widthFeet: invoiceItem.widthFeet,
                widthInches: invoiceItem.widthInches,
                lengthFeet: invoiceItem.lengthFeet,
                lengthInches: invoiceItem.lengthInches,
                price: invoiceItem.fixedPrice || 0,
                status: newStatus,
                image: invoiceItem.image,
                images: invoiceItem.images || [],
                origin: invoiceItem.origin,
                material: invoiceItem.material,
                quality: invoiceItem.quality,
                design: invoiceItem.design,
                colorBg: invoiceItem.colorBg,
                colorBorder: invoiceItem.colorBorder,
                importCost: invoiceItem.importCost,
                totalCost: invoiceItem.totalCost,
                zone: invoiceItem.zone,
                createdAt: invoiceData.date
            });
            updatedItems.push(newItem);
            updates++;
        }
    }
    return updatedItems;
}

/**
 * History Synchronization: Scan all invoices and update inventory
 */
export async function syncAllInvoicesToInventory(): Promise<{ updated: number, total: number }> {
    // We need to import getAllInvoices dynamically to avoid circular dependency
    const { getAllInvoices } = await import('./invoice-storage');
    const invoices = await getAllInvoices();
    let currentRegistry = await getInventoryItems();
    let updatedInvoicesCount = 0;

    // Sort by date ascending to ensure historical order (oldest first)
    const sorted = [...invoices].sort((a, b) => new Date(a.data.date).getTime() - new Date(b.data.date).getTime());

    for (const inv of sorted) {
        // Skip Wash/Repair invoices as requested
        if (inv.data.documentType === 'WASH') continue;

        // Update the registry state in-memory as we go
        currentRegistry = await updateInventoryStatusFromInvoice(inv.data, currentRegistry);
        updatedInvoicesCount++;
    }

    return { updated: updatedInvoicesCount, total: invoices.length };
}
