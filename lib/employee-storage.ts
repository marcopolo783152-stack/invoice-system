import { getStorePrefix } from './user-storage';

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
    Timestamp
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

export const getCol = (col: string) => col;
export const getKey = (key: string) => key;

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

    if (isFirebaseConfigured() && db) {
        try {
            const snapshot = await getDocs(collection(db, colName));
            const employees: Employee[] = [];
            snapshot.forEach(doc => {
                employees.push({ id: doc.id, ...doc.data() } as Employee);
            });
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
            const logRef = await addDoc(collection(db, logCol), {
                ...log,
                timestamp: Timestamp.fromDate(new Date())
            });
            log.id = logRef.id;

            // Update status in cloud
            const updateFields: any = {
                status: nextType,
                lastAction: now
            };
            if (setsPhoto) updateFields.photo = facePhoto;

            await updateDoc(doc(db, empCol, employee.id), updateFields);
        } catch (e) {
            console.error('Firebase clock error:', e);
        }
    }

    // Update local cache
    const allEmps = employees.map(e => e.id === employee.id ? employee : e);
    localStorage.setItem(localEmpKey, JSON.stringify(allEmps));

    // Append to local logs
    const localLogs = JSON.parse(localStorage.getItem(localLogKey) || '[]');
    localLogs.unshift(log);
    localStorage.setItem(localLogKey, JSON.stringify(localLogs.slice(0, 1000)));

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
                     localStorage.setItem(localLogKey, JSON.stringify(localLogs.slice(0, 1000)));
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
                localStorage.setItem(localLogKey, JSON.stringify(localLogs.slice(0, 1000)));
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
export async function getTimeLogs(limitCount = 50): Promise<TimeLog[]> {
    const logCol = getCol(BASE_LOG_COLLECTION);
    const localLogKey = getKey(BASE_LOCAL_LOG_KEY);

    if (isFirebaseConfigured() && db) {
        try {
            // ADDED orderBy: Without it, limit() returns an arbitrary subset, not the newest logs!
            // This is a simple query (no 'where' clauses), so it does NOT require a composite index.
            const q = query(collection(db, logCol), orderBy('timestamp', 'desc'), limit(limitCount));
            const snapshot = await getDocs(q);
            const logs: TimeLog[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Robust timestamp conversion
                let timestamp = data.timestamp;
                if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                    timestamp = data.timestamp.toDate().toISOString();
                } else if (data.timestamp && data.timestamp.seconds) {
                    timestamp = new Date(data.timestamp.seconds * 1000).toISOString();
                }

                logs.push({
                    ...data,
                    id: doc.id,
                    timestamp: timestamp
                } as TimeLog);
            });

            // Update local backup cache whenever fetched from firebase
            if (typeof window !== 'undefined') {
                const local = JSON.parse(localStorage.getItem(localLogKey) || '[]');
                const cloudMap = new Map(logs.map(l => [l.id, l]));
                let syncedOrphans = false;
                
                for (const l of local) {
                    // Local IDs are 9 characters, Firebase IDs are 20. 
                    // Only auto-sync true orphaned offline logs, not just old logs that weren't in the top 50.
                    if (!cloudMap.has(l.id) && l.id.length < 15) {
                        logs.push(l); // Keep orphaned local timelogs visible
                        // AUTO-SYNC TO FIREBASE: If it's local only, force push it to the cloud now
                        try {
                            const { setDoc, doc } = require('firebase/firestore');
                            setDoc(doc(db, logCol, l.id), {
                                ...l,
                                timestamp: l.timestamp ? new Date(l.timestamp) : new Date()
                            }, { merge: true }).catch((err: any) => console.warn('Background sync failed', err));
                            syncedOrphans = true;
                        } catch (e) {
                            console.warn('Could not auto-sync orphaned log', e);
                        }
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

                localStorage.setItem(localLogKey, JSON.stringify(logs.slice(0, 1000)));
            }
            return logs;
        } catch (e) {
            console.error('Error fetching logs:', e);
        }
    }

    const localData = localStorage.getItem(localLogKey);
    return localData ? JSON.parse(localData) : [];
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
            const logRef = await addDoc(collection(db, logCol), {
                ...data,
                timestamp: Timestamp.fromDate(new Date(data.timestamp))
            });
            data.id = logRef.id;

            // Admin manual log: Force update the employee status immediately
            await updateDoc(doc(db, empCol, data.employeeId), {
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
 * Delete a time log
 */
export async function deleteTimeLog(logId: string): Promise<void> {
    const logCol = getCol(BASE_LOG_COLLECTION);
    const localLogKey = getKey(BASE_LOCAL_LOG_KEY);

    if (isFirebaseConfigured() && db) {
        try {
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, logCol, logId));
        } catch (e) { console.error(e); }
    }

    const localLogs = JSON.parse(localStorage.getItem(localLogKey) || '[]');
    const filtered = localLogs.filter((l: any) => l.id !== logId);
    localStorage.setItem(localLogKey, JSON.stringify(filtered));
}

export async function deleteEmployee(id: string): Promise<void> {
    const empCol = getCol(BASE_EMP_COLLECTION);
    const localEmpKey = getKey(BASE_LOCAL_EMP_KEY);

    if (isFirebaseConfigured() && db) {
        try {
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, empCol, id));
        } catch (e) { console.error(e); }
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

    if (isFirebaseConfigured() && db) {
        try {
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, payCol, paymentId));
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

            snapshot.forEach(doc => {
                const data = doc.data();
                employeeLogs.push({
                    ...data,
                    id: doc.id,
                    timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp
                } as TimeLog);
            });

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
