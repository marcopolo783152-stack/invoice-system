'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, FileText, TrendingUp, Users } from 'lucide-react';
import { getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';
import { calculateInvoice } from '@/lib/calculations';
import Link from 'next/link';
import Login from './Login';

type Period = 'today' | 'this-week' | 'last-week' | 'this-month' | 'this-year' | 'all-time' | 'custom';

import { exportOrganizedBackup } from '@/lib/bulk-export';
import { HardDrive, AlertTriangle, CheckCircle } from 'lucide-react'; // Import icons

const BACKUP_KEY = 'last_backup_date';

function BackupReminder({ invoices }: { invoices: any[] }) {
    const [needsBackup, setNeedsBackup] = useState(false);
    const [backingUp, setBackingUp] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });

    useEffect(() => {
        const checkBackup = () => {
            const now = new Date();
            const hour = now.getHours();
            // Start checking after 6 PM (18:00)
            if (hour >= 18) {
                const lastBackup = localStorage.getItem(BACKUP_KEY);
                const today = now.toDateString(); // "Mon Jan 06 2026"

                if (lastBackup !== today) {
                    setNeedsBackup(true);
                }
            }
        };

        checkBackup();
        // Check every minute just in case user leaves dashboard open
        const interval = setInterval(checkBackup, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleBackup = async () => {
        if (backingUp) return;
        setBackingUp(true);
        try {
            await exportOrganizedBackup(invoices, (p) => {
                setProgress({ current: p.current, total: p.total, status: p.status });
            });
            // Mark as done for today
            localStorage.setItem(BACKUP_KEY, new Date().toDateString());
            setNeedsBackup(false);
            alert('Backup saved successfully! Please copy the file to your Backup Drive.');
        } catch (error) {
            console.error(error);
            alert('Backup failed. Please try again.');
        } finally {
            setBackingUp(false);
        }
    };

    if (backingUp) {
        return (
            <div style={{
                position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
                background: 'white', padding: 20, borderRadius: 12,
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxWidth: 300, border: '1px solid #e2e8f0'
            }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 16, fontWeight: 700 }}>Backing Up...</h4>
                <div style={{ marginBottom: 8, fontSize: 13, color: '#64748b' }}>{progress.status}</div>
                <div style={{ height: 6, width: '100%', background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(progress.current / Math.max(progress.total, 1)) * 100}%`, background: '#3b82f6', transition: 'width 0.2s' }} />
                </div>
                <div style={{ marginTop: 8, fontSize: 12, textAlign: 'right', color: '#94a3b8' }}>{progress.current} / {progress.total}</div>
            </div>
        );
    }

    if (!needsBackup) return null;

    return (
        <div style={{
            marginTop: 20, padding: 16, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            animation: 'pulse 2s infinite'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: '#f97316', padding: 8, borderRadius: '50%', color: 'white' }}>
                    <AlertTriangle size={20} />
                </div>
                <div>
                    <h4 style={{ margin: 0, color: '#c2410c', fontSize: 15 }}>Daily Backup Required</h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#9a3412' }}>It's past 6 PM. Please save your daily backup.</p>
                </div>
            </div>
            <button
                onClick={handleBackup}
                style={{
                    whiteSpace: 'nowrap', padding: '10px 20px', background: '#ea580c', color: 'white',
                    border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)'
                }}
            >
                <HardDrive size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
                Backup Now
            </button>
            <style>{`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(234, 88, 12, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0); }
                }
            `}</style>
        </div>
    );
}

export default function Dashboard() {
    const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
    const [filteredInvoices, setFilteredInvoices] = useState<SavedInvoice[]>([]);
    const [period, setPeriod] = useState<Period>('all-time');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        // Authenticate
        const auth = sessionStorage.getItem('mp-invoice-auth') || localStorage.getItem('mp-invoice-auth');
        const user = sessionStorage.getItem('mp-invoice-user') || localStorage.getItem('mp-invoice-user');

        if (auth === '1' && user) {
            setIsAuthenticated(true);
            try { setCurrentUser(JSON.parse(user)); } catch { }

            async function loadData() {
                const data = await getAllInvoices();
                setInvoices(data);
                setLoading(false);
            }
            loadData();
        } else {
            setIsAuthenticated(false);
            setLoading(false);
        }
    }, []);

    const onLogin = () => {
        setIsAuthenticated(true);
        setLoading(true);
        // Reload data after login
        async function loadData() {
            const data = await getAllInvoices();
            setInvoices(data);
            setLoading(false);
        }
        loadData();
    };

    useEffect(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const getStartOfPeriod = (p: Period) => {
            const d = new Date(startOfToday);
            if (p === 'today') return d;
            if (p === 'custom') {
                const [y, m, dPart] = startDate.split('-').map(Number);
                return new Date(y, m - 1, dPart);
            }
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
            if (p === 'custom') {
                const [y, m, dPart] = endDate.split('-').map(Number);
                const d = new Date(y, m - 1, dPart);
                d.setHours(23, 59, 59, 999);
                return d;
            }
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
    const salesInvoices = filteredInvoices.filter(inv => inv.data.documentType !== 'CONSIGNMENT');
    const consignmentInvoices = filteredInvoices.filter(inv => inv.data.documentType === 'CONSIGNMENT');

    const totalNetRevenue = salesInvoices.reduce((sum, inv) => sum + calculateInvoice(inv.data).netTotalDue, 0);
    const totalConsignmentValue = consignmentInvoices.reduce((sum, inv) => sum + calculateInvoice(inv.data).netTotalDue, 0);
    const totalReturned = filteredInvoices.reduce((sum, inv) => sum + calculateInvoice(inv.data).returnedAmount, 0);

    // Counts
    const salesCount = salesInvoices.length;
    const consignmentCount = consignmentInvoices.length;

    if (loading) return <div style={{ padding: 40, color: '#666' }}>Loading dashboard...</div>;
    if (!isAuthenticated) return <Login onLogin={onLogin} />;

    return (
        <div style={{ padding: 'var(--dashboard-padding, 40px)', maxWidth: 1200, margin: '0 auto' }}>
            <header style={{ marginBottom: 40 }}>
                <h1 style={{ fontSize: 'var(--h1-size, 32px)', fontWeight: 800, color: '#1a1f3c', marginBottom: 8 }}>Dashboard</h1>
                <div className="flex-stack-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
                    <p style={{ color: '#666', fontSize: 'var(--p-size, 16px)' }}>Performance analysis and financial reports.</p>

                    <div className="no-print w-full-mobile" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 12, overflowX: 'auto', maxWidth: '100vw' }}>
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

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f1f5f9', padding: '4px 12px', borderRadius: 12 }}>
                            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>From:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setPeriod('custom');
                                }}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: 13,
                                    color: period === 'custom' ? '#1e293b' : '#64748b',
                                    fontWeight: period === 'custom' ? 600 : 500,
                                    outline: 'none',
                                    fontFamily: 'inherit'
                                }}
                            />
                            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>To:</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setPeriod('custom');
                                }}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: 13,
                                    color: period === 'custom' ? '#1e293b' : '#64748b',
                                    fontWeight: period === 'custom' ? 600 : 500,
                                    outline: 'none',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                    </div>

                    <button
                        className="no-print"
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

                    <Link
                        href="/inventory"
                        className="no-print"
                        style={{
                            padding: '10px 20px',
                            background: '#3b82f6',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: 10,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}
                    >
                        📦 Inventory
                    </Link>
                </div>
            </header>

            {/* ALERTS SECTION */}
            <div className="no-print" style={{ marginBottom: 40 }}>
                {invoices.filter(inv => {
                    if (inv.data.status === 'picked_up') return false;
                    if (!inv.data.pickupDate) return false;
                    // Check if pickup date is within next 2 days or past due
                    const pickup = new Date(inv.data.pickupDate);
                    const now = new Date();
                    const diffTime = pickup.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays <= 2; // Show if due within 2 days or overdue
                }).length > 0 && (
                        <div style={{ padding: 20, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 16 }}>
                            <h3 style={{ marginTop: 0, color: '#b45309', display: 'flex', alignItems: 'center', gap: 8 }}>
                                ⚠️ Upcoming Pickups
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                                {invoices.filter(inv => {
                                    if (inv.data.status === 'picked_up') return false;
                                    if (!inv.data.pickupDate) return false;
                                    const pickup = new Date(inv.data.pickupDate);
                                    const now = new Date();
                                    const diffTime = pickup.getTime() - now.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    return diffDays <= 2;
                                }).map(inv => (
                                    <div key={inv.id} style={{ background: 'white', padding: 12, borderRadius: 8, border: '1px solid #fcd34d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{inv.data.invoiceNumber} - {inv.data.soldTo.name}</div>
                                            <div style={{ fontSize: 13, color: '#b45309' }}>Due: {inv.data.pickupDate}</div>
                                        </div>
                                        <Link href={`/invoices/view?id=${inv.id}`} style={{ padding: '6px 12px', background: '#fff7ed', color: '#c2410c', textDecoration: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                                            View
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
            </div>

            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 40 }}>
                <KpiCard
                    title="Sales Revenue"
                    value={`$${totalNetRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={<DollarSign size={24} color="#10b981" />}
                    trend={`Total - Refunds`}
                    trendColor="#10b981"
                    color="rgba(16, 185, 129, 0.1)"
                />
                <KpiCard
                    title="Consignment Value"
                    value={`$${totalConsignmentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={<FileText size={24} color="#f59e0b" />}
                    trend={`${consignmentCount} Docs`}
                    trendColor="#f59e0b"
                    color="rgba(245, 158, 11, 0.1)"
                />
                <KpiCard
                    title="Sales Invoices"
                    value={salesCount.toString()}
                    icon={<FileText size={24} color="#6366f1" />}
                    trend={`${period.replace('-', ' ')}`}
                    trendColor="#64748b"
                    color="rgba(99, 102, 241, 0.1)"
                />
                <KpiCard
                    title="Total Returns"
                    value={`$${totalReturned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={<TrendingUp size={24} color="#ef4444" />}
                    trend="Refunded"
                    trendColor="#ef4444"
                    color="rgba(239, 68, 68, 0.1)"
                />
            </div>

            {/* Recent Activity */}
            <div style={{ background: 'white', borderRadius: 24, padding: 'var(--dashboard-padding, 32px)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 'var(--h2-size, 20px)', fontWeight: 700, color: '#1a1f3c' }}>{period === 'all-time' ? 'Recent Invoices' : `Invoices - ${period.replace('-', ' ')}`}</h2>
                    <Link href="/invoices" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }} className="no-print">View All</Link>
                </div>

                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }} className="mobile-hidden">
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
                                <th style={{ padding: '16px 0', color: '#888', fontWeight: 500, fontSize: 14 }}>Invoice #</th>
                                <th style={{ padding: '16px 0', color: '#888', fontWeight: 500, fontSize: 14 }}>Customer</th>
                                <th style={{ padding: '16px 0', color: '#888', fontWeight: 500, fontSize: 14 }}>Date</th>
                                <th style={{ padding: '16px 0', color: '#888', fontWeight: 500, fontSize: 14 }}>Total Amount</th>
                                <th style={{ padding: '16px 0', color: '#888', fontWeight: 500, fontSize: 14 }}>Served By</th>
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
                                            ${calcs.totalDue.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px 0', color: '#4b5563', fontSize: 13 }}>
                                            {inv.data.servedBy || '—'}
                                        </td>
                                        <td style={{ padding: '16px 0' }}>
                                            {(() => {
                                                let style = { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669', label: 'Sale' };
                                                if (inv.data.documentType === 'CONSIGNMENT') style = { bg: '#fff7ed', text: '#c2410c', label: 'Consignment' };
                                                else if (inv.data.documentType === 'WASH') {
                                                    if (inv.data.status === 'ready') style = { bg: '#dcfce7', text: '#166534', label: 'Ready' };
                                                    else if (inv.data.status === 'picked_up') style = { bg: '#f1f5f9', text: '#475569', label: 'Picked Up' };
                                                    else style = { bg: '#e0f2fe', text: '#0284c7', label: inv.data.status || 'Wash/Repair' };
                                                }

                                                return (
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: 20,
                                                        background: style.bg,
                                                        color: style.text,
                                                        fontSize: 12,
                                                        fontWeight: 600
                                                    }}>{style.label}</span>
                                                );
                                            })()}
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

                {/* Mobile Card View */}
                <div className="mobile-visible">
                    {/* <div className={styles.statLabel}>Total Receivables</div>
                    <div className={styles.statValue}>{formatCurrency(stats.totalReceivable)}</div>
                    <div className={styles.statSubtext}>Outstanding balance</div> */}
                    {filteredInvoices.slice(0, 10).map((inv) => {
                        const calcs = calculateInvoice(inv.data);
                        return (
                            <div key={inv.id} style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontWeight: 700, color: '#1a1f3c' }}>{inv.data.invoiceNumber}</span>
                                    <span style={{ color: '#64748b', fontSize: 13 }}>{inv.data.date}</span>
                                </div>
                                <div style={{ marginBottom: 8, color: '#4b5563' }}>{inv.data.soldTo.name}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: 16 }}>${calcs.totalDue.toLocaleString()}</span>
                                    {/* Recycle the status badge logic or simplify */}
                                    <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px', borderRadius: 8, background: '#e2e8f0', color: '#475569' }}>
                                        {inv.data.documentType === 'INVOICE' ? 'Sale' : inv.data.documentType}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    {filteredInvoices.length === 0 && (
                        <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>No invoices found.</div>
                    )}
                </div>
            </div>
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
