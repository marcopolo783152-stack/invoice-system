'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, DollarSign, ExternalLink, ArrowRight } from 'lucide-react';
import { getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';
import { Customer } from '@/lib/customer-storage';
import { formatCurrency } from '@/lib/calculations';
import Link from 'next/link';
import { formatDateMMDDYYYY } from '@/lib/date-utils';

interface CustomerHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer;
}

export default function CustomerHistoryModal({ isOpen, onClose, customer }: CustomerHistoryModalProps) {
    const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && customer) {
            loadHistory();
        }
    }, [isOpen, customer]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const allInvoices = await getAllInvoices();
            // Filter by customer name - flexible matching
            const customerInvoices = allInvoices.filter(inv => {
                const invoiceName = inv.data.soldTo.name.toLowerCase().trim();
                const currentName = customer.name.toLowerCase().trim();
                return invoiceName === currentName || invoiceName.includes(currentName) || currentName.includes(invoiceName);
            });

            // Sort by date desc
            customerInvoices.sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

            setInvoices(customerInvoices);
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 2000, // Higher than AddressBook
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(4px)',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                background: 'white',
                width: '90%',
                maxWidth: 800,
                maxHeight: '85vh',
                borderRadius: 24,
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'modalEnter 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px 32px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#fff'
                }}>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1f3c', margin: 0 }}>Customer History</h2>
                        <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: 13 }}>Transactions for <span style={{ fontWeight: 600, color: '#3b82f6' }}>{customer.name}</span></p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '50%',
                            width: 36,
                            height: 36,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#64748b'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading history...</div>
                    ) : invoices.length === 0 ? (
                        <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
                            <FileText size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
                            <p>No invoices found for this customer.</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                                <tr>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Date</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Invoice #</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Type</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Total</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((inv) => (
                                    <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '16px 24px', color: '#334155' }}>
                                            {formatDateMMDDYYYY(inv.data.date)}
                                        </td>
                                        <td style={{ padding: '16px 24px', fontWeight: 500 }}>
                                            {inv.data.invoiceNumber}
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: 12,
                                                fontSize: 11,
                                                fontWeight: 600,
                                                background: inv.data.documentType === 'CONSIGNMENT' ? '#fff7ed' : inv.data.documentType === 'WASH' ? '#f0f9ff' : '#ecfdf5',
                                                color: inv.data.documentType === 'CONSIGNMENT' ? '#c2410c' : inv.data.documentType === 'WASH' ? '#0369a1' : '#059669',
                                                border: `1px solid ${inv.data.documentType === 'CONSIGNMENT' ? '#fdba74' : inv.data.documentType === 'WASH' ? '#bae6fd' : '#86efac'}`
                                            }}>
                                                {inv.data.documentType || 'INVOICE'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                                            {formatCurrency(inv.data.totalDue)}
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                            <Link
                                                href={`/invoices/view?id=${inv.id}`}
                                                target="_blank"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    color: '#3b82f6',
                                                    textDecoration: 'none',
                                                    fontWeight: 500,
                                                    fontSize: 12,
                                                    padding: '6px 12px',
                                                    background: '#eff6ff',
                                                    borderRadius: 6
                                                }}
                                            >
                                                View/Edit <ArrowRight size={12} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            <style jsx>{`
                @keyframes modalEnter {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
