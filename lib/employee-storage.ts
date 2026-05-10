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
import { db, isFirebaseConfigured } from './firebase';

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

    const employees = await getEmployees();
    const employee = employees.find(e => {
        const cleanId = identifier.trim().toLowerCase();
        const empIdStr = (e.empId || '').toLowerCase();
        
        const numericId = empIdStr.replace(/\D/g, '');
        const cleanNumeric = cleanId.replace(/\D/g, '');

        return empIdStr === cleanId ||
            empIdStr === `emp${cleanId}` ||
            empIdStr === `emp-${cleanId}` ||
            (numericId !== '' && cleanNumeric !== '' && numericId === cleanNumeric && cleanNumeric === cleanId) || 
            e.phone === cleanId ||
            (e.email || '').toLowerCase() === cleanId;
    });

    if (!employee) throw new Error('Employee not found');

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

            // FALLBACK ONLY: If no logs in prefixed collection, show root logs (but DON'T auto-migrate/re-upload)
            if (logs.length === 0) {
                const rootQ = query(collection(db!, BASE_LOG_COLLECTION), orderBy('timestamp', 'desc'), limit(limitCount));
                const rootSnapshot = await getDocs(rootQ);
                rootSnapshot.forEach(logDoc => {
                    const data = logDoc.data();
                    let timestamp = data.timestamp;
                    if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                        timestamp = data.timestamp.toDate().toISOString();
                    }
                    logs.push({ id: logDoc.id, ...data, timestamp } as TimeLog);
                });
            }

            // Update local backup cache whenever fetched from firebase
            if (typeof window !== 'undefined' && isFirebaseConfigured() && db) {
                // Fetch the last few cloud logs to avoid duplicating very recent syncs
                const q = query(collection(db, logCol), orderBy('timestamp', 'desc'), limit(10));
                const snapshot = await getDocs(q);
                const cloudIds = new Set(snapshot.docs.map(doc => doc.id));

                const localLogs: TimeLog[] = JSON.parse(localStorage.getItem(localLogKey) || '[]');
                let hasSyncChanges = false;

                // Optimization: Only scan the most recent 20 local logs to avoid lag on mobile
                const recentLogs = localLogs.slice(0, 20);
                const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
                
                for (const l of recentLogs) {
                    // Only auto-sync true orphaned offline logs (short IDs) 
                    // that were created recently (last 24h) and aren't marked synced.
                    const logTime = new Date(l.timestamp).getTime();
                    if (l.id && l.id.length < 15 && !l.synced && logTime > oneDayAgo) {
                        try {
                            const { setDoc: syncSetDoc, doc: syncDoc, Timestamp: syncTimestamp } = require('firebase/firestore');
                            await syncSetDoc(syncDoc(db!, logCol, l.id), {
                                ...l,
                                synced: true, 
                                timestamp: l.timestamp ? syncTimestamp.fromDate(new Date(l.timestamp)) : syncTimestamp.now()
                            }, { merge: true });
                            
                            console.log(`Synced orphaned log ${l.id} to cloud.`);
                            l.synced = true;
                            hasSyncChanges = true;
                        } catch (err: any) {
                            console.warn('Background sync failed for log:', l.id, err);
                        }
                    }
                }
                
                if (hasSyncChanges) {
                    localStorage.setItem(localLogKey, JSON.stringify(localLogs));
                    await getEmployees();
                }
            }
                
            // MANUAL SORTING: This replaces the Firestore orderBy and is 100% reliable.
            logs.sort((a, b) => {
                const dateA = new Date(a.timestamp || 0).getTime();
                const dateB = new Date(b.timestamp || 0).getTime();
                if (isNaN(dateA)) return 1;
                if (isNaN(dateB)) return -1;
                return dateB - dateA;
            });

            if (typeof window !== 'undefined') {
                localStorage.setItem(localLogKey, JSON.stringify(logs.slice(0, 1000)));
            }

            return logs;
        } catch (e) {
            console.error('Error in getTimeLogs:', e);
            if (typeof window !== 'undefined') {
                return JSON.parse(localStorage.getItem(localLogKey) || '[]');
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
        
        // Update local cache
        const localLogKey = getKey(BASE_LOCAL_LOG_KEY);
        localStorage.setItem(localLogKey, JSON.stringify(logs.slice(0, 1000)));

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
            await updateDoc(doc(db!, empCol, data.employeeId), {
                status: data.type === 'LEAVE' ? 'OUT' : data.type,
                lastAction: data.timestamp
            });
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
            const batch = writeBatch(db!);
            
            for (const log of logs) {
                const id = generateId();
                const data: TimeLog = { ...log, id, synced: true };
                processedLogs.push(data);

                // Log entry
                const logRef = doc(collection(db!, logCol));
                batch.set(logRef, {
                    ...data,
                    timestamp: Timestamp.fromDate(new Date(data.timestamp))
                });
                data.id = logRef.id;

                // Update employee status
                batch.update(doc(db!, empCol, data.employeeId), {
                    status: data.type === 'LEAVE' ? 'OUT' : data.type,
                    lastAction: data.timestamp
                });
            }
            
            await batch.commit();
        } catch (e) {
            console.error('Error in bulk manual logs:', e);
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
    await deleteTimeLogsBulk([logId]);
}

/**
 * Bulk delete time logs (Optimized for performance)
 */
export async function deleteTimeLogsBulk(logIds: string[]): Promise<void> {
    if (logIds.length === 0) return;

    const logCol = getCol(BASE_LOG_COLLECTION);
    const localLogKey = getKey(BASE_LOCAL_LOG_KEY);
    const prefix = getStorePrefix();

    if (isFirebaseConfigured() && db) {
        try {
            const { writeBatch, doc } = await import('firebase/firestore');
            const batch = writeBatch(db!);
            
            for (const id of logIds) {
                // 1. Delete from current (prefixed) collection
                batch.delete(doc(db!, logCol, id));
                
                // 2. If we have a prefix, also try to delete from the root collection
                if (prefix) {
                    batch.delete(doc(db!, BASE_LOG_COLLECTION, id));
                }
            }
            
            await batch.commit();
        } catch (e) { 
            console.error('Error in bulk deletion:', e); 
            // Fallback: If batch fails, try individual deletes as last resort
            if (logIds.length === 1) {
                try {
                    const { deleteDoc, doc } = await import('firebase/firestore');
                    await deleteDoc(doc(db!, logCol, logIds[0]));
                } catch (err) { console.error('Individual delete fallback failed:', err); }
            }
        }
    }

    // Update local logs cache
    const localLogs = JSON.parse(localStorage.getItem(localLogKey) || '[]');
    const idSet = new Set(logIds);
    const filtered = localLogs.filter((l: any) => !idSet.has(l.id));
    localStorage.setItem(localLogKey, JSON.stringify(filtered));
}

export async function deleteEmployee(id: string): Promise<void> {
    const empCol = getCol(BASE_EMP_COLLECTION);
    const localEmpKey = getKey(BASE_LOCAL_EMP_KEY);
    const prefix = getStorePrefix();

    if (isFirebaseConfigured() && db) {
        try {
            const { deleteDoc } = await import('firebase/firestore');
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

/**
 * Count unique work days for an employee
 */
export async function getWorkDays(employeeId: string): Promise<number> {
    const logCol = getCol(BASE_LOG_COLLECTION);
    const localLogKey = getKey(BASE_LOCAL_LOG_KEY);
    const prefix = getStorePrefix();

    if (isFirebaseConfigured() && db) {
        try {
            // Query Firebase directly for all time logs for this employee
            const q = query(
                collection(db, logCol),
                where('employeeId', '==', employeeId),
                where('type', '==', 'IN')
            );
            const snapshot = await getDocs(q);
            const employeeLogs: TimeLog[] = [];

            snapshot.forEach(logDoc => {
                const data = logDoc.data();
                employeeLogs.push({
                    ...data,
                    id: logDoc.id,
                    timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp
                } as TimeLog);
            });

            // FALLBACK: If no logs in prefixed collection, check the root collection
            if (employeeLogs.length === 0 && prefix) {
                const rootQ = query(
                    collection(db!, BASE_LOG_COLLECTION),
                    where('employeeId', '==', employeeId),
                    where('type', '==', 'IN')
                );
                const rootSnapshot = await getDocs(rootQ);
                rootSnapshot.forEach(logDoc => {
                    const data = logDoc.data();
                    employeeLogs.push({
                        ...data,
                        id: logDoc.id,
                        timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp
                    } as TimeLog);
                });
            }

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
