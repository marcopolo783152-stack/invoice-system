import { db, isFirebaseConfigured } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

const STORAGE_KEY = 'customer_db';
const COLLECTION_NAME = 'customers';

export interface Customer {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email?: string;
    createdAt: string;
    updatedAt: string;
}

// Helper to generate a simple ID
function generateId(): string {
    return 'cust_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Get all customers (Local + Background Cloud Sync)
 */
export async function getCustomers(): Promise<Customer[]> {
    // 1. Try Local Storage first for speed
    const localData = localStorage.getItem(STORAGE_KEY);
    let localCustomers: Customer[] = [];

    if (localData) {
        try {
            localCustomers = JSON.parse(localData);
        } catch (e) {
            console.error('Error parsing local customers:', e);
        }
    }

    // 2. Refresh from Cloud if configured (Fire & Forget/Background)
    if (isFirebaseConfigured() && db) {
        getDocs(collection(db, COLLECTION_NAME)).then(snapshot => {
            const cloudCustomers: Customer[] = [];
            snapshot.forEach(doc => {
                const data = doc.data() as Omit<Customer, 'id'>;
                cloudCustomers.push({ ...data, id: doc.id });
            });

            // Basic merge: Cloud wins if same ID, otherwise combine? 
            // For simplicity in this implementation, if cloud returns data, we overwrite local cache to ensure sync
            if (cloudCustomers.length > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudCustomers));
            }
        }).catch(err => console.error('Error fetching customers from cloud:', err));
    }

    return localCustomers;
}

/**
 * Save customer (Create or Update)
 */
export async function saveCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Customer> {
    const now = new Date();
    let id = customerData.id;
    let isNew = !id;

    if (!id) {
        id = generateId();
    }

    const customer: Customer = {
        ...customerData,
        id: id!,
        createdAt: isNew ? now.toISOString() : (await getCustomerById(id!) || { createdAt: now.toISOString() }).createdAt,
        updatedAt: now.toISOString()
    };

    // 1. Save to Cloud
    if (isFirebaseConfigured() && db) {
        try {
            await setDoc(doc(db, COLLECTION_NAME, customer.id), customer);
        } catch (error) {
            console.error('Error saving customer to cloud:', error);
        }
    }

    // 2. Save to Local
    const customers = await getCustomers();
    const idx = customers.findIndex(c => c.id === customer.id);
    if (idx >= 0) {
        customers[idx] = customer;
    } else {
        customers.push(customer);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));

    return customer;
}

/**
 * Delete customer
 */
export async function deleteCustomer(id: string): Promise<void> {
    // Cloud
    if (isFirebaseConfigured() && db) {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (e) {
            console.error('Error deleting customer from cloud:', e);
        }
    }

    // Local
    const customers = await getCustomers();
    const filtered = customers.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Get customer by ID
 */
export async function getCustomerById(id: string): Promise<Customer | undefined> {
    const customers = await getCustomers();
    return customers.find(c => c.id === id);
}

/**
 * Search customers
 */
export async function searchCustomers(query: string): Promise<Customer[]> {
    const customers = await getCustomers();
    const lowerQuery = query.toLowerCase();

    return customers.filter(c =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.phone.includes(query) ||
        (c.email && c.email.toLowerCase().includes(lowerQuery))
    );
}

/**
 * Auto-save helper: saves customer from invoice data
 */
export async function updateCustomerFromInvoice(data: { name: string; address: string; city: string; state: string; zip: string; phone: string; email?: string }): Promise<void> {
    if (!data.name || data.name.trim() === '') return;

    const customers = await getCustomers();

    // Check if exists by Name (and maybe Phone?)
    // Simple logic: if name matches case-insensitive, update it. Else create new.
    const existing = customers.find(c => c.name.trim().toLowerCase() === data.name.trim().toLowerCase());

    if (existing) {
        // Update existing (capture latest address/phone)
        const updated = {
            ...existing,
            ...data,
            updatedAt: new Date().toISOString()
        };
        await saveCustomer(updated);
    } else {
        // Create new
        await saveCustomer(data);
    }
}
