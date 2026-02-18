'use client';

import React, { useState, useEffect } from 'react';
import { Employee, TimeLog, getEmployees, getTimeLogs, deleteEmployee, EmployeePayment, recordPayment, getEmployeePayments, addManualTimeLog, deleteTimeLog } from '@/lib/employee-storage';
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

    // Manual Log State
    const [showManualLog, setShowManualLog] = useState<{ empId: string, name: string } | null>(null);
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
    const [manualTime, setManualTime] = useState('10:00');
    const [manualType, setManualType] = useState<'IN' | 'OUT'>('IN');

    const handleManualLog = async () => {
        if (!showManualLog) return;
        const timestamp = `${manualDate}T${manualTime}:00`;
        await addManualTimeLog({
            employeeId: showManualLog.empId,
            employeeName: showManualLog.name,
            type: manualType,
            timestamp,
            notes: 'Added by Administrator'
        });
        setShowManualLog(null);
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
        } catch (error) {
            console.error(error);
        } finally {
            setIsPaying(null);
        }
    };

    useEffect(() => {
        loadData();
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
                <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 15 }}>
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

                {activeView === 'STAFF' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
                        {employees.map(emp => (
                            <div key={emp.id} className="luxury-card" style={{
                                background: '#fff', borderRadius: 16, padding: 24,
                                border: '1px solid #e2e8f0', position: 'relative',
                                display: 'flex', gap: 16
                            }}>
                                <div style={{
                                    width: 60, height: 60, borderRadius: 12,
                                    background: '#f1f5f9', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', fontSize: 24
                                }}>
                                    👤
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{emp.name}</h3>
                                            <span style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, color: '#64748b', fontWeight: 700 }}>
                                                ID: {emp.empId}
                                            </span>
                                        </div>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 900,
                                            background: emp.status === 'IN' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                            color: emp.status === 'IN' ? '#10b981' : '#f43f5e',
                                            border: `1px solid ${emp.status === 'IN' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`
                                        }}>
                                            {emp.status === 'IN' ? 'ON THE CLOCK' : 'OFFLINE'}
                                        </span>
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
                ) : activeView === 'LOGS' ? (
                    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Activity Logs</h2>
                            <button
                                onClick={() => setShowManualLog({ empId: employees[0]?.id || '', name: employees[0]?.name || '' })}
                                style={{ padding: '8px 16px', borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                            >
                                ➕ Add Manual Log
                            </button>
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
                                    <input
                                        type="date"
                                        value={manualDate}
                                        onChange={(e) => setManualDate(e.target.value)}
                                        style={{ padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                                    />
                                    <input
                                        type="time"
                                        value={manualTime}
                                        onChange={(e) => setManualTime(e.target.value)}
                                        style={{ padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                                    />
                                    <select
                                        value={manualType}
                                        onChange={(e) => setManualType(e.target.value as 'IN' | 'OUT')}
                                        style={{ padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                                    >
                                        <option value="IN">Clock In</option>
                                        <option value="OUT">Clock Out</option>
                                    </select>
                                    <button
                                        onClick={handleManualLog}
                                        style={{ padding: '8px 16px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Add Log
                                    </button>
                                    <button
                                        onClick={() => setShowManualLog(null)}
                                        style={{ padding: '8px 16px', borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
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
                                {logs.map(log => {
                                    const compliance = checkShiftCompliance(log);
                                    return (
                                        <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 20px' }}>
                                                {log.facePhoto ? (
                                                    <img
                                                        src={log.facePhoto}
                                                        alt="Face verify"
                                                        style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                                    />
                                                ) : (
                                                    <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ fontWeight: 700, color: '#1e293b' }}>{log.employeeName}</div>
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <span style={{
                                                    fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 6,
                                                    background: log.type === 'IN' ? '#ecfdf5' : '#fef2f2',
                                                    color: log.type === 'IN' ? '#059669' : '#dc2626'
                                                }}>
                                                    CLOCKED {log.type === 'IN' ? 'IN' : 'OUT'}
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
                        {employees.map(emp => {
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

        </div>
    );
}
