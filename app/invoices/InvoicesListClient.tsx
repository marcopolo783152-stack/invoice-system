'use client';

import React, { useState, useEffect, Suspense } from 'react';
import {
    getAllInvoices, SavedInvoice, exportAddressBook, deleteInvoice, deleteMultipleInvoices, getDeletedInvoicesAsync, permanentlyDeleteInvoices,
    restoreMultipleInvoices,
    subscribeToInvoices,
    diagnoseAndSync
} from '@/lib/invoice-storage';
import { isFirebaseConfigured } from '@/lib/firebase';
import { calculateInvoice } from '@/lib/calculations';
// Use type import to avoid runtime side effects
import type { ExportProgress } from '@/lib/bulk-export';
import { requestSecurityConfirmation } from '@/lib/email-service';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { formatDateMMDDYYYY } from '@/lib/date-utils';
import { Search, Plus, FileText, Download, Trash2, Users, FileDown, RotateCcw, AlertTriangle, Archive, Printer } from 'lucide-react';
import Login from '@/components/Login';

function InvoicesListContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
    const [filteredInvoices, setFilteredInvoices] = useState<SavedInvoice[]>([]);
    const [viewMode, setViewMode] = useState<'active' | 'drafts' | 'bin'>('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'INVOICE' | 'CONSIGNMENT' | 'WASH'>('ALL');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [binInvoices, setBinInvoices] = useState<SavedInvoice[]>([]); // New state for bin invoices

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (viewMode === 'bin') {
            setLoading(true);
            getDeletedInvoicesAsync().then(data => {
                setBinInvoices(data);
                setLoading(false);
            });
        } else {
            setBinInvoices([]); // Clear bin invoices when not in bin view
        }
    }, [viewMode]);

    useEffect(() => {
        const view = searchParams.get('view');
        if (view === 'bin') setViewMode('bin');
        else if (view === 'drafts') setViewMode('drafts');
        else setViewMode('active');
    }, [searchParams]);

    const handleSetViewMode = (mode: 'active' | 'drafts' | 'bin') => {
        const params = new URLSearchParams(searchParams.toString());
        if (mode === 'bin') params.set('view', 'bin');
        else if (mode === 'drafts') params.set('view', 'drafts');
        else params.delete('view');
        router.push(`/invoices?${params.toString()}`);
    };

    useEffect(() => {
        // Authenticate
        const auth = sessionStorage.getItem('mp-invoice-auth') || localStorage.getItem('mp-invoice-auth');
        const user = sessionStorage.getItem('mp-invoice-user') || localStorage.getItem('mp-invoice-user');

        if (auth === '1' && user) {
            setIsAuthenticated(true);
            try { setCurrentUser(JSON.parse(user)); } catch { }
        } else {
            setIsAuthenticated(false);
            setLoading(false);
            return;
        }

        // Subscription Logic
        let unsubscribe: (() => void) | undefined;

        const setupSubscription = async () => {
            setLoading(true);

            if (viewMode === 'active') {
                // Real-time listener for active invoices
                unsubscribe = subscribeToInvoices((data) => {
                    // Filter OUT drafts for active view
                    const activeOnly = data.filter(i => !i.data.isDraft);
                    setInvoices(activeOnly);
                    setLoading(false);
                });
            } else if (viewMode === 'drafts') {
                // Drafts View
                const activeData = await getAllInvoices();
                const drafts = activeData.filter(i => i.data.isDraft === true);
                setInvoices(drafts);
                setLoading(false);
            } else {
                // Bin logic (local + sync check)
                const binData = await getDeletedInvoicesAsync(); // Use async version
                const activeData = await getAllInvoices();
                const activeIds = new Set(activeData.map(i => i.id));
                const cleanBin = binData.filter(i => !activeIds.has(i.id));
                setInvoices(cleanBin); // Set invoices to cleanBin for display
                setBinInvoices(cleanBin); // Also update binInvoices state
                setLoading(false);
            }
        };

        setupSubscription();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [viewMode]);

    const onLogin = () => {
        setIsAuthenticated(true);
        // Effect will re-run or we can trigger re-fetch if needed
    };

    // Keep loadData for manual refreshes if needed (e.g. after restore)
    async function loadData() {
        if (viewMode === 'active') {
            // Subscription handles this automatically
        } else {
            setLoading(true);
            const binData = await getDeletedInvoicesAsync(); // Use async version
            const activeData = await getAllInvoices();
            const activeIds = new Set(activeData.map(i => i.id));
            const cleanBin = binData.filter(i => !activeIds.has(i.id));
            setInvoices(cleanBin);
            setBinInvoices(cleanBin); // Update binInvoices state
            setLoading(false);
        }
        setSelectedIds([]);
    }

    // Automatic Sync Logic
    useEffect(() => {
        if (!isMounted || !isAuthenticated || !isFirebaseConfigured()) return;

        const performAutoSync = async () => {
            console.log('AUTO-SYNC: Starting background reconciliation...');
            try {
                // We don't alert() here to avoid annoying the user
                const result = await diagnoseAndSync();
                console.log('AUTO-SYNC Result:', result);
                if (result.includes('Successfully synced') || result.includes('Success')) {
                    // loadData(); // The real-time subscription usually handles this, 
                    // but loadData can force a local refresh if needed.
                }
            } catch (e) {
                console.warn('AUTO-SYNC: Silent fail', e);
            }
        };

        // 1. Sync immediately on mount/auth
        performAutoSync();

        // 2. Sync every 30 seconds
        const interval = setInterval(performAutoSync, 30000);

        return () => clearInterval(interval);
    }, [isMounted, isAuthenticated]);

    useEffect(() => {
        let result = [...(viewMode === 'bin' ? binInvoices : invoices)];

        // 1. Text Search
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(inv => {
                const invNum = inv.data?.invoiceNumber || '';
                const custName = inv.data?.soldTo?.name || '';
                const hasMatchingSku = (inv.data?.items || []).some(item =>
                    (item.sku || '').toLowerCase().includes(lowerTerm)
                );
                return invNum.toLowerCase().includes(lowerTerm) ||
                    custName.toLowerCase().includes(lowerTerm) ||
                    hasMatchingSku;
            });
        }

        // 2. Type Filter
        if (typeFilter !== 'ALL') {
            result = result.filter(inv =>
                (inv.data?.documentType || 'INVOICE') === typeFilter
            );
        }

        // 3. Sorting
        result.sort((a, b) => {
            const dateA = new Date(a.data?.date || 0).getTime();
            const dateB = new Date(b.data?.date || 0).getTime();
            // Handle NaN
            const valA = isNaN(dateA) ? 0 : dateA;
            const valB = isNaN(dateB) ? 0 : dateB;
            return sortOrder === 'desc' ? valB - valA : valA - valB;
        });

        setFilteredInvoices(result);
    }, [searchTerm, typeFilter, sortOrder, invoices, binInvoices, viewMode]); // Add binInvoices and viewMode to dependencies

    if (!isMounted || loading) return <div className="p-10 text-gray-500">Loading invoices...</div>;
    if (!isAuthenticated) return <Login onLogin={onLogin} />;

    const getInvoiceStatuses = (inv: SavedInvoice) => {
        const statuses: { bg: string; text: string; label: string }[] = [];
        const isReturned = (inv.data?.returned === true) ||
            (inv.data?.items?.length > 0 && inv.data.items.every(item => item.returned));

        // 1. Kind / Document Type Status
        if (isReturned) {
            statuses.push({ bg: 'rgba(244, 63, 94, 0.1)', text: 'var(--accent-rose)', label: 'Returned' });
        } else if (inv.data?.documentType === 'CONSIGNMENT') {
            statuses.push({ bg: 'rgba(168, 85, 247, 0.1)', text: 'var(--accent-neon)', label: 'Consignment' });
        } else if (inv.data?.documentType === 'WASH') {
            const washStatus = inv.data?.status || 'washing';
            if (washStatus === 'ready') statuses.push({ bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--accent-emerald)', label: 'Ready' });
            else if (washStatus === 'picked_up') statuses.push({ bg: 'rgba(148, 163, 184, 0.1)', text: 'var(--text-muted)', label: 'Picked Up' });
            else statuses.push({ bg: 'rgba(34, 211, 238, 0.1)', text: 'var(--accent-cyber)', label: 'Washing/Repair' });

            // 1b. Pickup Date Status
            if (inv.data?.pickupDate) {
                const pickup = new Date(inv.data.pickupDate);
                const now = new Date();
                const diffTime = pickup.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let bg = 'rgba(251, 191, 36, 0.1)';
                let text = '#fbbf24';

                if (diffDays < 0) { // Overdue
                    bg = 'rgba(244, 63, 94, 0.15)';
                    text = 'var(--accent-rose)';
                } else if (diffDays <= 2) { // Due soon
                    bg = 'rgba(251, 191, 36, 0.2)';
                    text = '#fbbf24';
                }

                statuses.push({
                    bg,
                    text,
                    label: `Due: ${formatDateMMDDYYYY(inv.data.pickupDate)}`
                });
            }
        } else {
            statuses.push({ bg: 'rgba(99, 102, 241, 0.1)', text: 'var(--accent-royal)', label: 'Sale' });
        }

        // 2. Payment Status (Add "Paid" label if applicable)
        if ((inv.data?.terms || '').toLowerCase().includes('paid')) {
            statuses.push({ bg: 'rgba(16, 185, 129, 0.15)', text: 'var(--accent-emerald)', label: 'Paid' });
        }

        return statuses;
    };

    const isSafeToRender = (inv: SavedInvoice) => {
        try {
            if (!inv || typeof inv !== 'object') return false;
            if (!inv.data || typeof inv.data !== 'object') return false;
            if (!inv.data.invoiceNumber || typeof inv.data.invoiceNumber !== 'string') return false;
            if (!inv.data.soldTo || typeof inv.data.soldTo !== 'object') return false;
            if (!inv.data.soldTo.name || typeof inv.data.soldTo.name !== 'string') return false;
            // Optionally check for items array
            if (!Array.isArray(inv.data.items)) return false;
            // Try calculation, but catch errors
            try {
                calculateInvoice(inv.data);
            } catch (e) {
                console.error('Skipping invoice due to calculation error:', inv, e);
                return false;
            }
            return true;
        } catch (e) {
            console.error('Skipping corrupt invoice:', inv, e);
            return false;
        }
    };

    const visibleInvoices = filteredInvoices.filter(isSafeToRender);

    const handleExportAddressBook = () => {
        const csv = exportAddressBook();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'address-book.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportAllPDFs = async () => {
        if (filteredInvoices.length === 0) return alert('No invoices to export');
        if (!confirm(`Export ${filteredInvoices.length} invoices as PDF? This may take a few moments.`)) return;

        const confirmed = await requestSecurityConfirmation('Export All', `Exporting ${filteredInvoices.length} invoices`);
        if (!confirmed) return;

        setIsExporting(true);
        try {
            // Dynamic import to avoid initial bundle size and side effects
            const { exportInvoicesAsPDFs } = await import('@/lib/bulk-export');
            await exportInvoicesAsPDFs(filteredInvoices, setExportProgress);
            alert('Export complete!');
        } catch (e) {
            alert('Export failed');
            console.error(e);
        } finally {
            setIsExporting(false);
            setExportProgress(null);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(visibleInvoices.map(inv => inv.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;

        if (viewMode === 'active' || viewMode === 'drafts') {
            if (!confirm(`Move ${selectedIds.length} invoices to Recycle Bin?`)) return;

            // Optimistic UI Update
            const idsToRemove = selectedIds;
            setInvoices(prev => prev.filter(inv => !idsToRemove.includes(inv.id)));
            setFilteredInvoices(prev => prev.filter(inv => !idsToRemove.includes(inv.id)));
            setSelectedIds([]);

            await deleteMultipleInvoices(idsToRemove);
            loadData();
        }
    };

    const handleRestoreSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Restore ${selectedIds.length} invoices?`)) return;

        await restoreMultipleInvoices(selectedIds);
        loadData();
    };

    const handlePermanentlyDelete = async () => {
        if (selectedIds.length === 0) return;

        const adminKey = prompt('Please enter the Admin Key to permanently delete these items:');
        if (adminKey !== 'Marcopolo$') {
            alert('Incorrect Admin Key. Permanent deletion aborted.');
            return;
        }

        if (confirm(`Permanently delete ${selectedIds.length} selected items? THIS CANNOT BE UNDONE.`)) {
            await permanentlyDeleteInvoices(selectedIds);
            const updatedBin = await getDeletedInvoicesAsync();
            setBinInvoices(updatedBin);
            setSelectedIds([]);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await diagnoseAndSync();
            alert(result);
            if (result.includes('Success')) {
                // Reload data if needed, or let subscription handle it
            }
        } catch (e: any) {
            alert('Sync failed: ' + e.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDeleteSingle = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!confirm('Move this invoice to Recycle Bin?')) return;

        // Optimistic UI Update
        setInvoices(prev => prev.filter(inv => inv.id !== id));
        setFilteredInvoices(prev => prev.filter(inv => inv.id !== id));

        await deleteMultipleInvoices([id]);
        loadData(); // Re-sync just in case
    };

    return (
        <div style={{ padding: 'var(--dashboard-padding)', maxWidth: 1400, margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, flexWrap: 'wrap', gap: 20 }} className="animate-slide-up">
                <div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em', marginBottom: 4 }}>
                        {viewMode === 'bin' ? 'Recycle Bin' : viewMode === 'drafts' ? 'Draft Documents' : 'Invoice Management'}
                    </h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: 16 }}>Manage your high-end transaction records</p>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', background: 'var(--glass-bg)', padding: 4, borderRadius: 14, border: '1px solid var(--glass-border)' }}>
                        {(['active', 'drafts', 'bin'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => handleSetViewMode(mode)}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: 10,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    background: viewMode === mode ? 'var(--primary)' : 'transparent',
                                    color: viewMode === mode ? 'white' : 'var(--text-dim)',
                                    boxShadow: viewMode === mode ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
                marginBottom: 32,
                background: 'var(--glass-bg)',
                padding: 24,
                borderRadius: 24,
                border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(20px)',
                boxShadow: 'inset 0 0 20px rgba(6, 182, 212, 0.05)'
            }} className="animate-slide-up">

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 300 }}>
                        <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                        <input
                            type="text"
                            placeholder="Search by number, customer, or SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px 14px 14px 48px',
                                background: 'var(--bg-void)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: 16,
                                color: 'var(--text-main)',
                                fontSize: 15,
                                outline: 'none',
                                transition: 'all 0.3s',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                            }}
                            className="focus-glow"
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as any)}
                            style={{
                                padding: '12px 16px',
                                background: 'var(--bg-void)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: 12,
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                outline: 'none',
                                fontWeight: 700,
                                fontSize: 13,
                                minWidth: 160,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                            }}
                        >
                            <option value="ALL">All Types</option>
                            <option value="INVOICE">Sale Invoices</option>
                            <option value="CONSIGNMENT">Consignments</option>
                            <option value="WASH">Wash / Repairs</option>
                        </select>

                        <button
                            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                            className="luxury-button"
                            style={{ padding: '12px 20px' }}
                        >
                            Sort: {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: 24 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        {selectedIds.length > 0 && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                {viewMode === 'bin' ? (
                                    <>
                                        <button onClick={handleRestoreSelected} className="luxury-button" style={{ background: 'var(--primary)', color: 'white' }}>
                                            <RotateCcw size={18} style={{ marginRight: 8 }} /> Restore ({selectedIds.length})
                                        </button>
                                        <button onClick={handlePermanentlyDelete} className="luxury-button" style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.2)' }}>
                                            <Trash2 size={18} style={{ marginRight: 8 }} /> Delete Forever
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={handleDeleteSelected} className="luxury-button" style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.2)' }}>
                                        <Trash2 size={18} style={{ marginRight: 8 }} /> Archive ({selectedIds.length})
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={handleSync} disabled={isSyncing} className="luxury-button">
                            <RotateCcw size={18} style={{ marginRight: 8, animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
                            {isSyncing ? 'Syncing...' : 'Sync Cloud'}
                        </button>
                        <button onClick={handleExportAddressBook} className="luxury-button">
                            <Users size={18} style={{ marginRight: 8 }} /> Address Book
                        </button>
                        <button onClick={handleExportAllPDFs} disabled={isExporting} className="luxury-button">
                            <FileDown size={18} style={{ marginRight: 8 }} />
                            {isExporting ? `Exporting...` : 'Export PDFs'}
                        </button>
                        <Link href="/invoices/new" className="luxury-button" style={{ background: 'var(--primary)', color: 'white', border: 'none' }}>
                            <Plus size={20} style={{ marginRight: 8 }} /> New Document
                        </Link>
                    </div>
                </div>
            </div>

            {/* Desktop Table */}
            <div className="mobile-hidden luxury-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <th style={{ padding: '20px 24px', width: 40, borderBottom: '2px solid var(--glass-border)' }}>
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={visibleInvoices.length > 0 && selectedIds.length === visibleInvoices.length}
                                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--primary)' }}
                                />
                            </th>
                            <th style={{ padding: '20px 24px', color: 'var(--text-main)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'left', borderBottom: '2px solid var(--glass-border)' }}>Invoice</th>
                            <th style={{ padding: '20px 24px', color: 'var(--text-main)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'left', borderBottom: '2px solid var(--glass-border)' }}>Status</th>
                            <th style={{ padding: '20px 24px', color: 'var(--text-main)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'left', borderBottom: '2px solid var(--glass-border)' }}>Customer</th>
                            <th style={{ padding: '20px 24px', color: 'var(--text-main)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'left', borderBottom: '2px solid var(--glass-border)' }}>Date</th>
                            <th style={{ padding: '20px 24px', color: 'var(--text-main)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'right', borderBottom: '2px solid var(--glass-border)' }}>Items</th>
                            <th style={{ padding: '20px 24px', color: 'var(--text-main)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'right', borderBottom: '2px solid var(--glass-border)' }}>Amount</th>
                            <th style={{ padding: '20px 24px', color: 'var(--text-main)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'right', borderBottom: '2px solid var(--glass-border)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleInvoices.map((inv) => {
                            const isSelected = selectedIds.includes(inv.id);
                            const calcs = calculateInvoice(inv.data || {} as any);
                            return (
                                <tr key={inv.id} style={{
                                    borderBottom: '1px solid var(--glass-border)',
                                    transition: 'all 0.3s',
                                    background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                                }} className="hover-row">
                                    <td style={{ padding: '20px 24px' }}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleSelect(inv.id)}
                                            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--primary)' }}
                                        />
                                    </td>
                                    <td style={{ padding: '20px 24px' }}>
                                        <Link href={`/invoices/view?id=${inv.id}`} style={{ textDecoration: 'none' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ padding: 8, background: 'var(--glass-bg)', borderRadius: 10, color: 'var(--primary)', border: '1px solid var(--glass-border)' }}>
                                                    <FileText size={16} />
                                                </div>
                                                <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 15 }}>{inv.data.invoiceNumber}</span>
                                            </div>
                                        </Link>
                                    </td>
                                    <td style={{ padding: '20px 24px' }}>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {getInvoiceStatuses(inv).map((status, idx) => (
                                                <span key={idx} style={{
                                                    padding: '4px 10px',
                                                    borderRadius: 8,
                                                    fontSize: 10,
                                                    fontWeight: 800,
                                                    background: `${status.bg}20`,
                                                    color: status.text,
                                                    border: `1px solid ${status.text}30`,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em'
                                                }}>
                                                    {status.label}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 24px', color: 'var(--text-muted)', fontWeight: 500 }}>{inv.data?.soldTo?.name || 'Anonymous Customer'}</td>
                                    <td style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: 14 }}>{formatDateMMDDYYYY(inv.data?.date)}</td>
                                    <td style={{ padding: '20px 24px', textAlign: 'right', color: 'var(--text-dim)' }}>{(inv.data?.items || []).length} items</td>
                                    <td style={{ padding: '20px 24px', textAlign: 'right', fontWeight: 800, color: 'var(--text-main)', fontSize: 16 }}>
                                        ${calcs.totalDue.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => {
                                                    const width = 1000;
                                                    const height = 800;
                                                    const left = (window.screen.width - width) / 2;
                                                    const top = (window.screen.height - height) / 2;
                                                    window.open(
                                                        `/invoices/print?id=${inv.id}`,
                                                        '_blank',
                                                        `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
                                                    );
                                                }}
                                                className="luxury-button"
                                                style={{ padding: '8px', borderRadius: 10, width: 36, height: 36, justifyContent: 'center' }}
                                                title="Print Professional Invoice"
                                            >
                                                <Printer size={18} />
                                            </button>
                                            <Link href={`/invoices/view?id=${inv.id}`} className="luxury-button" style={{ padding: '8px', borderRadius: 10, width: 36, height: 36, justifyContent: 'center' }} title="View Details">
                                                <FileText size={18} />
                                            </Link>
                                            {(viewMode === 'active' || viewMode === 'drafts') && (
                                                <button
                                                    onClick={(e) => handleDeleteSingle(inv.id, e)}
                                                    className="luxury-button"
                                                    style={{ padding: '8px', borderRadius: 10, width: 36, height: 36, justifyContent: 'center', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)', border: '1px solid rgba(244, 63, 94, 0.2)' }}
                                                    title="Archive Record"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {visibleInvoices.length === 0 && (
                            <tr>
                                <td colSpan={8} style={{ padding: 80, textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                                        <div style={{ padding: 24, background: 'var(--glass-bg)', borderRadius: '50%', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>
                                            <Search size={40} />
                                        </div>
                                        <div style={{ color: 'var(--text-dim)', fontSize: 18, fontWeight: 600 }}>No documents match the filter criteria</div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="mobile-visible" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {visibleInvoices.map((inv) => {
                    const calcs = calculateInvoice(inv.data || {} as any);
                    return (
                        <div key={inv.id}
                            onClick={() => router.push(`/invoices/view?id=${inv.id}`)}
                            className="luxury-card"
                            style={{ padding: 20, cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div>
                                    <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', display: 'block', letterSpacing: '-0.02em' }}>{inv.data.invoiceNumber}</span>
                                    <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{inv.data.date}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    {getInvoiceStatuses(inv).map((status, idx) => (
                                        <span key={idx} style={{
                                            padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800,
                                            background: status.bg, color: status.text, border: `1px solid ${status.text}30`, textTransform: 'uppercase'
                                        }}>
                                            {status.label}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>{inv.data?.soldTo?.name || 'Anonymous Customer'}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>{(inv.data?.items || []).length} items listed</div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: 16 }}>
                                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                                    ${calcs.totalDue.toLocaleString()}
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <div style={{ padding: 10, background: 'var(--glass-bg)', borderRadius: 12, color: 'var(--primary)', border: '1px solid var(--glass-border)' }}>
                                        <FileText size={20} />
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteSingle(inv.id, e)}
                                        className="luxury-button"
                                        style={{ padding: 10, background: 'rgba(244, 63, 94, 0.15)', borderRadius: 12, color: 'var(--accent-rose)', border: '1px solid rgba(244, 63, 94, 0.2)', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {visibleInvoices.length === 0 && (
                    <div className="luxury-card" style={{ padding: 60, textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-dim)', fontSize: 16, fontWeight: 600 }}>No results found</div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default InvoicesListContent;
