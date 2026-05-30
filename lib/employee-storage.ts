import { getStorePrefix, getCurrentStoreId } from './user-storage';

/**
 * EMPLOYEE STORAGE SERVICE
 * 
 * Manages employee profiles and clock in/out logs.
 * Hybrid storage: Firebase Cloud (primary) + LocalStorage (fallback)
 */

import {
    collection,
    addDoc,
    updateDoc,
    setDoc,
    getDocs,
    doc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    onSnapshot,
    Unsubscribe
} from 'firebase/firestore';
import { db, app, isFirebaseConfigured } from './firebase';

export interface Employee {
    id: string;
    name: string;
    phone: string;
    email?: string;
    empId: string;
    pin?: string;
    status: 'IN' | 'OUT';
    joinedDate: string;
    lastAction?: string;
    dailyRate?: number; // Salary per day
    photo?: string; // Profile picture (Base64)
}

export interface TimeLog {
    id: string;
    employeeId: string;
    employeeName: string;
    type: 'IN' | 'OUT' | 'LEAVE';
    timestamp: string;  // ISO
    notes?: string;
    device?: string;
    facePhoto?: string; // Base64 selfie
    location?: {

        lat: number;
        lng: number;
        accuracy?: number;
    };
    synced?: boolean;
    isDeleted?: boolean;
}

export interface EmployeePayment {
    id: string;
    employeeId: string;
    amount: number;
    date: string;
    notes?: string;
}

const BASE_EMP_COLLECTION = 'employees';
const BASE_LOG_COLLECTION = 'timelogs';
const BASE_PAY_COLLECTION = 'employeepayments';
const BASE_LOCAL_EMP_KEY = 'mns_employees_local';
const BASE_LOCAL_LOG_KEY = 'mns_timelogs_local';
const BASE_LOCAL_PAY_KEY = 'mns_payments_local';

export const getCol = (col: string) => {
    const prefix = getStorePrefix();
    return prefix + col;
};

export const getKey = (key: string) => {
    const prefix = getStorePrefix();
    return prefix + key;
};

/**
 * Generate unique IDs for local use
 */
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Get all employees
 */
export async function getEmployees(): Promise<Employee[]> {
    if (typeof window === 'undefined') return [];

    const colName = getCol(BASE_EMP_COLLECTION);
    const localKey = getKey(BASE_LOCAL_EMP_KEY);
    const prefix = getStorePrefix();
    const employees: Employee[] = [];

    if (isFirebaseConfigured() && db) {
        try {
            // Check prefixed collection
            const snapshot = await getDocs(query(collection(db, colName), orderBy('name', 'asc')));
            snapshot.forEach(eDoc => {
                employees.push({ id: eDoc.id, ...eDoc.data() } as Employee);
            });

            // FALLBACK & AUTO-MIGRATION (Runs if current view is empty)
            if (employees.length === 0) {
                const rootSnapshot = await getDocs(query(collection(db, BASE_EMP_COLLECTION), orderBy('name', 'asc')));
                rootSnapshot.forEach(empDoc => {
                    const data = empDoc.data();
                    if (!data.storeId || data.storeId === getCurrentStoreId()) {
                        employees.push({ id: empDoc.id, ...data } as Employee);
                        // AUTO-MIGRATE: Save to new collection so listeners can see it
                        setDoc(doc(db!, colName, empDoc.id), data, { merge: true }).catch(() => {});
                    }
                });
            }
            localStorage.setItem(localKey, JSON.stringify(employees));
            return employees;
        } catch (e) {
            console.error('Error fetching employees from Firebase:', e);
        }
    }

    const localData = localStorage.getItem(localKey);
    return localData ? JSON.parse(localData) : [];
}

/**
 * Subscribe to employee updates (Real-time)
 */
export function subscribeToEmployees(callback: (employees: Employee[]) => void): Unsubscribe | null {
    if (!isFirebaseConfigured() || !db) return null;
    const colName = getCol(BASE_EMP_COLLECTION);
    const q = query(collection(db, colName), orderBy('name', 'asc'));

    return onSnapshot(q, (snapshot) => {
        const employees: Employee[] = [];
        snapshot.forEach(doc => {
            employees.push({ id: doc.id, ...doc.data() } as Employee);
        });
        
        // Update local cache
        const localKey = getKey(BASE_LOCAL_EMP_KEY);
        localStorage.setItem(localKey, JSON.stringify(employees));
        
        callback(employees);
    }, (error) => {
        console.error("Employee subscription error:", error);
    });
}

/**
 * Register or update an employee
 */
export async function saveEmployee(employee: Partial<Employee>): Promise<Employee> {
    const isNew = !employee.id;
    const data = {
        ...employee,
        empId: employee.empId || `EMP-${Date.now().toString().slice(-4)}`,
        status: employee.status || 'OUT',
        joinedDate: employee.joinedDate || new Date().toISOString()
    };

    const colName = getCol(BASE_EMP_COLLECTION);
    const localKey = getKey(BASE_LOCAL_EMP_KEY);

    if (isFirebaseConfigured() && db) {
        try {
            if (isNew) {
                const docRef = await addDoc(collection(db, colName), data);
                data.id = docRef.id;
            } else {
                await updateDoc(doc(db, colName, employee.id!), data);
            }
        } catch (e) {
            console.error('Error saving employee to Firebase:', e);
        }
    }

    // Always update local cache
    const employees = await getEmployees();
    if (isNew) {
        if (!data.id) data.id = generateId(); // Fallback ID
        employees.push(data as Employee);
    } else {
        const idx = employees.findIndex(e => e.id === employee.id);
        if (idx >= 0) employees[idx] = { ...employees[idx], ...data } as Employee;
    }
    localStorage.setItem(localKey, JSON.stringify(employees));

    return data as Employee;
}

/**
 * Clock In/Out implementation
 */
export async function clockInOut(
    identifier: string,
    type?: 'IN' | 'OUT',
    facePhoto?: string,
    location?: TimeLog['location']
): Promise<{ employee: Employee, log: TimeLog }> {
    // Ensure anyone left IN from previous shifts or past 6PM is auto-clocked out before creating new logs.
    await checkAutoClockOut();

    let cleanIdentifier = identifier.trim();
    
    // Extract ID if a full QR Code URL was scanned into the input field
    if (cleanIdentifier.includes('id=')) {
        try {
            const urlMatch = cleanIdentifier.match(/(?:\?|&|^)id=([^&]+)/);
            if (urlMatch && urlMatch[1]) {
                cleanIdentifier = decodeURIComponent(urlMatch[1]);
            }
        } catch(e) {}
    }

    const employees = await getEmployees();
    const employee = employees.find(e => {
        const cleanId = cleanIdentifier.toLowerCase().replace(/\/$/, '');
        const empIdStr = (e.empId || '').trim().toLowerCase();
        
        const numericId = empIdStr.replace(/\D/g, '');
        const cleanNumeric = cleanId.replace(/\D/g, '');

        return empIdStr === cleanId ||
            (e.id || '').trim().toLowerCase() === cleanId ||
            empIdStr === `emp${cleanId}` ||
            empIdStr === `emp-${cleanId}` ||
            (numericId !== '' && cleanNumeric !== '' && numericId === cleanNumeric && cleanNumeric === cleanId) || 
            (e.phone || '').trim() === cleanId ||
            (e.email || '').trim().toLowerCase() === cleanId ||
            (e.name || '').trim().toLowerCase() === cleanId;
    });

    if (!employee) throw new Error(`Employee not found for ID: ${cleanIdentifier}`);

    const nextType = type || (employee.status === 'IN' ? 'OUT' : 'IN');
    const now = new Date().toISOString();

    const log: TimeLog = {
        id: generateId(),
        employeeId: employee.id,
        employeeName: employee.name,
        type: nextType,
        timestamp: now,
        facePhoto,
        location
    };

    // Update Employee Status
    employee.status = nextType;
    employee.lastAction = now;

    // AUTO-SET PROFILE PICTURE: If employee doesn't have one, use this captured photo
    let setsPhoto = false;
    if (!employee.photo && facePhoto) {
        employee.photo = facePhoto;
        setsPhoto = true;
    }

    const empCol = getCol(BASE_EMP_COLLECTION);
    const logCol = getCol(BASE_LOG_COLLECTION);
    const localEmpKey = getKey(BASE_LOCAL_EMP_KEY);
    const localLogKey = getKey(BASE_LOCAL_LOG_KEY);

    if (isFirebaseConfigured() && db) {
        try {
            // Log entry
            const logRef = await addDoc(collection(db!, logCol), {
                ...log,
                synced: true, // Permanent flag: once synced, never re-upload
                timestamp: Timestamp.fromDate(new Date())
            });
            log.id = logRef.id;

            // Update status in cloud
            const updateFields: any = {
                status: nextType,
                lastAction: now
            };
            if (setsPhoto) updateFields.photo = facePhoto;

            await updateDoc(doc(db!, empCol, employee.id), updateFields);
        } catch (e) {
            console.error('Firebase clock error:', e);
        }
    }

    // Update local cache
    const allEmps = employees.map(e => e.id === employee.id ? employee : e);
    localStorage.setItem(localEmpKey, JSON.stringify(allEmps));

    // Append to local logs
    const localLogs = JSON.parse(localStorage.getItem(localLogKey) || '[]');
    // Mark as synced if we successfully wrote to Firebase above
    const logToSave = { ...log, synced: !!(isFirebaseConfigured() && db) };
    localLogs.unshift(logToSave);
    localStorage.setItem(localLogKey, JSON.stringify(localLogs.slice(0, 2000)));

    // Trigger immediate sync pass to ensure cloud visibility
    if (typeof window !== 'undefined') {
        getTimeLogs(1).catch(() => {});
    }

    return { employee, log };
}

/**
 * Perform Automatic Clock-out for all employees still "IN" after 6:00 PM
 * This function also handles employees who forgot to clock out on previous days.
 */
export async function checkAutoClockOut(): Promise<number> {
    const employees = await getEmployees();
    const inEmployees = employees.filter(e => e.status === 'IN');

    if (inEmployees.length === 0) return 0;

    const now = new Date();
    const currentHour = now.getHours();
    let count = 0;

    for (const emp of inEmployees) {
        if (!emp.lastAction) continue;

        const lastActionDate = new Date(emp.lastAction);
        const isToday = lastActionDate.toDateString() === now.toDateString();

        // If clocked in today, ONLY clock out if it's currently past 6 PM
        if (isToday) {
            if (currentHour < 18) continue;
        }

        // Determine the "End of Shift" time (6:00 PM on the day they clocked in)
        const endOfShift = new Date(lastActionDate);
        endOfShift.setHours(18, 0, 0, 0);

        // If they clocked in AFTER 6 PM today, leave them for now.
        if (lastActionDate >= endOfShift && isToday) continue;

        let clockOutTime = endOfShift;
        // If they clocked in after 6 PM on a previous day, clock them out at 11:59 PM that same day to avoid negative time
        if (lastActionDate >= endOfShift) {
            clockOutTime = new Date(lastActionDate);
            clockOutTime.setHours(23, 59, 59, 999);
        }

        const timestamp = clockOutTime.toISOString();

        // Use deterministic ID to prevent duplicates if multiple clients trigger this simultaneously
        const deterministicId = `auto_${emp.id}_${clockOutTime.getTime()}`;

        // Create manual-style clock-out log
        const log: TimeLog = {
            id: deterministicId,
            employeeId: emp.id,
            employeeName: emp.name,
            type: 'OUT',
            timestamp: timestamp,
            notes: 'System Auto-Clock Out (Shift End 6:00 PM)'
        };

        emp.status = 'OUT';
        emp.lastAction = timestamp;

        const empCol = getCol(BASE_EMP_COLLECTION);
        const logCol = getCol(BASE_LOG_COLLECTION);
        const localEmpKey = getKey(BASE_LOCAL_EMP_KEY);
        const localLogKey = getKey(BASE_LOCAL_LOG_KEY);

        let localLogPushed = false;

        if (isFirebaseConfigured() && db) {
            try {
                // Determine a safe fallback date to prevent invalid Timestamp errors
                const safeDate = isNaN(endOfShift.getTime()) ? new Date() : endOfShift;

                // Add log to cloud using deterministic setDoc to avoid duplicate records
                await setDoc(doc(db, logCol, deterministicId), {
                    ...log,
                    timestamp: Timestamp.fromDate(safeDate)
                });
                
                // Update employee in cloud
                await updateDoc(doc(db, empCol, emp.id), {
                    status: 'OUT',
                    lastAction: timestamp
                });

                 // IMPORTANT: Also update local timelogs cache so the auto-clock out is recorded locally 
                 const localLogs = JSON.parse(localStorage.getItem(localLogKey) || '[]');
                 if (!localLogs.find((l: any) => l.id === deterministicId)) {
                     localLogs.unshift(log);
                     localStorage.setItem(localLogKey, JSON.stringify(localLogs.slice(0, 2000)));
                 }
                 localLogPushed = true;

            } catch (e) {
                console.error(`Auto clock-out error for ${emp.name}:`, e);
                // If it fails, let's revert memory status so it doesn't wrongly save below
                emp.status = 'IN';
                continue; // Skip the count increment to avoid corrupting cache state
            }
        }

        if (!localLogPushed) {
            const localLogs = JSON.parse(localStorage.getItem(localLogKey) || '[]');
            if (!localLogs.find((l: any) => l.id === deterministicId)) {
                localLogs.unshift(log);
                localStorage.setItem(localLogKey, JSON.stringify(localLogs.slice(0, 2000)));
            }
        }

        count++;
    }

    if (count > 0) {
        // Update local storage
        const localEmpKey = getKey(BASE_LOCAL_EMP_KEY);
        localStorage.setItem(localEmpKey, JSON.stringify(employees));
    }

    return count;
}

/**
 * Get recent time logs
 */
export async function getTimeLogs(limitCount = 1000): Promise<TimeLog[]> {
    const logCol = getCol(BASE_LOG_COLLECTION);
    const localLogKey = getKey(BASE_LOCAL_LOG_KEY);
    const prefix = getStorePrefix();
    const logs: TimeLog[] = [];

    if (isFirebaseConfigured() && db) {
        try {
            // Check prefixed collection
            const q = query(collection(db, logCol), orderBy('timestamp', 'desc'), limit(limitCount));
            const snapshot = await getDocs(q);
            snapshot.forEach(lDoc => {
                const data = lDoc.data();
                if (data.isDeleted) return; // SKIP DELETED LOGS

                let timestamp = data.timestamp;
                if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                    timestamp = data.timestamp.toDate().toISOString();
                } else if (data.timestamp && data.timestamp.seconds) {
                    timestamp = new Date(data.timestamp.seconds * 1000).toISOString();
                }

                logs.push({
                    id: lDoc.id,
                    ...data,
                    timestamp: timestamp
                } as TimeLog);
            });

            // Note: Auto-migration handles pulling from root. We only fetch prefixed logs here.
            
            // MANUAL SORTING
            logs.sort((a, b) => {
                const dateA = new Date(a.timestamp || 0).getTime();
                const dateB = new Date(b.timestamp || 0).getTime();
                if (isNaN(dateA)) return 1;
                if (isNaN(dateB)) return -1;
                return dateB - dateA;
            });

            // Removed localStorage caching to prevent browser quota errors
            return logs;
        } catch (e: any) {
            console.error('Error in getTimeLogs:', e);
            const errorString = (e.message || e.code || e.toString()).toLowerCase();
            const projectId = (db as any)?._databaseId?.projectId || 'unknown';
            const apiKey = (app?.options as any)?.apiKey || 'unknown';
            
            if (errorString.includes('quota') || errorString.includes('resource-exhausted') || e.code === 'resource-exhausted') {
                if (typeof window !== 'undefined') {
                    alert(`FIREBASE QUOTA ERROR\n\nProject: ${projectId}\nAPI Key: ${apiKey.substring(0, 10)}...\n\nReason: ${e.message}\n\nYour database is still reporting that the limit is reached. Please verify your Blaze upgrade and check for any Spending Limits in the Google Cloud Console.`);
                }
            } else if (errorString.includes('permission-denied') || e.code === 'permission-denied') {
                if (typeof window !== 'undefined') {
                    alert(`FIREBASE PERMISSION ERROR\n\nProject: ${projectId}\n\nReason: Your Security Rules are rejecting this request. Please paste the "Allow All" rules I gave you into the Firebase Console.`);
                }
            } else {
                if (typeof window !== 'undefined') {
                    alert(`FIREBASE CONNECTION ERROR\n\nProject: ${projectId}\n\nError: ${e.message}`);
                }
            }
            return [];
        }
    }

    if (typeof window !== 'undefined') {
        const localData = localStorage.getItem(localLogKey);
        return localData ? JSON.parse(localData) : [];
    }
    return [];
}

/**
 * Subscribe to time logs (Real-time)
 */
export function subscribeToTimeLogs(callback: (logs: TimeLog[]) => void, limitCount = 1000): Unsubscribe | null {
    if (!isFirebaseConfigured() || !db) return null;
    const logCol = getCol(BASE_LOG_COLLECTION);
    const q = query(collection(db, logCol), orderBy('timestamp', 'desc'), limit(limitCount));

    return onSnapshot(q, (snapshot) => {
        const logs: TimeLog[] = [];
        snapshot.forEach(lDoc => {
            const data = lDoc.data();
            if (data.isDeleted) return; // SKIP DELETED LOGS

            let timestamp = data.timestamp;
            if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                timestamp = data.timestamp.toDate().toISOString();
            } else if (data.timestamp && data.timestamp.seconds) {
                timestamp = new Date(data.timestamp.seconds * 1000).toISOString();
            }

            logs.push({
                id: lDoc.id,
                ...data,
                timestamp: timestamp
            } as TimeLog);
        });
        
        // Removed localStorage caching to prevent browser quota errors
        callback(logs);
    }, (error) => {
        console.error("Logs subscription error:", error);
    });
}

export async function addManualTimeLog(log: Omit<TimeLog, 'id'>): Promise<TimeLog> {
    const empCol = getCol(BASE_EMP_COLLECTION);
    const logCol = getCol(BASE_LOG_COLLECTION);
    const localEmpKey = getKey(BASE_LOCAL_EMP_KEY);
    const localLogKey = getKey(BASE_LOCAL_LOG_KEY);

    const data: TimeLog = {
        ...log,
        id: generateId()
    };

    if (isFirebaseConfigured() && db) {
        try {
            const logRef = await addDoc(collection(db!, logCol), {
                ...data,
                synced: true, // Permanent flag
                timestamp: Timestamp.fromDate(new Date(data.timestamp))
            });
            data.id = logRef.id;

            // Admin manual log: Force update the employee status immediately
            const { setDoc, doc } = await import('firebase/firestore');
            await setDoc(doc(db!, empCol, data.employeeId), {
                status: data.type === 'LEAVE' ? 'OUT' : data.type,
                lastAction: data.timestamp
            }, { merge: true });
        } catch (e) {
            console.error('Error adding manual log:', e);
        }
    }

    // Update local logs
    const localLogs = JSON.parse(localStorage.getItem(localLogKey) || '[]');
    localLogs.unshift(data);
    localStorage.setItem(localLogKey, JSON.stringify(localLogs.slice(0, 1000)));

    // Update local employee cache
    try {
        const localEmployees = JSON.parse(localStorage.getItem(localEmpKey) || '[]');
        const idx = localEmployees.findIndex((e: any) => e.id === data.employeeId);
        if (idx >= 0) {
            localEmployees[idx].status = data.type === 'LEAVE' ? 'OUT' : data.type;
            localEmployees[idx].lastAction = data.timestamp;
            localStorage.setItem(localEmpKey, JSON.stringify(localEmployees));
        }
    } catch (e) {
        console.error('Error updating local employee cache:', e);
    }

    // Trigger immediate sync pass to ensure cloud visibility
    if (typeof window !== 'undefined') {
        getTimeLogs(1).catch(() => {});
    }

    return data;
}

/**
 * Update an existing time log
 */
export async function updateTimeLog(logId: string, updates: Partial<TimeLog>): Promise<void> {
    const logCol = getCol(BASE_LOG_COLLECTION);
    const localLogKey = getKey(BASE_LOCAL_LOG_KEY);

    if (isFirebaseConfigured() && db) {
        try {
            const { doc, updateDoc } = await import('firebase/firestore');
            // If timestamp is updated, convert to Firestore timestamp
            const data: any = { ...updates };
            if (updates.timestamp) {
                data.timestamp = Timestamp.fromDate(new Date(updates.timestamp));
            }
            await updateDoc(doc(db, logCol, logId), data);
        } catch (e) { console.error('Error updating log:', e); }
    }

    const localLogs = JSON.parse(localStorage.getItem(localLogKey) || '[]');
    const idx = localLogs.findIndex((l: any) => l.id === logId);
    if (idx >= 0) {
        localLogs[idx] = { ...localLogs[idx], ...updates };
        localStorage.setItem(localLogKey, JSON.stringify(localLogs));
    }
}

/**
 * Bulk add manual time logs
 */
export async function addManualTimeLogsBulk(logs: Omit<TimeLog, 'id'>[]): Promise<void> {
    if (logs.length === 0) return;

    const empCol = getCol(BASE_EMP_COLLECTION);
    const logCol = getCol(BASE_LOG_COLLECTION);
    const localEmpKey = getKey(BASE_LOCAL_EMP_KEY);
    const localLogKey = getKey(BASE_LOCAL_LOG_KEY);

    const processedLogs: TimeLog[] = [];

    if (isFirebaseConfigured() && db) {
        try {
            const { writeBatch, doc, collection, Timestamp } = await import('firebase/firestore');
            
            // Group employee updates to avoid multiple writes to the same doc in a batch
            const empUpdates = new Map<string, any>();
            
            // Chunk logs into groups of 200 to stay well below the 500 write limit
            const chunkSize = 200;
            for (let i = 0; i < logs.length; i += chunkSize) {
                const chunk = logs.slice(i, i + chunkSize);
                const batch = writeBatch(db!);
                
                for (const log of chunk) {
                    const id = generateId();
                    const data: TimeLog = { ...log, id, synced: true };
                    processedLogs.push(data);

                    // Ensure valid date
                    const parsedDate = new Date(data.timestamp);
                    const validTimestamp = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

                    // Log entry
                    const logRef = doc(collection(db!, logCol));
                    batch.set(logRef, {
                        ...data,
                        timestamp: validTimestamp // Save as string
                    });
                    data.id = logRef.id;

                    empUpdates.set(data.employeeId, {
                        status: data.type === 'LEAVE' ? 'OUT' : data.type,
                        lastAction: data.timestamp
                    });
                }
                
                // Add employee updates to this batch (unique per employee)
                empUpdates.forEach((updateData, empId) => {
                    batch.set(doc(db!, empCol, empId), updateData, { merge: true });
                });
                
                await batch.commit();
                empUpdates.clear(); // Clear for next chunk
            }
        } catch (e) {
            console.error('Error in bulk manual logs:', e);
            throw e; // Re-throw to prevent local cache update on failure
        }
    }

    // Update local logs cache
    const localLogs = JSON.parse(localStorage.getItem(localLogKey) || '[]');
    processedLogs.forEach(l => localLogs.unshift(l));
    localStorage.setItem(localLogKey, JSON.stringify(localLogs.slice(0, 2000)));

    // Update local employees cache
    try {
        const localEmployees = JSON.parse(localStorage.getItem(localEmpKey) || '[]');
        processedLogs.forEach(log => {
            const idx = localEmployees.findIndex((e: any) => e.id === log.employeeId);
            if (idx >= 0) {
                localEmployees[idx].status = log.type === 'LEAVE' ? 'OUT' : log.type;
                localEmployees[idx].lastAction = log.timestamp;
            }
        });
        localStorage.setItem(localEmpKey, JSON.stringify(localEmployees));
    } catch (e) { console.error(e); }
}

/**
 * Delete a time log
 */
export async function deleteTimeLog(logId: string): Promise<void> {
    const { doc, updateDoc } = await import('firebase/firestore');
    const logCol = getCol(BASE_LOG_COLLECTION);
    if (isFirebaseConfigured() && db) {
        try {
            // 1. Try deleting from the current store-specific collection
            try {
                await updateDoc(doc(db, logCol, logId), {
                    isDeleted: true
                });
            } catch (e) {
                // 2. Fallback: Try deleting from root collection if it was a legacy log
                await updateDoc(doc(db, BASE_LOG_COLLECTION, logId), {
                    isDeleted: true
                });
            }
            
            // Clean up local if it exists
            const localLogKey = getKey(BASE_LOCAL_LOG_KEY);
            const localData = localStorage.getItem(localLogKey);
            if (localData) {
                const logs: TimeLog[] = JSON.parse(localData);
                const filtered = logs.filter(l => l.id !== logId);
                localStorage.setItem(localLogKey, JSON.stringify(filtered));
            }
        } catch (e: any) {
            console.error('Error deleting log:', e);
            if (typeof window !== 'undefined') {
                alert('Failed to delete log! Error: ' + (e.message || 'Unknown error'));
            }
        }
    }
}

export async function deleteTimeLogsBulk(logIds: string[]): Promise<void> {
    if (logIds.length === 0) return;
    const logCol = getCol(BASE_LOG_COLLECTION);
    const prefix = getStorePrefix();

    if (isFirebaseConfigured() && db) {
        try {
            const { deleteDoc, doc } = await import('firebase/firestore');
            
            let deletedCount = 0;
            const CHUNK_SIZE = 50;
            for (let i = 0; i < logIds.length; i += CHUNK_SIZE) {
                const chunk = logIds.slice(i, i + CHUNK_SIZE);
                const deletePromises = chunk.map(async (id) => {
                    // Direct hard delete from store collection
                    await deleteDoc(doc(db!, logCol, id)).catch(() => {});
                    
                    // Direct hard delete from root collection
                    if (prefix) {
                        await deleteDoc(doc(db!, BASE_LOG_COLLECTION, id)).catch(() => {});
                    }
                    deletedCount++;
                });
                await Promise.allSettled(deletePromises);
            }
            
            if (typeof window !== 'undefined') {
                alert(`Successfully deleted ${logIds.length} logs forever from cloud storage.`);
            }
        } catch (e: any) {
            console.error('Bulk delete error:', e);
            if (typeof window !== 'undefined') alert('Delete Error: ' + e.message);
        }
    }
}



export async function deleteEmployee(id: string): Promise<void> {
    const empCol = getCol(BASE_EMP_COLLECTION);
    const localEmpKey = getKey(BASE_LOCAL_EMP_KEY);
    const prefix = getStorePrefix();

    if (isFirebaseConfigured() && db) {
        try {
            const { deleteDoc, doc } = await import('firebase/firestore');
            // 1. Delete from current (prefixed) collection
            await deleteDoc(doc(db, empCol, id));
            
            // 2. Fallback safety
            if (prefix) {
                await deleteDoc(doc(db, BASE_EMP_COLLECTION, id)).catch(() => {});
            }
        } catch (e) { console.error('Error deleting employee:', e); }
    }
    const employees = await getEmployees();
    const filtered = employees.filter(e => e.id !== id);
    localStorage.setItem(localEmpKey, JSON.stringify(filtered));
}

/**
 * Record a salary payment
 */
export async function recordPayment(payment: Partial<EmployeePayment>): Promise<EmployeePayment> {
    const payCol = getCol(BASE_PAY_COLLECTION);
    const localPayKey = getKey(BASE_LOCAL_PAY_KEY);

    const data: EmployeePayment = {
        id: generateId(),
        employeeId: payment.employeeId!,
        amount: payment.amount || 0,
        date: payment.date || new Date().toISOString(),
        notes: payment.notes || ''
    };

    if (isFirebaseConfigured() && db) {
        try {
            const docRef = await addDoc(collection(db, payCol), {
                ...data,
                date: Timestamp.fromDate(new Date(data.date))
            });
            data.id = docRef.id;
        } catch (e) {
            console.error('Error saving payment to Firebase:', e);
        }
    }

    // Local cache
    const localPayments = JSON.parse(localStorage.getItem(localPayKey) || '[]');
    localPayments.unshift(data);
    localStorage.setItem(localPayKey, JSON.stringify(localPayments.slice(0, 1000)));

    return data;
}

/**
 * Get payments for an employee
 */
export async function getEmployeePayments(employeeId: string): Promise<EmployeePayment[]> {
    const payCol = getCol(BASE_PAY_COLLECTION);
    const localPayKey = getKey(BASE_LOCAL_PAY_KEY);

    if (isFirebaseConfigured() && db) {
        try {
            // Remove orderBy to prevent need for composite index in Firebase
            const q = query(collection(db, payCol), where('employeeId', '==', employeeId));
            const snapshot = await getDocs(q);
            const payments: EmployeePayment[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                payments.push({
                    ...data,
                    id: doc.id,
                    // Handle both Timestamp and string formats
                    date: data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date
                } as EmployeePayment);
            });

            // Sort payments locally (descending by date)
            return payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } catch (e) {
            console.error('Error fetching payments:', e);
        }
    }

    const localData = localStorage.getItem(localPayKey);
    const allPayments: EmployeePayment[] = localData ? JSON.parse(localData) : [];
    return allPayments.filter(p => p.employeeId === employeeId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Delete a salary payment
 */
export async function deleteEmployeePayment(paymentId: string): Promise<void> {
    const payCol = getCol(BASE_PAY_COLLECTION);
    const localPayKey = getKey(BASE_LOCAL_PAY_KEY);
    const prefix = getStorePrefix();

    if (isFirebaseConfigured() && db) {
        try {
            const { deleteDoc } = await import('firebase/firestore');
            // 1. Current
            await deleteDoc(doc(db, payCol, paymentId));
            
            // 2. Legacy root
            if (prefix) {
                await deleteDoc(doc(db, BASE_PAY_COLLECTION, paymentId)).catch(() => {});
            }
        } catch (e) { console.error('Error deleting payment:', e); }
    }

    const localPayments = JSON.parse(localStorage.getItem(localPayKey) || '[]');
    const filtered = localPayments.filter((p: any) => p.id !== paymentId);
    localStorage.setItem(localPayKey, JSON.stringify(filtered));
}

export async function migrateLegacyLogs(): Promise<void> {
    const prefix = getStorePrefix();
    if (!prefix || !isFirebaseConfigured() || !db) return;

    const migrationKey = `has_migrated_logs_${prefix}`;
    const sessionKey = `migration_attempted_${prefix}`;
    
    if (typeof window !== 'undefined') {
        if (localStorage.getItem(migrationKey) || (window as any)[sessionKey]) {
            return; // Already migrated or tried this session
        }
        (window as any)[sessionKey] = true;
    }

    try {
        const { collection, getDocs, writeBatch, doc } = await import('firebase/firestore');
        const logCol = getCol(BASE_LOG_COLLECTION);

        console.log('Starting legacy log migration...');
        const rootSnapshot = await getDocs(collection(db!, BASE_LOG_COLLECTION));
        
        if (rootSnapshot.empty) {
            if (typeof window !== 'undefined') localStorage.setItem(migrationKey, 'true');
            return;
        }

        const logsToMigrate: any[] = [];
        rootSnapshot.forEach(logDoc => {
            const data = logDoc.data();
            if (!data.isDeleted) {
                logsToMigrate.push({ id: logDoc.id, ...data });
            }
        });

        // Optimization to prevent Quota Exhaustion: 
        // Only migrate logs that DO NOT already exist in the new collection
        const existingQ = await getDocs(collection(db!, logCol));
        const existingIds = new Set(existingQ.docs.map(d => d.id));
        const filteredLogsToMigrate = logsToMigrate.filter(l => !existingIds.has(l.id));

        if (filteredLogsToMigrate.length === 0) {
            console.log('No new legacy logs to migrate. Skipping writes.');
            if (typeof window !== 'undefined') localStorage.setItem(migrationKey, 'true');
            return;
        }

        // Chunk migration to bypass 500 write limit
        const chunkSize = 250;
        for (let i = 0; i < filteredLogsToMigrate.length; i += chunkSize) {
            const chunk = filteredLogsToMigrate.slice(i, i + chunkSize);
            const batch = writeBatch(db!);
            
            for (const log of chunk) {
                batch.set(doc(db!, logCol, log.id), log);
            }
            
            try {
                await batch.commit();
            } catch (e: any) {
                console.error('Migration batch failed:', e);
                if (typeof window !== 'undefined') alert("Migration Error: " + e.message);
            }
        }

        console.log(`Successfully migrated ${logsToMigrate.length} legacy logs.`);
        if (typeof window !== 'undefined') localStorage.setItem(migrationKey, 'true');
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

/**
 * Count unique work days for an employee
 */
export async function getWorkDays(employeeId: string, preFetchedLogs?: TimeLog[], employeeName?: string): Promise<number> {
    const logCol = getCol(BASE_LOG_COLLECTION);
    const localLogKey = getKey(BASE_LOCAL_LOG_KEY);
    const prefix = getStorePrefix();

    if (preFetchedLogs) {
        const employeeLogs = preFetchedLogs.filter(l => 
            (l.employeeId === employeeId || (employeeName && l.employeeName === employeeName)) && 
            l.type === 'IN' && 
            !l.isDeleted
        );
        const uniqueDays = new Set(employeeLogs.map(l => {
            const date = new Date(l.timestamp);
            return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        }));
        return uniqueDays.size;
    }

    if (isFirebaseConfigured() && db) {
        try {
            // Query Firebase directly for all time logs for this employee
            const q = query(
                collection(db!, logCol),
                where('employeeId', '==', employeeId)
            );
            const snapshot = await getDocs(q);
            const employeeLogs: TimeLog[] = [];

            snapshot.forEach(logDoc => {
                const data = logDoc.data();
                if (data.type === 'IN' && !data.isDeleted) { // Filter locally to avoid index requirement
                    employeeLogs.push({
                        ...data,
                        id: logDoc.id,
                        timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp
                    } as TimeLog);
                }
            });

            // Root fallback removed completely to ensure payroll matches visible logs

            const uniqueDays = new Set(employeeLogs.map(l => {
                const date = new Date(l.timestamp);
                return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            }));

            return uniqueDays.size;
        } catch (e) {
            console.error('Error fetching work days from Firebase:', e);
            // Fall back to local if Firebase fails
        }
    }

    // Fallback if no Firebase or error
    const localData = localStorage.getItem(localLogKey);
    const allLogs: TimeLog[] = localData ? JSON.parse(localData) : [];

    const employeeLogs = allLogs.filter(l => l.employeeId === employeeId && l.type === 'IN');

    const uniqueDays = new Set(employeeLogs.map(l => {
        const date = new Date(l.timestamp);
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }));

    return uniqueDays.size;
}

/**
 * MIGRATE LEGACY DATA (One-time tool)
 * Moves employees and logs from root to the current store prefix
 */
export async function migrateLegacyData(): Promise<{ employees: number, logs: number }> {
    if (!isFirebaseConfigured() || !db) return { employees: 0, logs: 0 };
    
    const prefix = getStorePrefix();
    if (!prefix) return { employees: 0, logs: 0 }; // Cannot migrate to root

    let empCount = 0;
    let logCount = 0;

    try {
        // 1. Migrate Employees
        const empSnapshot = await getDocs(collection(db, BASE_EMP_COLLECTION));
        for (const empDoc of empSnapshot.docs) {
            const data = empDoc.data();
            if (!data.storeId || data.storeId === getCurrentStoreId()) {
                await setDoc(doc(db, getCol(BASE_EMP_COLLECTION), empDoc.id), data, { merge: true });
                empCount++;
            }
        }

        // 2. Migrate Logs
        const logSnapshot = await getDocs(query(collection(db, BASE_LOG_COLLECTION), limit(200)));
        for (const logDoc of logSnapshot.docs) {
            await setDoc(doc(db, getCol(BASE_LOG_COLLECTION), logDoc.id), logDoc.data(), { merge: true });
            logCount++;
        }
    } catch (e) {
        console.error('Migration error:', e);
    }

    return { employees: empCount, logs: logCount };
}

export async function clearDatabaseCache(): Promise<void> {
    if (typeof window !== 'undefined') {
        try {
            // 1. Wipe ONLY log and temporary data, NOT the store identity
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                const isIdentityKey = key.includes('store_id') || key.includes('user_role') || key.includes('pin') || key.includes('auth');
                if ((key.includes('mns_') || key.includes('has_migrated_')) && !isIdentityKey) {
                    localStorage.removeItem(key);
                }
            });

            // 2. Clear Firestore IndexedDB if it exists
            if (db) {
                const { terminate, clearIndexedDbPersistence } = await import('firebase/firestore');
                await terminate(db);
                await clearIndexedDbPersistence(db);
            }
            
            window.location.reload();
        } catch (e) {
            console.error('Failed to clear cache:', e);
            window.location.reload();
        }
    }
}
