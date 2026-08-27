import React, { useEffect, useState } from 'react';
import { Employee, getWorkDays, getEmployeePayments, EmployeePayment } from '@/lib/employee-storage';
import { formatCurrency } from '@/lib/calculations';
import { DollarSign, Clock, Calendar, CheckCircle2, X } from 'lucide-react';

interface EmployeeDashboardProps {
    employee: Employee;
    onClose: () => void;
}

export default function EmployeeDashboard({ employee, onClose }: EmployeeDashboardProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [daysWorked, setDaysWorked] = useState(0);
    const [totalPaid, setTotalPaid] = useState(0);
    const [payments, setPayments] = useState<EmployeePayment[]>([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const uniqueDays = await getWorkDays(employee.id, undefined, employee.name);
                const empPayments = await getEmployeePayments(employee.id);
                
                const paid = empPayments.reduce((acc, p) => acc + p.amount, 0);
                
                setDaysWorked(uniqueDays);
                setPayments(empPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setTotalPaid(paid);
            } catch (err) {
                console.error("Failed to load dashboard:", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [employee.id, employee.name]);

    const totalEarned = daysWorked * (employee.dailyRate || 0);
    const balance = totalEarned - totalPaid;

    if (isLoading) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                <Clock className="w-8 h-8 mx-auto mb-4 animate-spin" />
                <p>Loading your dashboard...</p>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', maxWidth: 600, background: '#fff', borderRadius: 24, padding: 32, boxShadow: '0 20px 40px rgba(0,0,0,0.4)', position: 'relative' }}>
            <button 
                onClick={onClose}
                style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
                <X size={24} />
            </button>
            
            <div style={{ textAlign: 'center', marginBottom: 30 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: 0 }}>Hello, {employee.name}!</h2>
                <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>Here is your current earnings summary</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <Calendar size={24} color="#3b82f6" style={{ margin: '0 auto 8px auto' }} />
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Days Worked</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{daysWorked}</div>
                </div>
                
                <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <CheckCircle2 size={24} color="#10b981" style={{ margin: '0 auto 8px auto' }} />
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Paid</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{formatCurrency(totalPaid)}</div>
                </div>
                
                <div style={{ background: balance > 0 ? '#eff6ff' : '#f8fafc', padding: 20, borderRadius: 16, textAlign: 'center', border: `1px solid ${balance > 0 ? '#bfdbfe' : '#e2e8f0'}` }}>
                    <DollarSign size={24} color={balance > 0 ? "#2563eb" : "#64748b"} style={{ margin: '0 auto 8px auto' }} />
                    <div style={{ fontSize: 12, color: balance > 0 ? '#1d4ed8' : '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Balance Due</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: balance > 0 ? '#1d4ed8' : '#1e293b' }}>{formatCurrency(balance)}</div>
                </div>
            </div>

            {payments.length > 0 && (
                <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>Recent Payments</h3>
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {payments.slice(0, 5).map(p => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: '#334155' }}>{new Date(p.date).toLocaleDateString()}</div>
                                    <div style={{ fontSize: 12, color: '#64748b' }}>{p.type}</div>
                                </div>
                                <div style={{ fontWeight: 800, color: '#10b981' }}>
                                    {formatCurrency(p.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
