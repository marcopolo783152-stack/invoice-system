import React, { forwardRef } from 'react';
import { Employee, TimeLog, EmployeePayment } from '@/lib/employee-storage';

interface HistoryReportTemplateProps {
    employee: Employee;
    logs: TimeLog[];
    payments: EmployeePayment[];
    range?: 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';
}

export const HistoryReportTemplate = forwardRef<HTMLDivElement, HistoryReportTemplateProps>(({ employee, logs, payments, range = 'ALL' }, ref) => {
    // Calculations
    const daysWorkedSet = new Set(logs.filter(l => l.type === 'IN').map(l => l.timestamp.split('T')[0]));
    const daysWorked = daysWorkedSet.size;
    const daysOff = logs.filter(l => l.type === 'LEAVE').length;

    // Financials
    const dailyRate = employee.dailyRate || 0;
    const totalEarned = daysWorked * dailyRate;
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const balanceDue = totalEarned - totalPaid;

    // Group logs by Month
    const groupedLogs: Record<string, TimeLog[]> = {};
    logs.forEach(log => {
        const date = new Date(log.timestamp);
        const key = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (!groupedLogs[key]) groupedLogs[key] = [];
        groupedLogs[key].push(log);
    });

    const rangeLabels = {
        'WEEK': 'Weekly',
        'MONTH': 'Monthly',
        'YEAR': 'Yearly',
        'ALL': 'Full History'
    };

    return (
        <div ref={ref} style={{
            padding: '0.6in',
            paddingBottom: '1.2in', // Ensures footer clear room
            fontFamily: 'sans-serif',
            color: '#1e293b',
            width: '8.5in',
            minHeight: '11in',
            margin: '0 auto',
            background: 'white',
            boxSizing: 'border-box',
            position: 'relative'
        }}>
            {/* Company Branding Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: '#0f172a' }}>ARIANA ORIENTAL RUGS INC</h2>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                        3210 DUKE ST • ALEXANDRIA, VA 22314<br />
                        Phone: +1 (703) 801 1640 • Email: arianaorientalrugs@gmail.com
                    </div>
                </div>
                <div style={{ width: 120 }}>
                    <img src="/LOGO.png" alt="Logo" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
            </div>

            {/* Report Header Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 30, borderBottom: '2px solid #e2e8f0', paddingBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#6366f1' }}>{rangeLabels[range]} Work History</h1>
                    <div style={{ color: '#64748b', marginTop: 4 }}>Generated on {new Date().toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{employee.name}</div>
                    <div style={{ color: '#64748b', fontWeight: 600 }}>Employee ID: {employee.empId}</div>
                </div>
            </div>

            {/* Financial Summary */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, marginBottom: 30,
                background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0'
            }}>
                <div>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Earned</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>${totalEarned.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{daysWorked} Days @ ${dailyRate}/day</div>
                </div>
                <div>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Paid</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#10b981' }}>${totalPaid.toLocaleString()}</div>
                </div>
                <div>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Balance Due</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: balanceDue > 0 ? '#ef4444' : '#64748b' }}>
                        ${balanceDue.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Attendance Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
                <div style={{ padding: 15, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Days Worked</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{daysWorked}</div>
                </div>
                <div style={{ padding: 15, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Days Off</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#7c3aed' }}>{daysOff}</div>
                </div>
                <div style={{ padding: 15, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Current Status</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: employee.status === 'IN' ? '#10b981' : '#f43f5e' }}>
                        {employee.status}
                    </div>
                </div>
            </div>

            {/* Logs */}
            {Object.entries(groupedLogs).map(([month, monthLogs]) => (
                <div key={month} style={{ marginBottom: 30, pageBreakInside: 'avoid' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: '2px solid #e2e8f0', paddingBottom: 8, color: '#475569', textTransform: 'uppercase' }}>
                        {month}
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                                <th style={{ padding: '8px 0', fontWeight: 700 }}>DATE</th>
                                <th style={{ padding: '8px 0', fontWeight: 700 }}>TIME</th>
                                <th style={{ padding: '8px 0', fontWeight: 700 }}>ACTION</th>
                                <th style={{ padding: '8px 0', fontWeight: 700, textAlign: 'right' }}>NOTES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthLogs.map(log => (
                                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '8px 0', color: '#1e293b', fontWeight: 500 }}>
                                        {new Date(log.timestamp).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '8px 0', color: '#64748b' }}>
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '8px 0' }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 10,
                                            background: log.type === 'IN' ? '#ecfdf5' : log.type === 'LEAVE' ? '#f5f3ff' : '#fef2f2',
                                            color: log.type === 'IN' ? '#059669' : log.type === 'LEAVE' ? '#7c3aed' : '#dc2626',
                                            border: `1px solid ${log.type === 'IN' ? '#a7f3d0' : log.type === 'LEAVE' ? '#ddd6fe' : '#fecaca'}`
                                        }}>
                                            {log.type}
                                        </span>
                                    </td>
                                    <td style={{ padding: '8px 0', textAlign: 'right', color: '#64748b', fontStyle: log.notes ? 'normal' : 'italic' }}>
                                        {log.notes || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}

            {/* Payments History */}
            {payments.length > 0 && (
                <div style={{ marginTop: 40, pageBreakInside: 'avoid' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: '2px solid #e2e8f0', paddingBottom: 8, color: '#10b981', textTransform: 'uppercase' }}>
                        Payment History
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                                <th style={{ padding: '8px 0', fontWeight: 700 }}>DATE</th>
                                <th style={{ padding: '8px 0', fontWeight: 700 }}>AMOUNT</th>
                                <th style={{ padding: '8px 0', fontWeight: 700, textAlign: 'right' }}>NOTES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(payment => (
                                <tr key={payment.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '8px 0', color: '#1e293b', fontWeight: 500 }}>
                                        {(() => {
                                            try {
                                                const d = new Date(payment.date);
                                                return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
                                            } catch (e) { return '-'; }
                                        })()}
                                    </td>
                                    <td style={{ padding: '8px 0', color: '#10b981', fontWeight: 700 }}>
                                        ${Number(payment.amount).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '8px 0', textAlign: 'right', color: '#64748b' }}>
                                        {payment.notes || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
});

HistoryReportTemplate.displayName = 'HistoryReportTemplate';
