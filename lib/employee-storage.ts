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
}

export interface TimeLog {
    id: string;
    employeeId: string;
    employeeName: string;
    type: 'IN' | 'OUT';
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

const EMP_COLLECTION = 'employees';
const LOG_COLLECTION = 'timelogs';
const PAY_COLLECTION = 'employeepayments';
const LOCAL_EMP_KEY = 'mns_employees_local';
const LOCAL_LOG_KEY = 'mns_timelogs_local';
const LOCAL_PAY_KEY = 'mns_payments_local';

/**
 * Generate unique IDs for local use
 */
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Get all employees
 */
export async function getEmployees(): Promise<Employee[]> {
    if (typeof window === 'undefined') return [];

    if (isFirebaseConfigured() && db) {
        try {
            const snapshot = await getDocs(collection(db, EMP_COLLECTION));
            const employees: Employee[] = [];
            snapshot.forEach(doc => {
                employees.push({ id: doc.id, ...doc.data() } as Employee);
            });
            localStorage.setItem(LOCAL_EMP_KEY, JSON.stringify(employees));
            return employees;
        } catch (e) {
            console.error('Error fetching employees from Firebase:', e);
        }
    }

    const localData = localStorage.getItem(LOCAL_EMP_KEY);
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

    if (isFirebaseConfigured() && db) {
        try {
            if (isNew) {
                const docRef = await addDoc(collection(db, EMP_COLLECTION), data);
                data.id = docRef.id;
            } else {
                await updateDoc(doc(db, EMP_COLLECTION, employee.id!), data);
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
    localStorage.setItem(LOCAL_EMP_KEY, JSON.stringify(employees));

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
    const employees = await getEmployees();
    const employee = employees.find(e =>
        e.empId === identifier ||
        e.phone === identifier ||
        e.email === identifier
    );

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

    if (isFirebaseConfigured() && db) {
        try {
            // Log entry
            const logRef = await addDoc(collection(db, LOG_COLLECTION), {
                ...log,
                timestamp: Timestamp.fromDate(new Date())
            });
            log.id = logRef.id;

            // Update status in cloud
            await updateDoc(doc(db, EMP_COLLECTION, employee.id), {
                status: nextType,
                lastAction: now
            });
        } catch (e) {
            console.error('Firebase clock error:', e);
        }
    }

    // Update local cache
    const allEmps = employees.map(e => e.id === employee.id ? employee : e);
    localStorage.setItem(LOCAL_EMP_KEY, JSON.stringify(allEmps));

    // Append to local logs
    const localLogs = JSON.parse(localStorage.getItem(LOCAL_LOG_KEY) || '[]');
    localLogs.unshift(log);
    localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(localLogs.slice(0, 1000)));

    return { employee, log };
}

/**
 * Get recent time logs
 */
export async function getTimeLogs(limitCount = 50): Promise<TimeLog[]> {
    if (isFirebaseConfigured() && db) {
        try {
            const q = query(collection(db, LOG_COLLECTION), orderBy('timestamp', 'desc'), limit(limitCount));
            const snapshot = await getDocs(q);
            const logs: TimeLog[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                logs.push({
                    ...data,
                    id: doc.id,
                    timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp
                } as TimeLog);
            });
            return logs;
        } catch (e) {
            console.error('Error fetching logs:', e);
        }
    }

    const localData = localStorage.getItem(LOCAL_LOG_KEY);
    return localData ? JSON.parse(localData) : [];
}

export async function deleteEmployee(id: string): Promise<void> {
    if (isFirebaseConfigured() && db) {
        try {
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, EMP_COLLECTION, id));
        } catch (e) { console.error(e); }
    }
    const employees = await getEmployees();
    const filtered = employees.filter(e => e.id !== id);
    localStorage.setItem(LOCAL_EMP_KEY, JSON.stringify(filtered));
}

/**
 * Record a salary payment
 */
export async function recordPayment(payment: Partial<EmployeePayment>): Promise<EmployeePayment> {
    const data: EmployeePayment = {
        id: generateId(),
        employeeId: payment.employeeId!,
        amount: payment.amount || 0,
        date: payment.date || new Date().toISOString(),
        notes: payment.notes || ''
    };

    if (isFirebaseConfigured() && db) {
        try {
            const docRef = await addDoc(collection(db, PAY_COLLECTION), data);
            data.id = docRef.id;
        } catch (e) {
            console.error('Error saving payment to Firebase:', e);
        }
    }

    // Local cache
    const localPayments = JSON.parse(localStorage.getItem(LOCAL_PAY_KEY) || '[]');
    localPayments.unshift(data);
    localStorage.setItem(LOCAL_PAY_KEY, JSON.stringify(localPayments.slice(0, 1000)));

    return data;
}

/**
 * Get payments for an employee
 */
export async function getEmployeePayments(employeeId: string): Promise<EmployeePayment[]> {
    if (isFirebaseConfigured() && db) {
        try {
            const q = query(collection(db, PAY_COLLECTION), where('employeeId', '==', employeeId), orderBy('date', 'desc'));
            const snapshot = await getDocs(q);
            const payments: EmployeePayment[] = [];
            snapshot.forEach(doc => {
                payments.push({ id: doc.id, ...doc.data() } as EmployeePayment);
            });
            return payments;
        } catch (e) {
            console.error('Error fetching payments:', e);
        }
    }

    const localData = localStorage.getItem(LOCAL_PAY_KEY);
    const allPayments: EmployeePayment[] = localData ? JSON.parse(localData) : [];
    return allPayments.filter(p => p.employeeId === employeeId);
}

/**
 * Count unique work days for an employee
 */
export async function getWorkDays(employeeId: string): Promise<number> {
    // We need all logs for this employee to count unique dates
    // For now, let's fetch a large batch or all from local
    const localData = localStorage.getItem(LOCAL_LOG_KEY);
    const allLogs: TimeLog[] = localData ? JSON.parse(localData) : [];

    // In production with Firebase, you might want a more specific query
    const employeeLogs = allLogs.filter(l => l.employeeId === employeeId && l.type === 'IN');

    const uniqueDays = new Set(employeeLogs.map(l => {
        const date = new Date(l.timestamp);
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }));

    return uniqueDays.size;
}
