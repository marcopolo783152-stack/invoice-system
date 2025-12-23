'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, FileText, TrendingUp, Users } from 'lucide-react';
import { getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';
import { calculateInvoice } from '@/lib/calculations';
import Link from 'next/link';

export default function Dashboard() {
    const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            const data = await getAllInvoices();
            setInvoices(data);
            setLoading(false);
        }
        loadData();
    }, []);

    // KPIs
    const totalRevenue = invoices.reduce((sum, inv) => sum + calculateInvoice(inv.data).totalDue, 0);
    const monthlyRevenue = totalRevenue; // Simplified for now (all time)
    const averageOrder = invoices.length > 0 ? totalRevenue / invoices.length : 0;

    if (loading) return <div style={{ padding: 40, color: '#666' }}>Loading dashboard...</div>;

    return (
        <div style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }}>
            <header style={{ marginBottom: 40 }}>
                <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1f3c', marginBottom: 8 }}>Dashboard</h1>
                <p style={{ color: '#666' }}>Welcome back, here's what's happening today.</p>
            </header>

            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 40 }}>
                <KpiCard
                    title="Total Revenue"
                    value={`$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    icon={<DollarSign size={24} color="#10b981" />}
                    trend="+12.5% vs last month"
                    color="rgba(16, 185, 129, 0.1)"
                />
                <KpiCard
                    title="Total Invoices"
                    value={invoices.length.toString()}
                    icon={<FileText size={24} color="#6366f1" />}
                    trend={`${invoices.length} new this month`}
                    color="rgba(99, 102, 241, 0.1)"
                />
                <KpiCard
                    title="Avg. Order Value"
                    value={`$${averageOrder.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    icon={<TrendingUp size={24} color="#f59e0b" />}
                    trend="+5.2% vs last month"
                    color="rgba(245, 158, 11, 0.1)"
                />
            </div>

            {/* Recent Activity */}
            <div style={{ background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1f3c' }}>Recent Invoices</h2>
                    <Link href="/invoices" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>View All</Link>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
                            <th style={{ padding: '16px 0', color: '#888', fontWeight: 500, fontSize: 14 }}>Invoice #</th>
                            <th style={{ padding: '16px 0', color: '#888', fontWeight: 500, fontSize: 14 }}>Customer</th>
                            <th style={{ padding: '16px 0', color: '#888', fontWeight: 500, fontSize: 14 }}>Date</th>
                            <th style={{ padding: '16px 0', color: '#888', fontWeight: 500, fontSize: 14 }}>Amount</th>
                            <th style={{ padding: '16px 0', color: '#888', fontWeight: 500, fontSize: 14 }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.slice(0, 5).map((inv) => (
                            <tr key={inv.id} style={{ borderBottom: '1px solid #f8f8f8' }}>
                                <td style={{ padding: '16px 0', fontWeight: 600, color: '#1a1f3c' }}>{inv.data.invoiceNumber}</td>
                                <td style={{ padding: '16px 0', color: '#4b5563' }}>{inv.data.soldTo.name}</td>
                                <td style={{ padding: '16px 0', color: '#6b7280' }}>{inv.data.date}</td>
                                <td style={{ padding: '16px 0', fontWeight: 600, color: '#1a1f3c' }}>${calculateInvoice(inv.data).totalDue.toLocaleString()}</td>
                                <td style={{ padding: '16px 0' }}>
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: 20,
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        color: '#059669',
                                        fontSize: 12,
                                        fontWeight: 600
                                    }}>Paid</span>
                                </td>
                            </tr>
                        ))}
                        {invoices.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#888' }}>No invoices found. Create your first one!</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function KpiCard({ title, value, icon, trend, color }: any) {
    return (
        <div style={{ background: 'white', borderRadius: 24, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                </div>
                <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: 12 }}>{trend}</span>
            </div>
            <div>
                <div style={{ color: '#6b7280', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{title}</div>
                <div style={{ color: '#1a1f3c', fontSize: 28, fontWeight: 800 }}>{value}</div>
            </div>
        </div>
    );
}
