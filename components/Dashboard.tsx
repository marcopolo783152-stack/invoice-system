'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, FileText, TrendingUp, Users } from 'lucide-react';
import { getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';
import { calculateInvoice } from '@/lib/calculations';
import Link from 'next/link';

type Period = 'today' | 'this-week' | 'last-week' | 'this-month' | 'this-year' | 'all-time';

export default function Dashboard() {
    const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
    const [filteredInvoices, setFilteredInvoices] = useState<SavedInvoice[]>([]);
    const [period, setPeriod] = useState<Period>('all-time');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            const data = await getAllInvoices();
            setInvoices(data);
            setLoading(false);
        }
        loadData();
    }, []);

    useEffect(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const getStartOfPeriod = (p: Period) => {
            const d = new Date(startOfToday);
            if (p === 'today') return d;
            if (p === 'this-week') {
                d.setDate(d.getDate() - d.getDay());
                return d;
            }
            if (p === 'last-week') {
                d.setDate(d.getDate() - d.getDay() - 7);
                return d;
            }
            if (p === 'this-month') {
                return new Date(now.getFullYear(), now.getMonth(), 1);
            }
            if (p === 'this-year') {
                return new Date(now.getFullYear(), 0, 1);
            }
            return new Date(0);
        };

        const getEndOfPeriod = (p: Period) => {
            if (p === 'last-week') {
                const d = new Date(startOfToday);
                d.setDate(d.getDate() - d.getDay() - 1);
                d.setHours(23, 59, 59, 999);
                return d;
            }
            return new Date(8640000000000000); // Far future
        };

        const start = getStartOfPeriod(period);
        const end = getEndOfPeriod(period);

        const filtered = invoices.filter(inv => {
            const invDate = new Date(inv.createdAt);
            return invDate >= start && invDate <= end;
        });

        setFilteredInvoices(filtered);
    }, [invoices, period]);

    // KPIs
    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + calculateInvoice(inv.data).netTotalDue, 0);
    const totalReturned = filteredInvoices.reduce((sum, inv) => sum + calculateInvoice(inv.data).returnedAmount, 0);
    const averageOrder = filteredInvoices.length > 0 ? totalRevenue / filteredInvoices.length : 0;

    if (loading) return <div style={{ padding: 40, color: '#666' }}>Loading dashboard...</div>;

    return (
        <div style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }}>
            <header style={{ marginBottom: 40 }}>
                <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1f3c', marginBottom: 8 }}>Dashboard</h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
                    <p style={{ color: '#666' }}>Performance analysis and financial reports.</p>

                    <div style={{ display: 'flex', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 12 }}>
                        {(['today', 'this-week', 'last-week', 'this-month', 'this-year', 'all-time'] as Period[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: period === p ? 'white' : 'transparent',
                                    color: period === p ? '#1e293b' : '#64748b',
                                    fontWeight: period === p ? 600 : 500,
                                    fontSize: 13,
                                    cursor: 'pointer',
                                    boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {p.replace('-', ' ')}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => window.print()}
                        style={{
                            padding: '10px 20px',
                            background: '#1e293b',
                            color: 'white',
                            border: 'none',
                            borderRadius: 10,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}
                    >
                        <FileText size={18} /> Print Report
                    </button>
                </div>
            </header>

            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 40 }}>
                <KpiCard
                    title="Net Revenue"
                    value={`$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    icon={<DollarSign size={24} color="#10b981" />}
                    trend={totalReturned > 0 ? `-$${totalReturned.toLocaleString()} returns` : "No returns"}
                    trendColor={totalReturned > 0 ? "#ef4444" : "#10b981"}
                    color="rgba(16, 185, 129, 0.1)"
                />
                <KpiCard
                    title="Invoices"
                    value={filteredInvoices.length.toString()}
                    icon={<FileText size={24} color="#6366f1" />}
                    trend={`${period.replace('-', ' ')} view`}
                    trendColor="#64748b"
                    color="rgba(99, 102, 241, 0.1)"
                />
                <KpiCard
                    title="Avg. Net Value"
                    value={`$${averageOrder.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    icon={<TrendingUp size={24} color="#f59e0b" />}
                    trend="Per order net"
                    trendColor="#64748b"
                    color="rgba(245, 158, 11, 0.1)"
                />
            </div>

            {/* Recent Activity */}
            <div style={{ background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1f3c' }}>{period === 'all-time' ? 'Recent Invoices' : `Invoices - ${period.replace('-', ' ')}`}</h2>
                    <Link href="/invoices" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }} className="no-print">View All</Link>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
                            <th style={{ padding: '16px 0', color: '#888', fontWeight: 500, fontSize: 14 }}>Invoice #</th>
                            <th style={{ padding: '16px 0', color: '#888', fontWeight: 500, fontSize: 14 }}>Customer</th>
                            <th style={{ padding: '16px 0', color: '#888', fontWeight: 500, fontSize: 14 }}>Date</th>
                            <th style={{ padding: '16px 0', color: '#888', fontWeight: 500, fontSize: 14 }}>Net Amount</th>
                            <th style={{ padding: '16px 0', color: '#888', fontWeight: 500, fontSize: 14 }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInvoices.slice(0, 10).map((inv) => {
                            const calcs = calculateInvoice(inv.data);
                            return (
                                <tr key={inv.id} style={{ borderBottom: '1px solid #f8f8f8' }}>
                                    <td style={{ padding: '16px 0', fontWeight: 600, color: '#1a1f3c' }}>{inv.data.invoiceNumber}</td>
                                    <td style={{ padding: '16px 0', color: '#4b5563' }}>{inv.data.soldTo.name}</td>
                                    <td style={{ padding: '16px 0', color: '#6b7280' }}>{inv.data.date}</td>
                                    <td style={{ padding: '16px 0', fontWeight: 600, color: '#1a1f3c' }}>
                                        ${calcs.netTotalDue.toLocaleString()}
                                        {calcs.returnedAmount > 0 && <span style={{ fontSize: 10, color: '#ef4444', display: 'block' }}>Returns: -${calcs.returnedAmount.toLocaleString()}</span>}
                                    </td>
                                    <td style={{ padding: '16px 0' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: 20,
                                            background: inv.data.documentType === 'WASH' ? '#e0f2fe' : 'rgba(16, 185, 129, 0.1)',
                                            color: inv.data.documentType === 'WASH' ? '#0369a1' : '#059669',
                                            fontSize: 12,
                                            fontWeight: 600
                                        }}>{inv.data.documentType || 'Paid'}</span>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredInvoices.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#888' }}>No invoices found for this period.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .sidebar { display: none !important; }
                    main { margin-left: 0 !important; }
                    div[style*="marginLeft: 280"] { margin-left: 0 !important; }
                }
            `}</style>
        </div>
    );
}

function KpiCard({ title, value, icon, trend, color, trendColor }: any) {
    return (
        <div style={{ background: 'white', borderRadius: 24, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                </div>
                <span style={{ fontSize: 12, color: trendColor || '#10b981', fontWeight: 600, background: `${trendColor || '#10b981'}15`, padding: '4px 8px', borderRadius: 12 }}>{trend}</span>
            </div>
            <div>
                <div style={{ color: '#6b7280', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{title}</div>
                <div style={{ color: '#1a1f3c', fontSize: 28, fontWeight: 800 }}>{value}</div>
            </div>
        </div>
    );
}
