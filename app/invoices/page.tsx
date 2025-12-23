'use client';

import React, { useState, useEffect } from 'react';
import { getAllInvoices, SavedInvoice, exportAddressBook, deleteInvoice, deleteMultipleInvoices, getDeletedInvoices, restoreMultipleInvoices, permanentlyDeleteInvoices } from '@/lib/invoice-storage';
import { calculateInvoice } from '@/lib/calculations';
import { exportInvoicesAsPDFs, ExportProgress } from '@/lib/bulk-export';
import { requestSecurityConfirmation } from '@/lib/email-service';
import Link from 'next/link';
import { Search, Plus, FileText, Download, Trash2, Users, FileDown, RotateCcw, AlertTriangle, Archive, Settings, ChevronDown } from 'lucide-react';

export default function InvoicesPage() {
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
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        loadData();
    }, [viewMode]);

    async function loadData() {
        setLoading(true);
        if (viewMode === 'active') {
            const data = await getAllInvoices();
            setInvoices(data);
        } else {
            const data = getDeletedInvoices();
            setInvoices(data);
        }
        setLoading(false);
        setSelectedIds([]);
    }

    useEffect(() => {
        let result = [...invoices];

        // 1. Text Search
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(inv =>
                inv.data.invoiceNumber.toLowerCase().includes(lowerTerm) ||
                inv.data.soldTo.name.toLowerCase().includes(lowerTerm)
            );
        }

        // 2. Type Filter
        if (typeFilter !== 'ALL') {
            result = result.filter(inv =>
                (inv.data.documentType || 'INVOICE') === typeFilter
            );
        }

        // 3. Sorting
        result.sort((a, b) => {
            const dateA = new Date(a.data.date).getTime();
            const dateB = new Date(b.data.date).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        setFilteredInvoices(result);
    }, [searchTerm, typeFilter, sortOrder, invoices]);

    if (loading) return <div style={{ padding: 40, color: '#666' }}>Loading invoices...</div>;

    const getStatusColor = (inv: SavedInvoice) => {
        if (inv.data.documentType === 'CONSIGNMENT') return { bg: '#fff7ed', text: '#c2410c', label: 'Consignment' };
        if (inv.data.documentType === 'WASH') return { bg: '#e0f2fe', text: '#0284c7', label: 'Wash' };
        if (inv.data.terms?.toLowerCase().includes('paid')) return { bg: '#ecfdf5', text: '#059669', label: 'Paid' };
        return { bg: '#eff6ff', text: '#3b82f6', label: 'Invoice' };
    };

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
            setSelectedIds(filteredInvoices.map(inv => inv.id));
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
        } else {
            if (!confirm(`Permanently delete ${selectedIds.length} invoices? This cannot be undone.`)) return;
            const key = prompt('Enter security key to confirm permanent deletion:');
            if (key !== 'Marcopolo$') return alert('Incorrect security key');

            permanentlyDeleteInvoices(selectedIds);
            loadData();
        }
    };

    const handleRestoreSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Restore ${selectedIds.length} invoices?`)) return;

        await restoreMultipleInvoices(selectedIds);
        loadData();
    };

    return (
        <div style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }}>
            <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1f3c', marginBottom: 8 }}>
                        {viewMode === 'active' ? 'Invoices' : 'Recycle Bin'}
                    </h1>
                    <p style={{ color: '#666' }}>
                        {viewMode === 'active' ? 'Manage and view all your invoices' : 'View and restore deleted invoices'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    {viewMode === 'active' ? (
                        <>
                            {/* New Invoice (Primary) */}
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

                            {/* Settings Dropdown */}
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowSettings(!showSettings)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '0 16px', borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer',
                                        height: 48
                                    }}
                                >
                                    <Settings size={20} />
                                    <ChevronDown size={16} />
                                </button>

                                {showSettings && (
                                    <div style={{
                                        position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 220,
                                        background: 'white', borderRadius: 12, border: '1px solid #e2e8f0',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                        zIndex: 50, overflow: 'hidden', padding: 4
                                    }}>
                                        <button
                                            onClick={() => { setViewMode('bin'); setShowSettings(false); }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 12,
                                                width: '100%', padding: '12px 16px', border: 'none', background: 'transparent',
                                                textAlign: 'left', cursor: 'pointer', color: '#475569', fontSize: 14, fontWeight: 500,
                                                borderRadius: 8
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <Trash2 size={18} /> Recycle Bin
                                        </button>
                                        <button
                                            onClick={() => { handleExportAddressBook(); setShowSettings(false); }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 12,
                                                width: '100%', padding: '12px 16px', border: 'none', background: 'transparent',
                                                textAlign: 'left', cursor: 'pointer', color: '#475569', fontSize: 14, fontWeight: 500,
                                                borderRadius: 8
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <Users size={18} /> Address Book
                                        </button>
                                        <button
                                            onClick={() => { handleExportAllPDFs(); setShowSettings(false); }}
                                            disabled={isExporting}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 12,
                                                width: '100%', padding: '12px 16px', border: 'none', background: 'transparent',
                                                textAlign: 'left', cursor: 'pointer', color: '#475569', fontSize: 14, fontWeight: 500,
                                                borderRadius: 8, opacity: isExporting ? 0.7 : 1
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <FileDown size={18} /> {isExporting ? 'Exporting...' : 'Export PDFs'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <button
                            onClick={() => setViewMode('active')}
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
                                    onClick={handleDeleteSelected}
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
                                    checked={filteredInvoices.length > 0 && selectedIds.length === filteredInvoices.length}
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
                        {filteredInvoices.map((inv) => {
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
                                    <td style={{ padding: '20px 24px', color: '#4b5563', fontWeight: 500 }}>{inv.data.soldTo.name}</td>
                                    <td style={{ padding: '20px 24px', color: '#6b7280' }}>{inv.data.date}</td>
                                    <td style={{ padding: '20px 24px', color: '#6b7280' }}>{inv.data.items.length} items</td>
                                    <td style={{ padding: '20px 24px', fontWeight: 700, color: '#1a1f3c' }}>${calculateInvoice(inv.data).totalDue.toLocaleString()}</td>
                                    <td style={{ padding: '20px 24px' }}>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <Link href={`/invoices/view?id=${inv.id}`} style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#4b5563', display: 'flex', alignItems: 'center' }} title="View Invoice">
                                                <FileText size={16} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredInvoices.length === 0 && (
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
