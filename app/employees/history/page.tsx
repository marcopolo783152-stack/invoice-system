'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Employee, TimeLog, getEmployees, getTimeLogs } from '@/lib/employee-storage';
import { Loader2 } from 'lucide-react';

function HistoryContent() {
    const searchParams = useSearchParams();
    const employeeId = searchParams.get('id');

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [logs, setLogs] = useState<TimeLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!employeeId) return;
            try {
                const [emps, allLogs] = await Promise.all([
                    getEmployees(),
                    getTimeLogs(1000) // Fetch substantial history
                ]);

                const emp = emps.find(e => e.empId === employeeId || e.id === employeeId);
                const empLogs = allLogs
                    .filter(l => l.employeeId === (emp?.id || employeeId) || l.employeeName === emp?.name)
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                setEmployee(emp || null);
                setLogs(empLogs);
                setLoading(false);

                // Trigger print after short delay
                setTimeout(() => {
                    window.print();
                }, 1000);
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };
        load();
    }, [employeeId]);

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" />
                <span style={{ marginLeft: 10 }}>Loading History...</span>
            </div>
        );
    }

    if (!employee) return <div>Employee not found</div>;

    // Group logs by Month
    const groupedLogs: Record<string, TimeLog[]> = {};
    logs.forEach(log => {
        const date = new Date(log.timestamp);
        const key = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (!groupedLogs[key]) groupedLogs[key] = [];
        groupedLogs[key].push(log);
    });

    return (
        <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#1e293b', maxWidth: 800, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, borderBottom: '2px solid #e2e8f0', paddingBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Work History Report</h1>
                    <div style={{ color: '#64748b', marginTop: 4 }}>Generated on {new Date().toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{employee.name}</div>
                    <div style={{ color: '#64748b' }}>ID: {employee.empId}</div>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
                <div style={{ padding: 20, background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Days Worked</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>
                        {new Set(logs.filter(l => l.type === 'IN').map(l => l.timestamp.split('T')[0])).size}
                    </div>
                </div>
                <div style={{ padding: 20, background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Days Off (Leave)</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#7c3aed' }}>
                        {logs.filter(l => l.type === 'LEAVE').length}
                    </div>
                </div>
                <div style={{ padding: 20, background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Current Status</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: employee.status === 'IN' ? '#10b981' : '#f43f5e' }}>
                        {employee.status}
                    </div>
                </div>
            </div>

            {/* Logs */}
            {Object.entries(groupedLogs).map(([month, monthLogs]) => (
                <div key={month} style={{ marginBottom: 30 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: 10, color: '#475569' }}>
                        {month}
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                                <th style={{ padding: '8px 0', fontWeight: 600 }}>DATE</th>
                                <th style={{ padding: '8px 0', fontWeight: 600 }}>TIME</th>
                                <th style={{ padding: '8px 0', fontWeight: 600 }}>ACTION</th>
                                <th style={{ padding: '8px 0', fontWeight: 600, textAlign: 'right' }}>NOTES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthLogs.map(log => (
                                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '10px 0', color: '#1e293b' }}>
                                        {new Date(log.timestamp).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '10px 0', color: '#64748b' }}>
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '10px 0' }}>
                                        <span style={{
                                            padding: '2px 6px', borderRadius: 4, fontWeight: 700, fontSize: 11,
                                            background: log.type === 'IN' ? '#ecfdf5' : log.type === 'LEAVE' ? '#f5f3ff' : '#fef2f2',
                                            color: log.type === 'IN' ? '#059669' : log.type === 'LEAVE' ? '#7c3aed' : '#dc2626'
                                        }}>
                                            {log.type}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 0', textAlign: 'right', color: '#94a3b8' }}>
                                        {log.notes || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}

            <style jsx global>{`
                @media print {
                    @page { margin: 20mm; }
                    body { -webkit-print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}

export default function EmployeeHistoryPrint() {
    return (
        <Suspense fallback={
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" />
                <span style={{ marginLeft: 10 }}>Loading...</span>
            </div>
        }>
            <HistoryContent />
        </Suspense>
    );
}
