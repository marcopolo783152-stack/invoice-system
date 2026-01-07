'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, FileText, TrendingUp, Users, Printer } from 'lucide-react';
import { getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';
import { calculateInvoice } from '@/lib/calculations';
import Link from 'next/link';
import Login from './Login';
import { formatDateMMDDYYYY } from '@/lib/date-utils';

type Period = 'today' | 'this-week' | 'last-week' | 'this-month' | 'this-year' | 'all-time' | 'custom';

import { exportToDirectory } from '@/lib/bulk-export';
import { HardDrive, AlertTriangle } from 'lucide-react'; // Import icons

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
            await exportToDirectory(invoices, (p) => {
                setProgress({ current: p.current, total: p.total, status: p.status });
            });
            // Mark as done for today
            localStorage.setItem(BACKUP_KEY, new Date().toDateString());
            setNeedsBackup(false);
            alert('Backup Complete! All files have been saved to your drive.');
        } catch (error: any) {
            console.error(error);
            // Don't alert if user just cancelled the picker
            if (error.name !== 'AbortError') {
                alert('Backup failed. Please try again.');
            }
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

    const handleManualBackup = async () => {
        const confirmBackup = confirm('Create a full backup of all invoices?');
        if (!confirmBackup) return;

        try {
            await exportToDirectory(invoices, (p) => {
                console.log(p.status);
            });
            alert('Backup Complete! Saved to your drive.');
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                alert('Backup failed. Please try again.');
            }
        }
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
    }, [invoices, period, startDate, endDate]);

    // KPIs
    const salesInvoices = filteredInvoices.filter(inv => inv.data.documentType !== 'CONSIGNMENT');
    const consignmentInvoices = filteredInvoices.filter(inv => inv.data.documentType === 'CONSIGNMENT');

    const totalNetRevenue = filteredInvoices.reduce((sum, inv) => sum + calculateInvoice(inv.data).netTotalDue, 0);
    const totalConsignmentValue = consignmentInvoices.reduce((sum, inv) => sum + calculateInvoice(inv.data).totalDue, 0);
    const totalReturned = filteredInvoices.reduce((sum, inv) => sum + calculateInvoice(inv.data).returnedAmount, 0);

    // Counts
    const salesCount = salesInvoices.length;
    const consignmentCount = consignmentInvoices.length;

    if (loading) return <div style={{ padding: 40, color: '#666' }}>Loading dashboard...</div>;
    if (!isAuthenticated) return <Login onLogin={onLogin} />;

    return (
        <div style={{ padding: 'var(--dashboard-padding)', maxWidth: 1400, margin: '0 auto' }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 40,
                flexWrap: 'wrap',
                gap: 24
            }}>
                <div className="animate-fade-in">
                    <h1 style={{
                        fontSize: 'var(--h1-size)',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        letterSpacing: '-0.02em',
                        fontFamily: 'Outfit, sans-serif',
                        marginBottom: 4
                    }}>
                        Analytics Overview
                    </h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: 'var(--p-size)', margin: 0 }}>
                        Welcome back to Marco Polo Dashboard
                    </p>
                </div>

                <div className="no-print" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{
                        display: 'flex',
                        gap: 4,
                        background: 'var(--glass-bg)',
                        padding: 6,
                        borderRadius: 14,
                        border: '1px solid var(--glass-border)',
                        backdropFilter: 'blur(10px)'
                    }}>
                        {(['today', 'this-week', 'this-month', 'this-year', 'all-time'] as Period[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: period === p ? 'var(--primary)' : 'transparent',
                                    color: period === p ? 'white' : 'var(--text-muted)',
                                    fontWeight: 700,
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                {p.replace('-', ' ')}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => window.print()}
                        className="luxury-button"
                        style={{ background: 'var(--bg-midnight)', border: '1px solid var(--glass-border)', padding: '10px 20px' }}
                    >
                        <Printer size={18} /> Print
                    </button>

                    <Link
                        href="/inventory"
                        className="luxury-button"
                        style={{ padding: '10px 20px' }}
                    >
                        📦 Inventory
                    </Link>
                </div>
            </header>

            {/* Backup Reminder */}
            <div className="no-print" style={{ marginBottom: 20 }}>
                <BackupReminder invoices={invoices} />
            </div>

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
                                            <div style={{ fontSize: 13, color: '#b45309' }}>Due: {formatDateMMDDYYYY(inv.data.pickupDate)}</div>
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
                    trend={`Net Revenue`}
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
            <div className="luxury-card animate-slide-up" style={{ padding: 0, overflow: 'hidden', marginTop: 40 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid var(--glass-border)' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>{period === 'all-time' ? 'Recent Activity' : `Activity - ${period.replace('-', ' ')}`}</h2>
                    <Link href="/invoices" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 13, textDecoration: 'none', border: '1px solid var(--glass-border)', padding: '6px 14px', borderRadius: 10, background: 'var(--glass-bg)' }} className="no-print">VIEW ALL</Link>
                </div>

                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }} className="mobile-hidden">
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ padding: '16px 32px', color: 'var(--text-dim)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Invoice #</th>
                                <th style={{ padding: '16px 32px', color: 'var(--text-dim)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Customer</th>
                                <th style={{ padding: '16px 32px', color: 'var(--text-dim)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Date</th>
                                <th style={{ padding: '16px 32px', color: 'var(--text-dim)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right', borderBottom: '1px solid var(--glass-border)' }}>Amount</th>
                                <th style={{ padding: '16px 32px', color: 'var(--text-dim)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', borderBottom: '1px solid var(--glass-border)' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.slice(0, 10).map((inv) => {
                                const calcs = calculateInvoice(inv.data);
                                return (
                                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.3s' }}>
                                        <td style={{ padding: '20px 32px', fontWeight: 700, color: 'var(--text-main)' }}>{inv.data.invoiceNumber}</td>
                                        <td style={{ padding: '20px 32px', color: 'var(--text-muted)' }}>{inv.data.soldTo.name}</td>
                                        <td style={{ padding: '20px 32px', color: 'var(--text-dim)', fontSize: 14 }}>{inv.data.date}</td>
                                        <td style={{ padding: '20px 32px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)', fontSize: 16 }}>
                                            ${calcs.totalDue.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '20px 32px', textAlign: 'center' }}>
                                            {(() => {
                                                let style = { bg: 'rgba(99, 102, 241, 0.1)', text: 'var(--primary)', label: 'Sale' };
                                                if (inv.data.documentType === 'CONSIGNMENT') style = { bg: 'rgba(251, 191, 36, 0.1)', text: 'var(--accent-gold)', label: 'Consignment' };
                                                else if (inv.data.documentType === 'WASH') {
                                                    if (inv.data.status === 'ready') style = { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--accent-emerald)', label: 'Ready' };
                                                    else if (inv.data.status === 'picked_up') style = { bg: 'rgba(255, 255, 255, 0.05)', text: 'var(--text-dim)', label: 'Picked Up' };
                                                    else style = { bg: 'rgba(99, 102, 241, 0.1)', text: 'var(--primary)', label: inv.data.status || 'Process' };
                                                }

                                                return (
                                                    <span style={{
                                                        padding: '6px 14px',
                                                        borderRadius: 10,
                                                        background: style.bg,
                                                        color: style.text,
                                                        fontSize: 11,
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                        display: 'inline-block',
                                                        border: `1px solid ${style.text}20`
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
                            <div key={inv.id} style={{ background: 'var(--glass-bg)', padding: 16, borderRadius: 12, marginBottom: 12, border: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{inv.data.invoiceNumber}</span>
                                    <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{inv.data.date}</span>
                                </div>
                                <div style={{ marginBottom: 8, color: 'var(--text-muted)' }}>{inv.data.soldTo.name}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-main)' }}>${calcs.totalDue.toLocaleString()}</span>
                                    <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', border: '1px solid rgba(99,102,241,0.2)' }}>
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
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                    width: 54,
                    height: 54,
                    borderRadius: 14,
                    background: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.05)',
                    boxShadow: `0 8px 16px ${color.replace('0.1', '0.05')}`
                }}>
                    {React.cloneElement(icon as React.ReactElement, { size: 26 })}
                </div>
                <span style={{
                    fontSize: 12,
                    color: trendColor || 'var(--accent-emerald)',
                    fontWeight: 700,
                    background: `${trendColor || '#10b981'}15`,
                    padding: '6px 12px',
                    borderRadius: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>{trend}</span>
            </div>
            <div>
                <div style={{ color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</div>
                <div style={{ color: 'var(--text-main)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em' }}>{value}</div>
            </div>
        </div>
    );
}
