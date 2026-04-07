'use client';

import React, { useState, useEffect, useRef } from 'react';
import { HistoryReportTemplate } from '@/components/HistoryReportTemplate';
import { generateReportPDFBlobUrl } from '@/lib/pdf-utils';
import { Loader2 } from 'lucide-react';
import {
    Employee,
    TimeLog,
    getEmployees,
    getTimeLogs,
    deleteEmployee,
    EmployeePayment,
    recordPayment,
    getEmployeePayments,
    addManualTimeLog,
    deleteTimeLog,
    checkAutoClockOut,
    updateTimeLog,
    deleteEmployeePayment
} from '@/lib/employee-storage';
import EmployeeModal from '@/components/EmployeeModal';
import Link from 'next/link';

interface PayrollSummary {
    employeeId: string;
    daysWorked: number;
    totalEarned: number;
    totalPaid: number;
    balance: number;
}

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [logs, setLogs] = useState<TimeLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
    const [activeView, setActiveView] = useState<'STAFF' | 'LOGS' | 'PAYROLL'>('STAFF');
    const [payrollData, setPayrollData] = useState<Record<string, PayrollSummary>>({});
    const [isPaying, setIsPaying] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // History Print State
    const [historyPrintData, setHistoryPrintData] = useState<{
        employee: Employee;
        logs: TimeLog[];
        payments: EmployeePayment[];
    } | null>(null);
    const historyPrintRef = useRef<HTMLDivElement>(null);
    const [isGeneratingHistory, setIsGeneratingHistory] = useState(false);
    const [reportRange, setReportRange] = useState<'WEEK' | 'MONTH' | 'YEAR' | 'ALL'>('ALL');

    // Manual Log State
    const [showManualLog, setShowManualLog] = useState<{ empId: string, name: string } | null>(null);
    const [manualDateStart, setManualDateStart] = useState(new Date().toISOString().split('T')[0]);
    const [manualDateEnd, setManualDateEnd] = useState(new Date().toISOString().split('T')[0]);
    const [excludedDates, setExcludedDates] = useState<Set<string>>(new Set());
    const [autoCompleteOut, setAutoCompleteOut] = useState(true);
    const [manualTime, setManualTime] = useState('10:00');
    const [manualType, setManualType] = useState<'IN' | 'OUT' | 'LEAVE'>('IN');
    const [isOvertime, setIsOvertime] = useState(false);

    // Edit Log State
    const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');

    // Payment History State
    const [viewingPaymentsFor, setViewingPaymentsFor] = useState<{ empId: string, name: string } | null>(null);
    const [employeePaymentsList, setEmployeePaymentsList] = useState<EmployeePayment[]>([]);

    // Multi-Select State
    const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
    const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
    const [showBulkManualLog, setShowBulkManualLog] = useState(false);

    const handlePrintHistory = async (emp: Employee) => {
        window.open(`/employees/print?type=history&id=${emp.id}&range=${reportRange}`, '_blank');
    };

    const handleBulkManualLog = async () => {
        if (selectedEmployees.size === 0) return;
        setIsLoading(true);
        const selected = employees.filter(e => selectedEmployees.has(e.id));
        const dates = getDatesInRange(manualDateStart, manualDateEnd);
        
        for (const emp of selected) {
            for (const date of dates) {
                if (excludedDates.has(date)) continue;
                
                const timestamp = `${date}T${manualTime}:00`;
                await addManualTimeLog({
                    employeeId: emp.id,
                    employeeName: emp.name,
                    type: manualType,
                    timestamp,
                    notes: isOvertime ? 'Overtime Work (Bulk Admin Action)' : 'Bulk Added by Administrator'
                });

                if (manualType === 'IN' && autoCompleteOut) {
                    const outTimestamp = `${date}T18:00:00`;
                    await addManualTimeLog({
                        employeeId: emp.id,
                        employeeName: emp.name,
                        type: 'OUT',
                        timestamp: outTimestamp,
                        notes: 'Auto-completed OUT shift (Bulk Admin Action)'
                    });
                }
            }
        }
        
        setShowBulkManualLog(false);
        setSelectedEmployees(new Set());
        setIsOvertime(false);
        setExcludedDates(new Set());
        await loadData();
    };

    const toggleEmployeeSelection = (id: string) => {
        const next = new Set(selectedEmployees);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedEmployees(next);
    };

    const selectAllFiltered = () => {
        if (selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0) {
            setSelectedEmployees(new Set());
        } else {
            setSelectedEmployees(new Set(filteredEmployees.map(e => e.id)));
        }
    };

    // Helper to get dates between start and end
    const getDatesInRange = (start: string, end: string) => {
        const dates = [];
        let curr = new Date(start);
        const last = new Date(end);
        
        // Add 12 hours to avoid timezone shifting issues when adding days
        curr.setHours(12, 0, 0, 0); 
        last.setHours(12, 0, 0, 0);

        while (curr <= last) {
            dates.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }
        return dates;
    };

    const handleManualLog = async () => {
        if (!showManualLog) return;
        setIsLoading(true);
        
        const dates = getDatesInRange(manualDateStart, manualDateEnd);
        
        for (const date of dates) {
            if (excludedDates.has(date)) continue;
            
            const timestamp = `${date}T${manualTime}:00`;
            await addManualTimeLog({
                employeeId: showManualLog.empId,
                employeeName: showManualLog.name,
                type: manualType,
                timestamp,
                notes: isOvertime ? 'Overtime Work (Added by Admin)' : 'Added by Administrator'
            });

            if (manualType === 'IN' && autoCompleteOut) {
                const outTimestamp = `${date}T18:00:00`;
                await addManualTimeLog({
                    employeeId: showManualLog.empId,
                    employeeName: showManualLog.name,
                    type: 'OUT',
                    timestamp: outTimestamp,
                    notes: 'Auto-completed OUT shift (Added by Admin)'
                });
            }
        }
        
        setShowManualLog(null);
        setIsOvertime(false);
        setExcludedDates(new Set());
        loadData();
    };

    const handleUpdateLog = async () => {
        if (!editingLog) return;
        const newTimestamp = `${editDate}T${editTime}:00`;
        await updateTimeLog(editingLog.id, {
            timestamp: newTimestamp,
            notes: (editingLog.notes || '') + ' (Edited by Admin)'
        });
        setEditingLog(null);
        loadData();
    };

    const handleDeleteLog = async (logId: string) => {
        if (!confirm('Remove this time log? This will affect payroll calculations.')) return;
        await deleteTimeLog(logId);
        loadData();
    };

    const checkShiftCompliance = (log: TimeLog) => {
        const date = new Date(log.timestamp);
        const hours = date.getHours();
        const mins = date.getMinutes();

        if (log.type === 'IN') {
            // Clock in between 10:00 AM and 10:15 AM
            const isLate = hours > 10 || (hours === 10 && mins > 15);
            const isEarly = hours < 10;
            if (isLate) return { label: 'LATE', color: '#f43f5e' };
            if (isEarly) return { label: 'EARLY', color: '#3b82f6' };
            return { label: 'ON TIME', color: '#10b981' };
        } else if (log.type === 'LEAVE') {
            return { label: 'DAY OFF', color: '#8b5cf6' };
        } else {
            // Clock out from 06:00 PM (18:00)
            const isEarly = hours < 18;
            if (isEarly) return { label: 'EARLY EXIT', color: '#f43f5e' };
            return { label: 'SHIFT DONE', color: '#10b981' };
        }
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [empList, logList] = await Promise.all([
                getEmployees(),
                getTimeLogs(500) // Fetch more for day counting
            ]);
            setEmployees(empList);
            setLogs(logList);

            // Calculate Payroll Summaries
            const summaryMap: Record<string, PayrollSummary> = {};

            for (const emp of empList) {
                // 1. Count unique work days from logs
                const empLogs = logList.filter(l => l.employeeId === emp.id && l.type === 'IN');
                const uniqueDays = new Set(empLogs.map(l => {
                    const date = new Date(l.timestamp);
                    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                })).size;

                // 2. Fetch payments
                const payments = await getEmployeePayments(emp.id);
                const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

                const totalEarned = uniqueDays * (emp.dailyRate || 0);

                summaryMap[emp.id] = {
                    employeeId: emp.id,
                    daysWorked: uniqueDays,
                    totalEarned,
                    totalPaid,
                    balance: totalEarned - totalPaid
                };
            }
            setPayrollData(summaryMap);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePayment = async (empId: string, amount: number) => {
        if (!amount || amount <= 0) return;
        if (!confirm(`Confirm payment of $${amount} to employee?`)) return;

        setIsPaying(empId);
        try {
            await recordPayment({
                employeeId: empId,
                amount: amount,
                notes: 'Manual payment from dashboard'
            });
            await loadData();
            // Refresh payment list if modal is open
            if (viewingPaymentsFor?.empId === empId) {
                const refreshed = await getEmployeePayments(empId);
                setEmployeePaymentsList(refreshed);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsPaying(null);
        }
    };

    const handleViewPayments = async (empId: string, name: string) => {
        setViewingPaymentsFor({ empId, name });
        const list = await getEmployeePayments(empId);
        setEmployeePaymentsList(list);
    };

    const handleDeletePayment = async (paymentId: string) => {
        if (!confirm('Are you sure you want to delete this payment? This will alter their balance.')) return;
        await deleteEmployeePayment(paymentId);
        await loadData();
        if (viewingPaymentsFor) {
            const list = await getEmployeePayments(viewingPaymentsFor.empId);
            setEmployeePaymentsList(list);
        }
    };

    useEffect(() => {
        const init = async () => {
            await checkAutoClockOut();
            loadData();
        };
        init();
    }, []);

    const handlePrintBadge = (emp: Employee) => {
        window.open(`/employees/print?type=badge&id=${emp.empId}`, '_blank');
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this employee? All logs will be preserved in the cloud.')) return;
        await deleteEmployee(id);
        loadData();
    };

    const formatDate = (iso: string) => {
        if (!iso) return '-';
        return new Date(iso).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.empId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredLogs = logs.filter(log =>
        log.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employees.find(e => e.id === log.employeeId)?.empId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '20px' }}>
            {/* Header */}
            <div style={{
                maxWidth: 1200, margin: '0 auto', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center', marginBottom: 30
            }}>
                <div>
                    <Link href="/" style={{ color: '#6366f1', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                        ← Back to Dashboard
                    </Link>
                    <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a' }}>HR Management</h1>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={() => {
                            setEditingEmp(null);
                            setIsModalOpen(true);
                        }}
                        className="luxury-button"
                        style={{ padding: '12px 24px', borderRadius: 12, background: 'linear-gradient(135deg, #4f46e5, #3b82f6)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                    >
                        ➕ Add Staff
                    </button>
                    <Link href="/clock" target="_blank" className="luxury-button" style={{
                        padding: '12px 24px', borderRadius: 12, border: '1px solid #e2e8f0',
                        background: '#fff', color: '#1e293b', fontWeight: 700, textDecoration: 'none',
                        display: 'flex', alignItems: 'center', gap: 8
                    }}>
                        🕒 Kiosk View
                    </Link>
                    <button
                        onClick={() => {
                            window.open('/employees/print?type=poster', '_blank');
                        }}
                        style={{ padding: '12px 24px', borderRadius: 12, border: '1px solid #6366f1', background: 'rgba(99, 102, 241, 0.05)', color: '#6366f1', fontWeight: 700, cursor: 'pointer' }}
                    >
                        🖨️ Print Shop QR
                    </button>
                </div>
            </div>

            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                {/* View Switcher */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 15 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            onClick={() => setActiveView('STAFF')}
                            style={{
                                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                                background: activeView === 'STAFF' ? '#e2e8f0' : 'transparent',
                                border: 'none', fontWeight: 700, color: activeView === 'STAFF' ? '#1e293b' : '#64748b'
                            }}
                        >
                            👥 Staff Directory
                        </button>
                        <button
                            onClick={() => setActiveView('LOGS')}
                            style={{
                                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                                background: activeView === 'LOGS' ? '#e2e8f0' : 'transparent',
                                border: 'none', fontWeight: 700, color: activeView === 'LOGS' ? '#1e293b' : '#64748b'
                            }}
                        >
                            📜 Activity Logs
                        </button>
                        <button
                            onClick={() => setActiveView('PAYROLL')}
                            style={{
                                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                                background: activeView === 'PAYROLL' ? '#e2e8f0' : 'transparent',
                                border: 'none', fontWeight: 700, color: activeView === 'PAYROLL' ? '#1e293b' : '#64748b'
                            }}
                        >
                            💰 Payroll & Payments
                        </button>
                    </div>

                    {activeView === 'STAFF' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Search by name or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        padding: '8px 12px 8px 36px',
                                        borderRadius: 10,
                                        border: '1px solid #e2e8f0',
                                        fontSize: 13,
                                        width: 250,
                                        outline: 'none',
                                        background: '#fff'
                                    }}
                                />
                                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Report Period:</span>
                                <select
                                    value={reportRange}
                                    onChange={(e) => setReportRange(e.target.value as any)}
                                    style={{
                                        padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                                        fontSize: 12, fontWeight: 700, color: '#1e293b', background: '#fff',
                                        outline: 'none', cursor: 'pointer'
                                    }}
                                >
                                    <option value="ALL">All History</option>
                                    <option value="WEEK">Last 7 Days (Weekly)</option>
                                    <option value="MONTH">Last 30 Days (Monthly)</option>
                                    <option value="YEAR">Last 365 Days (Yearly)</option>
                                </select>
                            </div>
                        </div>
                    )}
                    {activeView !== 'STAFF' && (
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    padding: '8px 12px 8px 36px',
                                    borderRadius: 10,
                                    border: '1px solid #e2e8f0',
                                    fontSize: 13,
                                    width: 250,
                                    outline: 'none',
                                    background: '#fff'
                                }}
                            />
                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                        </div>
                    )}
                </div>

                {activeView === 'STAFF' ? (
                    <>
                        {selectedEmployees.size > 0 && (
                            <div style={{
                                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                                padding: '16px 24px', borderRadius: 16, marginBottom: 20,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}>
                                <div style={{ color: '#fff', fontWeight: 700 }}>
                                    <span style={{ background: '#3b82f6', padding: '4px 10px', borderRadius: 20, marginRight: 10 }}>{selectedEmployees.size}</span>
                                    Employees Selected
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button 
                                        onClick={() => setShowBulkManualLog(true)}
                                        style={{ padding: '8px 16px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Bulk Clock In / Out
                                    </button>
                                    <button 
                                        onClick={() => setSelectedEmployees(new Set())}
                                        style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: '#cbd5e1', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Clear Selection
                                    </button>
                                </div>
                            </div>
                        )}

                        {showBulkManualLog && (
                            <div className="animate-in fade-in" style={{ padding: '20px', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: 16, marginBottom: 20 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 15, color: '#1e293b' }}>Bulk Update Logs ({selectedEmployees.size} Employees)</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 15, width: '100%' }}>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>FROM DATE</label>
                                            <input
                                                type="date"
                                                value={manualDateStart}
                                                onChange={(e) => setManualDateStart(e.target.value)}
                                                style={{ padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>TO DATE (Inclusive)</label>
                                            <input
                                                type="date"
                                                value={manualDateEnd}
                                                onChange={(e) => setManualDateEnd(e.target.value)}
                                                style={{ padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>TIME</label>
                                            <input
                                                type="time"
                                                value={manualTime}
                                                onChange={(e) => setManualTime(e.target.value)}
                                                style={{ padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>TYPE</label>
                                            <select
                                                value={manualType}
                                                onChange={(e) => setManualType(e.target.value as any)}
                                                style={{ padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                                            >
                                                <option value="IN">Clock In</option>
                                                <option value="OUT">Clock Out</option>
                                                <option value="LEAVE">Day Off / Leave</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    {/* Date checklist generator */}
                                    <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                        <label style={{ fontSize: 12, fontWeight: 800, color: '#334155', display: 'block', marginBottom: 10 }}>Select Working Days within Range:</label>
                                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                            {getDatesInRange(manualDateStart, manualDateEnd).map(date => {
                                                const d = new Date(date + 'T12:00:00');
                                                const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                                const isExcluded = excludedDates.has(date);
                                                return (
                                                    <div key={date} onClick={() => {
                                                        const newSet = new Set(excludedDates);
                                                        if (newSet.has(date)) newSet.delete(date);
                                                        else newSet.add(date);
                                                        setExcludedDates(newSet);
                                                    }} style={{ 
                                                        display: 'flex', alignItems: 'center', gap: 6, 
                                                        padding: '6px 12px', background: isExcluded ? '#f1f5f9' : '#ecfdf5',
                                                        border: isExcluded ? '1px solid #cbd5e1' : '1px solid #10b981',
                                                        borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                                        color: isExcluded ? '#64748b' : '#059669', transition: 'all 0.2s'
                                                    }}>
                                                        <div style={{ width: 14, height: 14, borderRadius: 3, border: isExcluded ? '2px solid #cbd5e1' : 'none', background: isExcluded ? 'transparent' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {!isExcluded && <span style={{ color: '#fff', fontSize: 9 }}>✓</span>}
                                                        </div>
                                                        {label}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 5 }}>
                                        {manualType === 'IN' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <input
                                                    type="checkbox"
                                                    id="bulk-autoComplete"
                                                    checked={autoCompleteOut}
                                                    onChange={e => setAutoCompleteOut(e.target.checked)}
                                                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                                                />
                                                <label htmlFor="bulk-autoComplete" style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', cursor: 'pointer' }}>+ Auto-generate 6:00 PM Clock-Out for each day</label>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <input
                                                type="checkbox"
                                                id="bulk-overtime"
                                                checked={isOvertime}
                                                onChange={e => setIsOvertime(e.target.checked)}
                                                style={{ width: 16, height: 16, cursor: 'pointer' }}
                                            />
                                            <label htmlFor="bulk-overtime" style={{ fontSize: 13, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Record as Overtime</label>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                        <button
                                            onClick={handleBulkManualLog}
                                            disabled={isLoading}
                                            style={{ padding: '10px 20px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', opacity: isLoading ? 0.7 : 1 }}
                                        >
                                            {isLoading ? 'Processing...' : `Apply Logs to ${selectedEmployees.size} Staff`}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowBulkManualLog(false);
                                                setExcludedDates(new Set());
                                            }}
                                            style={{ padding: '10px 20px', borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: 15, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button 
                                onClick={selectAllFiltered}
                                style={{ background: 'transparent', border: 'none', color: '#6366f1', fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                <div style={{ width: 16, height: 16, border: '2px solid #6366f1', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0 ? '#6366f1' : 'transparent' }}>
                                    {selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0 && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                                </div>
                                {selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0 ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
                        {filteredEmployees.map(emp => (
                            <div key={emp.id} className="luxury-card" style={{
                                background: '#fff', borderRadius: 16, padding: 24,
                                border: selectedEmployees.has(emp.id) ? '2px solid #6366f1' : '1px solid #e2e8f0', 
                                position: 'relative',
                                display: 'flex', gap: 16,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: selectedEmployees.has(emp.id) ? '0 4px 12px rgba(99, 102, 241, 0.15)' : 'none'
                            }} onClick={(e) => {
                                if ((e.target as HTMLElement).closest('button')) return;
                                toggleEmployeeSelection(emp.id);
                            }}>
                                <div style={{ position: 'absolute', top: 16, right: 16 }}>
                                    <div style={{
                                        width: 20, height: 20, borderRadius: 6,
                                        border: selectedEmployees.has(emp.id) ? 'none' : '2px solid #cbd5e1',
                                        background: selectedEmployees.has(emp.id) ? '#6366f1' : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}>
                                        {selectedEmployees.has(emp.id) && <span style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>✓</span>}
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 15 }}>
                                        <div style={{
                                            width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9',
                                            overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {emp.photo ? (
                                                <img src={emp.photo} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: 20 }}>👤</span>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <h3 style={{
                                                        fontSize: 17, fontWeight: 800, color: '#1e293b',
                                                        margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                                    }} title={emp.name}>
                                                        {emp.name}
                                                    </h3>
                                                    <span style={{ fontSize: 10, background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, color: '#64748b', fontWeight: 700 }}>
                                                        ID: {emp.empId}
                                                    </span>
                                                </div>
                                                <span style={{
                                                    padding: '3px 8px', borderRadius: 20, fontSize: 9, fontWeight: 900,
                                                    background: emp.status === 'IN' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                                    color: emp.status === 'IN' ? '#10b981' : '#f43f5e',
                                                    border: `1px solid ${emp.status === 'IN' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`,
                                                    flexShrink: 0
                                                }}>
                                                    {emp.status === 'IN' ? 'IN' : 'OUT'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 15, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#64748b' }}>
                                        <div style={{ display: 'flex', gap: 8 }}>📞 {emp.phone}</div>
                                        {emp.email && <div style={{ display: 'flex', gap: 8 }}>✉️ {emp.email}</div>}
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                            Last action: {formatDate(emp.lastAction || '')}
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                                        <button
                                            onClick={() => handlePrintBadge(emp)}
                                            style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #4f46e5', background: 'rgba(79, 70, 229, 0.05)', color: '#4f46e5', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            QR Badge
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingEmp(emp);
                                                setIsModalOpen(true);
                                            }}
                                            style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(emp.id)}
                                            style={{ padding: '8px', borderRadius: 8, border: ' none', background: 'rgba(244, 63, 94, 0.05)', color: '#f43f5e', fontSize: 12, cursor: 'pointer' }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handlePrintHistory(emp)}
                                        disabled={isGeneratingHistory}
                                        style={{
                                            width: '100%', marginTop: 10, padding: '8px', borderRadius: 8,
                                            border: '1px solid #e2e8f0', background: '#fff', fontSize: 11,
                                            fontWeight: 700, cursor: isGeneratingHistory ? 'wait' : 'pointer',
                                            color: isGeneratingHistory ? '#94a3b8' : '#64748b',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                        }}
                                    >
                                        {isGeneratingHistory ? <Loader2 className="animate-spin" size={12} /> : '📄'}
                                        {isGeneratingHistory ? 'Generating...' : 'Print Work History'}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {employees.length === 0 && !isLoading && (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px 20px', background: '#fff', borderRadius: 16 }}>
                                <div style={{ fontSize: 48, marginBottom: 20 }}>👩‍💼👨‍💼</div>
                                <h2 style={{ color: '#0f172a' }}>No Staff Registered</h2>
                                <p style={{ color: '#64748b' }}>Start by adding your first employee.</p>
                            </div>
                        )}
                    </div>
                    </>
                ) : activeView === 'LOGS' ? (
                    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Activity Logs</h2>
                            <div style={{ display: 'flex', gap: 10 }}>
                                {selectedLogs.size > 0 && (
                                    <button
                                        onClick={async () => {
                                            if (!confirm(`Are you sure you want to delete ${selectedLogs.size} logs?`)) return;
                                            setIsLoading(true);
                                            for (const id of Array.from(selectedLogs)) {
                                                await deleteTimeLog(id);
                                            }
                                            setSelectedLogs(new Set());
                                            await loadData();
                                        }}
                                        style={{ padding: '8px 16px', borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        🗑️ Delete {selectedLogs.size} Logs
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowManualLog({ empId: employees[0]?.id || '', name: employees[0]?.name || '' })}
                                    style={{ padding: '8px 16px', borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    ➕ Add Manual Log
                                </button>
                            </div>
                        </div>

                        {showManualLog && (
                            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 15, color: '#1e293b' }}>Add Manual Log for {showManualLog.name}</h3>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <select
                                        value={showManualLog.empId}
                                        onChange={(e) => {
                                            const selectedEmp = employees.find(emp => emp.id === e.target.value);
                                            if (selectedEmp) setShowManualLog({ empId: selectedEmp.id, name: selectedEmp.name });
                                        }}
                                        style={{ padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                                    >
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                                        ))}
                                    </select>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 15, width: '100%' }}>
                                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>FROM DATE</label>
                                                <input
                                                    type="date"
                                                    value={manualDateStart}
                                                    onChange={(e) => setManualDateStart(e.target.value)}
                                                    style={{ padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>TO DATE (Inclusive)</label>
                                                <input
                                                    type="date"
                                                    value={manualDateEnd}
                                                    onChange={(e) => setManualDateEnd(e.target.value)}
                                                    style={{ padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>TIME</label>
                                                <input
                                                    type="time"
                                                    value={manualTime}
                                                    onChange={(e) => setManualTime(e.target.value)}
                                                    style={{ padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>TYPE</label>
                                                <select
                                                    value={manualType}
                                                    onChange={(e) => setManualType(e.target.value as any)}
                                                    style={{ padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                                                >
                                                    <option value="IN">Clock In</option>
                                                    <option value="OUT">Clock Out</option>
                                                    <option value="LEAVE">Day Off / Leave</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        {/* Date checklist generator */}
                                        <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                            <label style={{ fontSize: 12, fontWeight: 800, color: '#334155', display: 'block', marginBottom: 10 }}>Select Working Days within Range:</label>
                                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                {getDatesInRange(manualDateStart, manualDateEnd).map(date => {
                                                    const d = new Date(date + 'T12:00:00');
                                                    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                                    const isExcluded = excludedDates.has(date);
                                                    return (
                                                        <div key={date} onClick={() => {
                                                            const newSet = new Set(excludedDates);
                                                            if (newSet.has(date)) newSet.delete(date);
                                                            else newSet.add(date);
                                                            setExcludedDates(newSet);
                                                        }} style={{ 
                                                            display: 'flex', alignItems: 'center', gap: 6, 
                                                            padding: '6px 12px', background: isExcluded ? '#f1f5f9' : '#ecfdf5',
                                                            border: isExcluded ? '1px solid #cbd5e1' : '1px solid #10b981',
                                                            borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                                            color: isExcluded ? '#64748b' : '#059669', transition: 'all 0.2s'
                                                        }}>
                                                            <div style={{ width: 14, height: 14, borderRadius: 3, border: isExcluded ? '2px solid #cbd5e1' : 'none', background: isExcluded ? 'transparent' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {!isExcluded && <span style={{ color: '#fff', fontSize: 9 }}>✓</span>}
                                                            </div>
                                                            {label}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 5 }}>
                                            {manualType === 'IN' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <input
                                                        type="checkbox"
                                                        id="autoComplete"
                                                        checked={autoCompleteOut}
                                                        onChange={e => setAutoCompleteOut(e.target.checked)}
                                                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                                                    />
                                                    <label htmlFor="autoComplete" style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', cursor: 'pointer' }}>+ Auto-generate 6:00 PM Clock-Out for each day</label>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <input
                                                    type="checkbox"
                                                    id="overtime"
                                                    checked={isOvertime}
                                                    onChange={e => setIsOvertime(e.target.checked)}
                                                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                                                />
                                                <label htmlFor="overtime" style={{ fontSize: 13, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Record as Overtime</label>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                            <button
                                                onClick={handleManualLog}
                                                style={{ padding: '10px 20px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                ✅ Bulk Add Logs
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowManualLog(null);
                                                    setExcludedDates(new Set());
                                                }}
                                                style={{ padding: '10px 20px', borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {editingLog && (
                            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#fff7ed' }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 15, color: '#9a3412' }}>Edit Log Time</h3>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <div style={{ fontWeight: 600 }}>{editingLog.employeeName} - {editingLog.type}</div>
                                    <input
                                        type="date"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                        style={{ padding: '8px', borderRadius: 8, border: '1px solid #fed7aa' }}
                                    />
                                    <input
                                        type="time"
                                        value={editTime}
                                        onChange={(e) => setEditTime(e.target.value)}
                                        style={{ padding: '8px', borderRadius: 8, border: '1px solid #fed7aa' }}
                                    />
                                    <button
                                        onClick={handleUpdateLog}
                                        style={{ padding: '8px 16px', borderRadius: 8, background: '#f97316', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Save Changes
                                    </button>
                                    <button
                                        onClick={() => setEditingLog(null)}
                                        style={{ padding: '8px 16px', borderRadius: 8, background: '#94a3b8', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '16px 20px', width: 40 }}>
                                        <input
                                            type="checkbox"
                                            checked={filteredLogs.length > 0 && selectedLogs.size === filteredLogs.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedLogs(new Set(filteredLogs.map(l => l.id)));
                                                } else {
                                                    setSelectedLogs(new Set());
                                                }
                                            }}
                                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#ef4444' }}
                                        />
                                    </th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>PHOTO</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>STAFF</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>ACTION</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>STATUS</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>TIME</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>LOCATION</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 12, color: '#64748b' }}>MANAGE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map(log => {
                                    const compliance = checkShiftCompliance(log);
                                    return (
                                        <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', background: selectedLogs.has(log.id) ? '#fef2f2' : 'transparent' }}>
                                            <td style={{ padding: '12px 20px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLogs.has(log.id)}
                                                    onChange={(e) => {
                                                        const next = new Set(selectedLogs);
                                                        if (e.target.checked) next.add(log.id);
                                                        else next.delete(log.id);
                                                        setSelectedLogs(next);
                                                    }}
                                                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#ef4444' }}
                                                />
                                            </td>
                                            <td style={{ padding: '12px 20px' }}>
                                                {log.facePhoto ? (
                                                    <img
                                                        src={log.facePhoto}
                                                        alt="Face verify"
                                                        style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                                    />
                                                ) : (
                                                    /* Fallback to Employee Profile Picture */
                                                    <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {(() => {
                                                            const emp = employees.find(e => e.id === log.employeeId);
                                                            if (emp?.photo) return <img src={emp.photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                                                            return <span style={{ fontSize: 18 }}>👤</span>;
                                                        })()}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ fontWeight: 700, color: '#1e293b' }}>{log.employeeName}</div>
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <span style={{
                                                    fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 6,
                                                    background: log.type === 'IN' ? '#ecfdf5' : log.type === 'LEAVE' ? '#f5f3ff' : '#fef2f2',
                                                    color: log.type === 'IN' ? '#059669' : log.type === 'LEAVE' ? '#7c3aed' : '#dc2626'
                                                }}>
                                                    {log.type === 'LEAVE' ? 'ON LEAVE' : `CLOCKED ${log.type}`}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <span style={{ fontSize: 10, fontWeight: 900, color: compliance.color }}>
                                                    ● {compliance.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 20px', fontSize: 13, color: '#475569' }}>
                                                {formatDate(log.timestamp)}
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                {log.location ? (
                                                    <div style={{ fontSize: 11, color: '#64748b' }}>
                                                        📍 {log.location.lat.toFixed(4)}, {log.location.lng.toFixed(4)}
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{log.notes || '✅ Authenticated'}</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => {
                                                        const date = new Date(log.timestamp);
                                                        setEditDate(date.toISOString().split('T')[0]);
                                                        setEditTime(date.toTimeString().slice(0, 5));
                                                        setEditingLog(log);
                                                    }}
                                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6366f1', fontSize: 14, marginRight: 10 }}
                                                    title="Edit Time"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteLog(log.id)}
                                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 }}
                                                    title="Delete Log"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                                            No activity logs found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Payroll View */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
                        {filteredEmployees.map(emp => {
                            const stats = payrollData[emp.id];
                            return (
                                <div key={emp.id} className="luxury-card" style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{emp.name}</h3>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>Rate: ${emp.dailyRate || 0}/day</span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                                        <div style={{ padding: 12, background: '#f8fafc', borderRadius: 12 }}>
                                            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Working Days</div>
                                            <div style={{ fontSize: 20, fontWeight: 900, color: '#1e293b' }}>{stats?.daysWorked || 0}</div>
                                        </div>
                                        <div style={{ padding: 12, background: '#f8fafc', borderRadius: 12 }}>
                                            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Total Earned</div>
                                            <div style={{ fontSize: 20, fontWeight: 900, color: '#10b981' }}>${stats?.totalEarned || 0}</div>
                                        </div>
                                        <div style={{ padding: 12, background: '#f8fafc', borderRadius: 12 }}>
                                            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Total Paid</div>
                                            <div style={{ fontSize: 20, fontWeight: 900, color: '#3b82f6' }}>${stats?.totalPaid || 0}</div>
                                        </div>
                                        <div style={{ padding: 12, background: stats?.balance && stats.balance > 0 ? '#fef2f2' : '#f8fafc', borderRadius: 12 }}>
                                            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Due Balance</div>
                                            <div style={{ fontSize: 20, fontWeight: 900, color: stats?.balance && stats.balance > 0 ? '#ef4444' : '#1e293b' }}>${stats?.balance || 0}</div>
                                        </div>
                                    </div>

                                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <input
                                                type="number"
                                                placeholder="Amount to pay..."
                                                id={`pay-${emp.id}`}
                                                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }}
                                            />
                                            <button
                                                disabled={isPaying === emp.id}
                                                onClick={() => {
                                                    const input = document.getElementById(`pay-${emp.id}`) as HTMLInputElement;
                                                    handlePayment(emp.id, parseFloat(input.value));
                                                    input.value = '';
                                                }}
                                                style={{ padding: '10px 20px', borderRadius: 10, background: '#1e293b', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                                            >
                                                {isPaying === emp.id ? '...' : 'Pay Staff'}
                                            </button>
                                            <button
                                                onClick={() => handleViewPayments(emp.id, emp.name)}
                                                style={{ padding: '10px 20px', borderRadius: 10, background: '#f8fafc', color: '#64748b', fontWeight: 700, border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                                            >
                                                <span>📋</span> History
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <EmployeeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={loadData}
                initialData={editingEmp}
            />

            {/* Payment History Modal */}
            {viewingPaymentsFor && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500,
                        maxHeight: '80vh', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ padding: 20, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Payment History: {viewingPaymentsFor.name}</h3>
                            <button onClick={() => setViewingPaymentsFor(null)} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer' }}>×</button>
                        </div>
                        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
                            {employeePaymentsList.length === 0 ? (
                                <p style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>No payments recorded yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {employeePaymentsList.map(pay => (
                                        <div key={pay.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 15, border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc' }}>
                                            <div>
                                                <div style={{ fontWeight: 800, color: '#1e293b', fontSize: 16 }}>${pay.amount.toFixed(2)}</div>
                                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                                                    {formatDate(pay.date)} • {pay.notes || 'No notes'}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeletePayment(pay.id)}
                                                style={{ border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden History Template for PDF Generation */}
            {historyPrintData && (
                <div style={{ position: 'absolute', top: -9999, left: -9999 }}>
                    <HistoryReportTemplate
                        ref={historyPrintRef}
                        employee={historyPrintData.employee}
                        logs={historyPrintData.logs}
                        payments={historyPrintData.payments}
                        range={reportRange}
                    />
                </div>
            )}

        </div>
    );
}
