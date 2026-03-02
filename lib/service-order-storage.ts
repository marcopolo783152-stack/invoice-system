/**
 * SERVICE ORDER STORAGE SERVICE
 * 
 * Manages tracking of rugs sent to external vendors.
 */

import { db, isFirebaseConfigured } from './firebase';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDocs,
    query,
    orderBy,
    Timestamp,
    where,
    getDoc
} from 'firebase/firestore';
import { InventoryItem, saveInventoryItem, getInventoryItems } from './inventory-storage';

export interface ServiceOrderRug {
    sku: string;
    description: string;
    returned: boolean;
    dateReturned?: string;
    receivedBy?: string;
    conditionNotes?: string;
    serviceType?: string; // e.g. "Wash", "Repair", "Both"
    cost?: number;
}

export interface ServiceOrder {
    id: string;
    orderNumber: string;
    vendorId: string;
    vendorName: string;
    dateSent: string;
    driverName: string;
    pickupDate: string;
    pickupTime: string;
    notes: string;
    rugs: ServiceOrderRug[];
    status: 'ACTIVE' | 'COMPLETED' | 'PARTIAL';
    createdAt: string;
    updatedAt: string;
}

const STORAGE_KEY = 'service_orders';
const COLLECTION_NAME = 'service_orders';

function generateId(): string {
    return 'so_' + Math.random().toString(36).substr(2, 9);
}

export async function getServiceOrders(): Promise<ServiceOrder[]> {
    if (typeof window === 'undefined') return [];

    if (isFirebaseConfigured() && db) {
        try {
            const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const orders: ServiceOrder[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                orders.push({
                    id: doc.id,
                    orderNumber: data.orderNumber || '',
                    vendorId: data.vendorId || '',
                    vendorName: data.vendorName || '',
                    dateSent: data.dateSent || '',
                    driverName: data.driverName || '',
                    pickupDate: data.pickupDate || '',
                    pickupTime: data.pickupTime || '',
                    notes: data.notes || '',
                    rugs: data.rugs || [],
                    status: data.status || 'ACTIVE',
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString()),
                    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || (data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString())
                });
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
            return orders;
        } catch (error) {
            console.error('Error fetching service orders from cloud:', error);
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

export async function getServiceOrderById(id: string): Promise<ServiceOrder | null> {
    const orders = await getServiceOrders();
    return orders.find(o => o.id === id) || null;
}

export async function generateOrderNumber(): Promise<string> {
    const orders = await getServiceOrders();
    const year = new Date().getFullYear();
    const count = orders.filter(o => o.orderNumber.startsWith(`SO-${year}`)).length + 1;
    return `SO-${year}-${count.toString().padStart(3, '0')}`;
}

export async function createServiceOrder(order: Partial<ServiceOrder>): Promise<ServiceOrder> {
    const now = new Date();
    const orderNumber = order.orderNumber || await generateOrderNumber();

    const orderData: any = {
        orderNumber,
        vendorId: order.vendorId || '',
        vendorName: order.vendorName || '',
        dateSent: order.dateSent || now.toISOString(),
        driverName: order.driverName || '',
        pickupDate: order.pickupDate || '',
        pickupTime: order.pickupTime || '',
        notes: order.notes || '',
        rugs: order.rugs || [],
        status: 'ACTIVE',
        updatedAt: now.toISOString(),
    };

    // Update rug statuses in inventory (ONLY for listed rugs)
    const inventoryItems = await getInventoryItems();
    for (const rug of orderData.rugs) {
        const item = inventoryItems.find(i => i.sku === rug.sku);
        if (item) {
            await saveInventoryItem({ ...item, status: 'OUT_FOR_SERVICE' as any });
        }
    }

    if (isFirebaseConfigured() && db) {
        try {
            const finalData = { ...orderData, updatedAt: Timestamp.now(), createdAt: Timestamp.now() };
            const docRef = await addDoc(collection(db, COLLECTION_NAME), finalData);
            return { ...orderData, id: docRef.id, createdAt: now.toISOString() } as ServiceOrder;
        } catch (error) {
            console.error('Error creating service order in cloud:', error);
        }
    }

    const orders = await getServiceOrders();
    const newOrder = { ...orderData, id: generateId(), createdAt: now.toISOString() } as ServiceOrder;
    orders.push(newOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    return newOrder;
}

export async function updateServiceOrder(id: string, updates: Partial<ServiceOrder>): Promise<ServiceOrder> {
    const orders = await getServiceOrders();
    const index = orders.findIndex(o => o.id === id);
    if (index === -1) throw new Error('Order not found');

    const updatedOrder = { ...orders[index], ...updates, updatedAt: new Date().toISOString() };

    // Recalculate status based on rugs
    const allReturned = updatedOrder.rugs.every((r: any) => r.returned);
    const someReturned = updatedOrder.rugs.some((r: any) => r.returned);
    updatedOrder.status = allReturned ? 'COMPLETED' : (someReturned ? 'PARTIAL' : 'ACTIVE');

    if (isFirebaseConfigured() && db) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            const { id: _, createdAt: __, ...dataToSave } = updatedOrder as any;
            await updateDoc(docRef, { ...dataToSave, updatedAt: Timestamp.now() });
        } catch (error) {
            console.error('Error updating service order in cloud:', error);
        }
    }

    orders[index] = updatedOrder;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    return updatedOrder;
}

export async function markRugAsReturned(orderId: string, sku: string, returnData: Partial<ServiceOrderRug>): Promise<ServiceOrder> {
    const order = await getServiceOrderById(orderId);
    if (!order) throw new Error('Order not found');

    const rugIndex = order.rugs.findIndex(r => r.sku === sku);
    if (rugIndex === -1) throw new Error('Rug not found in order');

    const updatedRugs = [...order.rugs];
    updatedRugs[rugIndex] = {
        ...updatedRugs[rugIndex],
        ...returnData,
        returned: true,
        dateReturned: returnData.dateReturned || new Date().toISOString()
    };

    // Update Rug in Inventory
    const inventoryItems = await getInventoryItems();
    const rugItem = inventoryItems.find(i => i.sku === sku);
    if (rugItem) {
        const historyEntry = {
            dateSent: order.dateSent,
            vendorName: order.vendorName,
            dateReturned: updatedRugs[rugIndex].dateReturned,
            serviceType: updatedRugs[rugIndex].serviceType || 'Service',
            cost: updatedRugs[rugIndex].cost || 0,
            notes: updatedRugs[rugIndex].conditionNotes,
            receivedBy: updatedRugs[rugIndex].receivedBy
        };

        const currentHistory = (rugItem as any).serviceHistory || [];
        await saveInventoryItem({
            ...rugItem,
            status: 'AVAILABLE', // Change back to available
            serviceHistory: [...currentHistory, historyEntry] as any
        });
    }

    return await updateServiceOrder(orderId, { rugs: updatedRugs });
}

export async function deleteServiceOrder(id: string): Promise<void> {
    const orders = await getServiceOrders();
    const order = orders.find(o => o.id === id);
    if (!order) return;

    // Optional: Revert rug statuses to AVAILABLE if they were out for service
    const inventoryItems = await getInventoryItems();
    for (const rug of order.rugs) {
        if (!rug.returned) {
            const item = inventoryItems.find(i => i.sku === rug.sku);
            if (item && item.status === 'OUT_FOR_SERVICE') {
                await saveInventoryItem({ ...item, status: 'AVAILABLE' });
            }
        }
    }

    if (isFirebaseConfigured() && db) {
        try {
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (error) {
            console.error('Error deleting service order from cloud:', error);
        }
    }

    const filtered = orders.filter(o => o.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
