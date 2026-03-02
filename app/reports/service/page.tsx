'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, DollarSign, Calendar, Filter, Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getServiceOrders, ServiceOrder } from '@/lib/service-order-storage';
import { getInventoryItems, InventoryItem } from '@/lib/inventory-storage';

export default function ServiceReportsPage() {
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [oData, iData] = await Promise.all([getServiceOrders(), getInventoryItems()]);
        setOrders(oData);
        setInventory(iData);
        setIsLoading(false);
    };

    // Calculate Stats
    const totalSpent = orders.reduce((sum, order) =>
        sum + order.rugs.reduce((rugSum, rug) => rugSum + (rug.cost || 0), 0), 0
    );

    const completedOrders = orders.filter(o => o.status === 'COMPLETED');
    const avgTurnaround = completedOrders.length > 0
        ? completedOrders.reduce((sum, o) => {
            const sent = new Date(o.dateSent);
            const rugs = o.rugs.filter(r => r.returned && r.dateReturned);
            if (rugs.length === 0) return sum;
            const latestReturn = Math.max(...rugs.map(r => r.dateReturned ? new Date(r.dateReturned).getTime() : 0));
            return sum + (latestReturn - sent.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / completedOrders.length
        : 0;

    const vendorStats = orders.reduce((acc: any, order) => {
        if (!acc[order.vendorName]) {
            acc[order.vendorName] = { count: 0, spent: 0, rugs: 0 };
        }
        acc[order.vendorName].count += 1;
        acc[order.vendorName].rugs += order.rugs.length;
        acc[order.vendorName].spent += order.rugs.reduce((s, r) => s + (r.cost || 0), 0);
        return acc;
    }, {});

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <Link href="/service-tracking" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '0.5rem' }}>
                        <ArrowLeft size={18} /> Back to Tracking
                    </Link>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>Service Reports</h1>
                </div>
                <button
                    onClick={() => window.print()}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}
                >
                    <Download size={18} /> Export PDF
                </button>
            </div>

            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Total Investment', value: `$${totalSpent.toLocaleString()}`, icon: DollarSign, color: '#4CAF50' },
                    { label: 'Avg Turnaround', value: `${Math.round(avgTurnaround)} Days`, icon: Clock, color: '#2196F3' },
                    { label: 'Total Service Orders', value: orders.length, icon: FileText, color: '#9C27B0' },
                    { label: 'Rugs Serviced', value: orders.reduce((s, o) => s + o.rugs.length, 0), icon: Tag, color: '#FF9800' }
                ].map((stat, i) => (
                    <div key={i} style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: `${stat.color}15`, color: stat.color }}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{stat.label}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Vendor Performance */}
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={20} />
                        Vendor Performance
                    </h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem 0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Vendor</th>
                                <th style={{ padding: '1rem 0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Orders</th>
                                <th style={{ padding: '1rem 0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Rugs</th>
                                <th style={{ padding: '1rem 0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'right' }}>Total Spent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(vendorStats).map(([name, stats]: [string, any]) => (
                                <tr key={name} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{name}</td>
                                    <td style={{ padding: '1rem 0.5rem' }}>{stats.count}</td>
                                    <td style={{ padding: '1rem 0.5rem' }}>{stats.rugs}</td>
                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 700 }}>${stats.spent.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Service Breakdown */}
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart3 size={20} />
                        Status Overview
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {[
                            { label: 'Active', count: orders.filter(o => o.status === 'ACTIVE').length, color: 'var(--primary)' },
                            { label: 'Partial', count: orders.filter(o => o.status === 'PARTIAL').length, color: '#FF9800' },
                            { label: 'Completed', count: orders.filter(o => o.status === 'COMPLETED').length, color: '#4CAF50' }
                        ].map((s, i) => (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                    <span>{s.label}</span>
                                    <span style={{ fontWeight: 700 }}>{s.count} ({Math.round((s.count / orders.length) * 100)}%)</span>
                                </div>
                                <div style={{ height: '8px', backgroundColor: 'var(--bg-void)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${(s.count / orders.length) * 100}%`, height: '100%', backgroundColor: s.color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Missing icons from lucide-react were used in common list, importing them here to avoid errors
const FileText = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>;
const Tag = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 9 9-11 11L2 13 \ 12 2z"></path><path d="m15 5 3 3"></path></svg>;
