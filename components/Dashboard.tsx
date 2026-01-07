'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, FileText, TrendingUp, Users, Printer, Search } from 'lucide-react';
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
            <div className="luxury-card animate-pulse" style={{
                position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
                background: 'var(--bg-nebula)', padding: 20, borderRadius: 20,
                boxShadow: '0 10px 40px rgba(0,0,0,0.6)', maxWidth: 320, border: '1px solid var(--glass-border)'
            }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>Backing Up...</h4>
                <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-dim)' }}>{progress.status}</div>
                <div style={{ height: 6, width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(progress.current / Math.max(progress.total, 1)) * 100}%`, background: 'var(--primary)', transition: 'width 0.2s', boxShadow: '0 0 10px var(--primary-glow)' }} />
                </div>
                <div style={{ marginTop: 8, fontSize: 12, textAlign: 'right', color: 'var(--text-muted)' }}>{progress.current} / {progress.total}</div>
            </div>
        );
    }

    if (!needsBackup) return null;

    return (
        <div className="luxury-card animate-slide-up" style={{
            marginTop: 20, padding: '24px 32px',
            background: 'var(--bg-nebula)',
            border: '2px solid rgba(197, 160, 89, 0.3)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ color: 'var(--accent-gold)' }}>
                    <AlertTriangle size={32} />
                </div>
                <div>
                    <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>Data Integrity Protocol</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: 14, color: 'var(--text-muted)' }}>Daily synchronization required. Please verify your data snapshot.</p>
                </div>
            </div>
            <button
                onClick={handleBackup}
                className="luxury-button"
                style={{
                    background: '#ea580c', color: 'white',
                    padding: '12px 24px', fontSize: 13
                }}
            >
                <HardDrive size={18} />
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
    const [period, setPeriod] = useState<Period>('today');
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

    const hasUpcomingPickups = invoices.filter(inv => {
        if (inv.data.status === 'picked_up') return false;
        if (!inv.data.pickupDate) return false;
        const pickup = new Date(inv.data.pickupDate);
        const now = new Date();
        const diffTime = pickup.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 2;
    }).length > 0;

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
                {/* Top Header - Search & User Profile */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, gap: 24 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Hello {currentUser?.fullName?.split(' ')[0] || 'User'}</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '4px 0 0 0' }}>Welcome Back!</p>
                    </div>

                    <div style={{ flex: 1, maxWidth: 600, position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search a transaction..."
                            style={{
                                width: '100%',
                                padding: '12px 20px 12px 48px',
                                borderRadius: 12,
                                border: '1px solid var(--surface-border)',
                                background: '#ffffff',
                                fontSize: 14,
                                color: 'var(--text-main)',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.01)'
                            }}
                        />
                        <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>
                            <Search size={18} /> {/* Placeholder for Search icon */}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('open-notifications'))}
                            style={{
                                width: 44, height: 44, borderRadius: '50%',
                                border: '1px solid var(--surface-border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--text-main)', position: 'relative', background: '#fff',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            className="luxury-button-hover"
                        >
                            <AlertTriangle size={20} />
                            {hasUpcomingPickups && (
                                <div style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-rose)', border: '2px solid #fff' }} />
                            )}
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                                    {currentUser?.fullName?.[0] || 'U'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="no-print" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 32 }}>
                    <div style={{
                        display: 'flex',
                        background: '#ffffff',
                        padding: 4,
                        borderRadius: 10,
                        border: '1px solid var(--surface-border)'
                    }}>
                        {(['today', 'this-week', 'this-month', 'this-year', 'all-time', 'custom'] as Period[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: period === p ? 'var(--primary)' : 'transparent',
                                    color: period === p ? '#ffffff' : 'var(--text-muted)',
                                    fontWeight: 600,
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {p === 'custom' ? 'Custom' : p.replace('-', ' ')}
                            </button>
                        ))}
                    </div>

                    <Link
                        href="/inventory"
                        className="luxury-button"
                        style={{ padding: '10px 20px', marginLeft: 'auto' }}
                    >
                        📦 Inventory
                    </Link>
                </div>
            </header>

            {period === 'custom' && (
                <div className="no-print animate-slide-up" style={{
                    display: 'flex',
                    gap: 16,
                    marginBottom: 32,
                    alignItems: 'center',
                    background: 'var(--bg-nebula)',
                    padding: '16px 24px',
                    borderRadius: 12,
                    border: '1px solid var(--surface-border)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>FROM</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                border: '1px solid var(--surface-border)',
                                borderRadius: 8,
                                fontSize: 14,
                                background: '#fff'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>TO</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                border: '1px solid var(--surface-border)',
                                borderRadius: 8,
                                fontSize: 14,
                                background: '#fff'
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Backup Reminder */}
            <div className="no-print" style={{ marginBottom: 20 }}>
                <BackupReminder invoices={invoices} />
            </div>

            {/* ALERTS SECTION */}
            <div className="no-print" style={{ marginBottom: 40 }}>
                {invoices.filter(inv => {
                    if (inv.data.status === 'picked_up') return false;
                    if (!inv.data.pickupDate) return false;
                    const pickup = new Date(inv.data.pickupDate);
                    const now = new Date();
                    const diffTime = pickup.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays <= 2;
                }).length > 0 && (
                        <div className="luxury-card" style={{ padding: 24, background: 'var(--bg-nebula)', border: '1px solid var(--surface-border)', borderRadius: 20 }}>
                            <h3 style={{ marginTop: 0, color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 800 }}>
                                ⚠️ Upcoming Pickups
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24, marginTop: 24 }}>
                                {invoices.filter(inv => {
                                    if (inv.data.status === 'picked_up') return false;
                                    if (!inv.data.pickupDate) return false;
                                    const pickup = new Date(inv.data.pickupDate);
                                    const now = new Date();
                                    const diffTime = pickup.getTime() - now.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    return diffDays <= 2;
                                }).map(inv => (
                                    <div key={inv.id} style={{
                                        background: 'var(--bg-nebula)',
                                        padding: 24,
                                        borderRadius: 10,
                                        border: '1px solid var(--surface-border)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                                        transition: 'all 0.2s'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 15 }}>{inv.data.soldTo.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>ID: {inv.data.invoiceNumber}</div>
                                            <div style={{ fontSize: 12, color: 'var(--accent-rose)', marginTop: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Due: {formatDateMMDDYYYY(inv.data.pickupDate)}</div>
                                        </div>
                                        <Link href={`/invoices/view?id=${inv.id}`} className="luxury-button" style={{ padding: '8px 16px', fontSize: 11 }}>
                                            REVIEW
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
            </div>

            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 32 }}>
                <KpiCard
                    title="Current Balance"
                    value={`$${totalNetRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={<DollarSign size={22} />}
                    color="#1e50ff"
                    bg="rgba(30, 80, 255, 0.08)"
                />
                <KpiCard
                    title="Total Profit"
                    value={`$${(totalNetRevenue * 0.2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={<TrendingUp size={22} />}
                    color="#10b981"
                    bg="rgba(16, 185, 129, 0.08)"
                />
                <KpiCard
                    title="Consignment Value"
                    value={`$${totalConsignmentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={<FileText size={22} />}
                    color="#6366f1"
                    bg="rgba(99, 102, 241, 0.08)"
                />
                <KpiCard
                    title="Total Returns"
                    value={`$${totalReturned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={<TrendingUp size={22} />}
                    color="#f43f5e"
                    bg="rgba(244, 63, 94, 0.08)"
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
                <div>
                    {/* Activity Chart Area */}
                    <div className="luxury-card" style={{ padding: 32, marginBottom: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Activity</h2>
                        </div>
                        <div style={{ height: 260, position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                            {/* Simple visual representation of a chart */}
                            {[40, 60, 45, 70, 50, 85, 65, 90, 75, 55, 60, 80].map((h, i) => (
                                <div key={i} style={{ flex: 1, height: `${h}%`, background: 'var(--bg-slate)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60%', background: 'linear-gradient(to top, var(--primary) 0%, #6366f1 100%)', opacity: 0.8 }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Latest Transactions Area */}
                    <div className="luxury-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Latest Transaction</h2>
                            <Link href="/invoices" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>View all</Link>
                        </div>
                        <div style={{ padding: '12px 32px' }}>
                            {filteredInvoices.slice(0, 5).map((inv) => {
                                const calcs = calculateInvoice(inv.data);
                                return (
                                    <div key={inv.id} style={{ display: 'flex', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--surface-border)' }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginRight: 16 }}>
                                            <FileText size={20} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14 }}>{inv.data.soldTo.name || 'Anonymous Counterparty'}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{inv.data.documentType === 'INVOICE' ? 'Technology' : 'Acquisition'}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700, color: calcs.totalDue >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontSize: 15 }}>
                                                {calcs.totalDue >= 0 ? '+' : ''} ${calcs.totalDue.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    {/* Statistics Widget */}
                    <div className="luxury-card" style={{ padding: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Statistics</h2>
                        </div>
                        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            <svg width="160" height="160" viewBox="0 0 160 160">
                                <circle cx="80" cy="80" r="70" fill="none" stroke="var(--bg-slate)" strokeWidth="12" />
                                <circle cx="80" cy="80" r="70" fill="none" stroke="var(--primary)" strokeWidth="12" strokeDasharray="300 440" strokeLinecap="round" transform="rotate(-90 80 80)" />
                                <circle cx="80" cy="80" r="70" fill="none" stroke="#6366f1" strokeWidth="12" strokeDasharray="100 440" strokeLinecap="round" transform="rotate(150 80 80)" />
                            </svg>
                            <div style={{ position: 'absolute', textAlign: 'center' }}>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Success Rate</div>
                                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-main)' }}>92%</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Transactions / Contacts */}
                    <div className="luxury-card" style={{ padding: 32 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', margin: 0, marginBottom: 20 }}>Quick Transactions</h2>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 24, overflowX: 'auto', paddingBottom: 8 }}>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} style={{ width: 44, height: 44, borderRadius: '50%', background: `hsl(${i * 60}, 70%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                    {String.fromCharCode(64 + i)}
                                </div>
                            ))}
                        </div>
                        <button className="luxury-button" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                            View all beneficiary
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ title, value, icon, color, bg }: any) {
    return (
        <div className="luxury-card" style={{ display: 'flex', alignItems: 'center', padding: '24px', gap: 20 }}>
            <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color,
                flexShrink: 0
            }}>
                {icon}
            </div>
            <div>
                <div style={{ color: 'var(--text-dim)', fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{title}</div>
                <div style={{ color: 'var(--text-main)', fontSize: 20, fontWeight: 700 }}>{value}</div>
            </div>
        </div>
    );
}
