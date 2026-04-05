import { saveUserToCloud, getUsersFromCloud, deleteUserFromCloud } from './firebase-storage';
import { User, DEFAULT_USERS } from '@/components/UserManagement';

const USERS_STORAGE_KEY = 'mp-invoice-users';

/**
 * Multi-Tenant Helpers
 * Retrieve the current store context from session/local storage
 */
export function getCurrentStoreId(): string {
    if (typeof window === 'undefined') return '';
    const userStr = sessionStorage.getItem('mp-invoice-user') || localStorage.getItem('mp-invoice-user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user && user.storeId) return user.storeId;
        } catch { }
    }
    return ''; // Empty signifies root/default tenant for backward compatibility if needed, though we will set it explicitly.
}

export function getCurrentStoreName(): string {
    if (typeof window === 'undefined') return 'Store System';
    const userStr = sessionStorage.getItem('mp-invoice-user') || localStorage.getItem('mp-invoice-user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user && user.storeName) return user.storeName;
        } catch { }
    }
    return 'Store System';
}

export function getStorePrefix(): string {
    const storeId = getCurrentStoreId();
    // Use storeId + '_' if exists, else empty so existing main store works
    return storeId ? `${storeId}_` : '';
}

/**
 * Get all users (merging Cloud + Local + Defaults)
 */
export async function getUsers(): Promise<User[]> {
    // 1. Get from Local Storage
    let localUsers: User[] = [];
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(USERS_STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) localUsers = parsed;
            } catch { }
        }
    }

    // 2. Get from Cloud (if available)
    try {
        const cloudUsers = await getUsersFromCloud();

        // Merge: Cloud overwrites Local if username matches
        const userMap = new Map<string, User>();

        // Start with Defaults (if not overridden)
        DEFAULT_USERS.forEach(u => userMap.set(u.username, u));

        // Add Local (may override defaults)
        localUsers.forEach(u => userMap.set(u.username, u));

        // Add Cloud (authority)
        cloudUsers.forEach(u => userMap.set(u.username, u as User)); // Cast assuming valid shape

        // Convert back to array
        const mergedUsers = Array.from(userMap.values());

        // Update Local Cache
        if (typeof window !== 'undefined') {
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(mergedUsers));
        }

        // Filter for multi-tenancy: Only return users for the current store context
        const currentStoreId = getCurrentStoreId();
        if (currentStoreId) {
            return mergedUsers.filter(u => !u.storeId || u.storeId === currentStoreId || currentStoreId === 'MNS_MASTER');
        }

        return mergedUsers;
    } catch (error) {
        console.warn('Failed to fetch users from cloud, falling back to local:', error);
        // If cloud fails, return local + defaults
        const fallbackMap = new Map<string, User>();
        DEFAULT_USERS.forEach(u => fallbackMap.set(u.username, u));
        localUsers.forEach(u => fallbackMap.set(u.username, u));
        
        const mergedUsers = Array.from(fallbackMap.values());
        const currentStoreId = getCurrentStoreId();
        if (currentStoreId) {
            return mergedUsers.filter(u => !u.storeId || u.storeId === currentStoreId || currentStoreId === 'MNS_MASTER');
        }
        return mergedUsers;
    }
}

/**
 * Save user (to both Cloud and Local)
 */
export async function saveUser(user: User): Promise<void> {
    // 1. Update Cloud
    try {
        await saveUserToCloud(user);
    } catch (e) {
        console.error('Failed to save user to cloud:', e);
        // Continue to save local even if cloud fails
    }

    // 2. Update Local
    if (typeof window !== 'undefined') {
        const users = await getUsers(); // Get current state
        const existingIndex = users.findIndex(u => u.username === user.username);

        if (existingIndex >= 0) {
            users[existingIndex] = user;
        } else {
            users.push(user);
        }

        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
}

/**
 * Delete user (from both Cloud and Local)
 */
export async function deleteUser(username: string): Promise<void> {
    // 1. Delete from Cloud
    try {
        await deleteUserFromCloud(username);
    } catch (e) {
        console.error('Failed to delete user from cloud:', e);
    }

    // 2. Delete from Local
    if (typeof window !== 'undefined') {
        const users = await getUsers();
        const filtered = users.filter(u => u.username !== username);
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filtered));
    }
}
