'use client';

import React, { useState, useEffect } from 'react';
import { getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';
import { calculateInvoice } from '@/lib/calculations';
import Link from 'next/link';
import { Search, Plus, FileText, Download, Trash2 } from 'lucide-react';

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
    const [filteredInvoices, setFilteredInvoices] = useState<SavedInvoice[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'INVOICE' | 'CONSIGNMENT'>('ALL');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
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
        if (inv.data.terms?.toLowerCase().includes('paid')) return { bg: '#ecfdf5', text: '#059669', label: 'Paid' };
        return { bg: '#eff6ff', text: '#3b82f6', label: 'Invoice' };
    };

    return (
        <div style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }}>
            <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1f3c', marginBottom: 8 }}>Invoices</h1>
                    <p style={{ color: '#666' }}>Manage and view all your invoices</p>
                </div>
                <Link
                    href="/invoices/new"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: 12,
                        textDecoration: 'none',
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(118, 75, 162, 0.3)'
                    }}
                >
                    <Plus size={20} />
                    New Invoice
                </Link>
            </header>

            {/* Controls Bar */}
            <div style={{ marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
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
                        padding: '12px 16px',
                        borderRadius: 12,
                        border: '1px solid #e5e7eb',
                        fontSize: 14,
                        outline: 'none',
                        cursor: 'pointer',
                        background: 'white'
                    }}
                >
                    <option value="ALL">All Types</option>
                    <option value="INVOICE">Invoices</option>
                    <option value="CONSIGNMENT">Consignments</option>
                </select>

                <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    style={{
                        padding: '12px 16px',
                        borderRadius: 12,
                        border: '1px solid #e5e7eb',
                        fontSize: 14,
                        outline: 'none',
                        cursor: 'pointer',
                        background: 'white'
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
                            return (
                                <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s' }} className="hover:bg-gray-50">
                                    <td style={{ padding: '20px 24px', fontWeight: 600, color: '#1a1f3c' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ padding: 8, background: '#eff6ff', borderRadius: 8, color: '#3b82f6' }}>
                                                <FileText size={16} />
                                            </div>
                                            {inv.data.invoiceNumber}
                                        </div>
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
                                            <button style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#4b5563' }} title="Download PDF">
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredInvoices.length === 0 && (
                            <tr>
                                <td colSpan={7} style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
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
