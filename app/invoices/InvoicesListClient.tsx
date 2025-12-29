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
import { Search, Plus, FileText, Download, Trash2, Users, FileDown, RotateCcw, AlertTriangle, Archive, Printer } from 'lucide-react';
import Login from '@/components/Login';

function InvoicesListContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
    const [filteredInvoices, setFilteredInvoices] = useState<SavedInvoice[]>([]);
    const [viewMode, setViewMode] = useState<'active' | 'bin'>('active');
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
        const view = searchParams.get('view') === 'bin' ? 'bin' : 'active';
        setViewMode(view);
    }, [searchParams]);

    const handleSetViewMode = (mode: 'active' | 'bin') => {
        const params = new URLSearchParams(searchParams.toString());
        if (mode === 'bin') params.set('view', 'bin');
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
                    setInvoices(data);
                    setLoading(false);
                });
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
        let result = [...(viewMode === 'active' ? invoices : binInvoices)]; // Use binInvoices for bin view

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

    const getStatusColor = (inv: SavedInvoice) => {
        // ... (this logic is fine)
        if (inv.data?.documentType === 'CONSIGNMENT') return { bg: '#fff7ed', text: '#c2410c', label: 'Consignment' };
        if (inv.data?.documentType === 'WASH') return { bg: '#e0f2fe', text: '#0284c7', label: 'Wash' };
        if ((inv.data?.terms || '').toLowerCase().includes('paid')) return { bg: '#ecfdf5', text: '#059669', label: 'Paid' };
        return { bg: '#eff6ff', text: '#3b82f6', label: 'Sale' };
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

        if (viewMode === 'active') {
            if (!confirm(`Move ${selectedIds.length} invoices to Recycle Bin?`)) return;
            await deleteMultipleInvoices(selectedIds);
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

    return (
        <div style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }}>
            <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1f3c', marginBottom: 8 }}>
                        {viewMode === 'active' ? 'Invoices' : 'Recycle Bin'}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <p style={{ color: '#64748b', fontSize: 16 }}>
                            {viewMode === 'active' ? 'Manage and view all your invoices' : 'View and restore deleted invoices'}
                        </p>
                        {/* Sync button hidden - system is now autonomous */}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {/* Simplified Status */}

                    {viewMode === 'active' ? (
                        <>
                            <button
                                onClick={() => {
                                    setLoading(true);
                                    window.location.reload(); // Hard refresh to ensure full sync
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer',
                                    height: 48
                                }}
                                title="Force Refresh / Sync"
                            >
                                <RotateCcw size={20} />
                            </button>
                            <Link
                                href="/invoices/new"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white', padding: '12px 24px', borderRadius: 12, textDecoration: 'none', fontWeight: 600,
                                    boxShadow: '0 4px 12px rgba(118, 75, 162, 0.3)',
                                    height: 48
                                }}
                            >
                                <Plus size={20} /> New Invoice
                            </Link>
                        </>
                    ) : (
                        <button
                            onClick={() => handleSetViewMode('active')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '12px 24px', borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer',
                                height: 48
                            }}
                        >
                            <FileText size={20} /> Back to Invoices
                        </button>
                    )}
                </div>
            </header>

            {isExporting && exportProgress && (
                <div style={{ marginBottom: 20, padding: 16, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd', color: '#0369a1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span>{exportProgress.status}</span>
                        <span>{Math.round(exportProgress.percentage)}%</span>
                    </div>
                    <div style={{ height: 6, background: '#e0f2fe', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${exportProgress.percentage}%`, background: '#0284c7', transition: 'width 0.3s' }} />
                    </div>
                </div>
            )}

            {/* Controls Bar */}
            <div style={{ marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                {selectedIds.length > 0 && (
                    <div style={{ display: 'flex', gap: 12 }}>
                        {viewMode === 'active' ? (
                            <button
                                onClick={handleDeleteSelected}
                                style={{
                                    padding: '12px 16px', borderRadius: 12, background: '#fee2e2', color: '#ef4444', border: 'none', fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 8
                                }}
                            >
                                <Trash2 size={18} /> Delete ({selectedIds.length})
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleRestoreSelected}
                                    style={{
                                        padding: '12px 16px', borderRadius: 12, background: '#dcfce7', color: '#166534', border: 'none', fontWeight: 600, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 8
                                    }}
                                >
                                    <RotateCcw size={18} /> Restore ({selectedIds.length})
                                </button>
                                <button
                                    onClick={handlePermanentlyDelete}
                                    style={{
                                        padding: '12px 16px', borderRadius: 12, background: '#fee2e2', color: '#ef4444', border: 'none', fontWeight: 600, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 8
                                    }}
                                >
                                    <AlertTriangle size={18} /> Delete Forever ({selectedIds.length})
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: 300 }}>
                    <Search size={20} color="#9ca3af" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="Search by invoice # or customer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 12px 12px 48px',
                            borderRadius: 12,
                            border: '1px solid #e5e7eb',
                            fontSize: 16,
                            outline: 'none',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    />
                </div>

                {/* Filters */}
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    style={{
                        padding: '12px 16px', borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', cursor: 'pointer', background: 'white'
                    }}
                >
                    <option value="ALL">All Types</option>
                    <option value="INVOICE">Invoices</option>
                    <option value="CONSIGNMENT">Consignments</option>
                    <option value="WASH">Wash Invoices</option>
                </select>

                <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    style={{
                        padding: '12px 16px', borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', cursor: 'pointer', background: 'white'
                    }}
                >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                </select>
            </div>

            {/* Invoice Table */}
            <div style={{ background: 'white', borderRadius: 24, padding: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left', background: '#f9fafb' }}>
                            <th style={{ padding: '16px 24px', width: 40 }}>
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={visibleInvoices.length > 0 && selectedIds.length === visibleInvoices.length}
                                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                                />
                            </th>
                            <th style={{ padding: '16px 24px', color: '#6b7280', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoice #</th>
                            <th style={{ padding: '16px 24px', color: '#6b7280', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                            <th style={{ padding: '16px 24px', color: '#6b7280', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</th>
                            <th style={{ padding: '16px 24px', color: '#6b7280', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                            <th style={{ padding: '16px 24px', color: '#6b7280', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items</th>
                            <th style={{ padding: '16px 24px', color: '#6b7280', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                            <th style={{ padding: '16px 24px', color: '#6b7280', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleInvoices.map((inv) => {
                            const status = getStatusColor(inv);
                            const isSelected = selectedIds.includes(inv.id);
                            return (
                                <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s', background: isSelected ? '#f0f9ff' : 'transparent' }} className="hover:bg-gray-50">
                                    <td style={{ padding: '20px 24px' }}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleSelect(inv.id)}
                                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td style={{ padding: '20px 24px', fontWeight: 600, color: '#1a1f3c' }}>
                                        <Link href={`/invoices/view?id=${inv.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                <div style={{ padding: 8, background: '#eff6ff', borderRadius: 8, color: '#3b82f6' }}>
                                                    <FileText size={16} />
                                                </div>
                                                <span style={{ borderBottom: '1px dotted #3b82f6' }}>{inv.data.invoiceNumber}</span>
                                            </div>
                                        </Link>
                                    </td>
                                    <td style={{ padding: '20px 24px' }}>
                                        <span style={{
                                            padding: '6px 12px',
                                            borderRadius: 20,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            background: status.bg,
                                            color: status.text
                                        }}>
                                            {status.label}
                                        </span>
                                    </td>
                                    <td style={{ padding: '20px 24px', color: '#4b5563', fontWeight: 500 }}>{inv.data?.soldTo?.name || 'Unknown'}</td>
                                    <td style={{ padding: '20px 24px', color: '#6b7280' }}>{inv.data?.date || ''}</td>
                                    <td style={{ padding: '20px 24px', color: '#6b7280' }}>{(inv.data?.items || []).length} items</td>
                                    <td style={{ padding: '20px 24px', fontWeight: 700, color: '#1a1f3c' }}>${calculateInvoice(inv.data || {} as any).totalDue.toLocaleString()}</td>
                                    <td style={{ padding: '20px 24px' }}>
                                        <div style={{ display: 'flex', gap: 8 }}>
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
                                                style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#4b5563', display: 'flex', alignItems: 'center' }}
                                                title="Print Invoice"
                                            >
                                                <Printer size={16} />
                                            </button>
                                            <Link href={`/invoices/view?id=${inv.id}`} style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#4b5563', display: 'flex', alignItems: 'center' }} title="View Invoice">
                                                <FileText size={16} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {visibleInvoices.length === 0 && (
                            <tr>
                                <td colSpan={8} style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                                        <div style={{ padding: 20, background: '#f3f4f6', borderRadius: '50%' }}>
                                            <Search size={32} color="#9ca3af" />
                                        </div>
                                        <div>No invoices found matching your criteria</div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default InvoicesListContent;
