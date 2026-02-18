'use client';

import React, { useState, useEffect } from 'react';
import { Employee, TimeLog, getEmployees, getTimeLogs, deleteEmployee } from '@/lib/employee-storage';
import EmployeeModal from '@/components/EmployeeModal';
import Link from 'next/link';

interface BadgeData {
    id: string;
    name: string;
    empId: string;
    qrUrl: string;
}

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [logs, setLogs] = useState<TimeLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
    const [activeView, setActiveView] = useState<'STAFF' | 'LOGS'>('STAFF');
    const [printBadge, setPrintBadge] = useState<BadgeData | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [empList, logList] = await Promise.all([
                getEmployees(),
                getTimeLogs(100)
            ]);
            setEmployees(empList);
            setLogs(logList);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handlePrintBadge = (emp: Employee) => {
        const baseUrl = window.location.origin;
        const clockUrl = `${baseUrl}/clock?id=${emp.empId}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(clockUrl)}`;

        setPrintBadge({
            id: emp.id,
            name: emp.name,
            empId: emp.empId,
            qrUrl: qrUrl
        });

        setTimeout(() => {
            window.print();
            setPrintBadge(null);
        }, 500);
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
                            const baseUrl = window.location.origin;
                            const clockUrl = `${baseUrl}/clock`;
                            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(clockUrl)}`;
                            setPrintBadge({
                                id: 'shop-main',
                                name: 'TIME CLOCK STATION',
                                empId: 'SCAN TO START',
                                qrUrl: qrUrl
                            });
                            setTimeout(() => {
                                window.print();
                                setPrintBadge(null);
                            }, 500);
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
                ) : (
                    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>PHOTO</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>STAFF</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>ACTION</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>TIME</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>LOCATION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
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
                                        <td style={{ padding: '16px 20px', fontSize: 13, color: '#475569' }}>
                                            {formatDate(log.timestamp)}
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            {log.location ? (
                                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                                    📍 {log.location.lat.toFixed(4)}, {log.location.lng.toFixed(4)}
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: 10, color: '#94a3b8' }}>✅ Synced</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                                            No activity logs found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <EmployeeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={loadData}
                initialData={editingEmp}
            />

            {/* Print Badge Placeholder */}
            {printBadge && (
                <div id="print-area" className="only-print" style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'white', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        width: '3.5in', height: '5in', border: '2px solid #1e293b',
                        borderRadius: 20, padding: 30, textAlign: 'center', display: 'flex',
                        flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                        boxShadow: '0 0 10px rgba(0,0,0,0.1)'
                    }}>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: '#1e293b', marginBottom: 4 }}>MARCO POLO</div>
                            <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 2 }}>EMPLOYEE ID</div>
                        </div>

                        <div style={{
                            width: 120, height: 120, borderRadius: '50%', background: '#f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50,
                            margin: '20px 0', border: '4px solid #f1f5f9'
                        }}>
                            👤
                        </div>

                        <div>
                            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>{printBadge.name}</h2>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#4f46e5' }}>ID: {printBadge.empId}</div>
                        </div>

                        <div style={{ marginTop: 20 }}>
                            <img src={printBadge.qrUrl} alt="QR Code" style={{ width: 140, height: 140 }} />
                            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 8 }}>SCAN TO CLOCK IN / OUT</div>
                        </div>

                        <div style={{ fontSize: 8, color: '#cbd5e1', marginTop: 10 }}>
                            AUTHORIZED ACCESS ONLY • (703) 461-0207
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
