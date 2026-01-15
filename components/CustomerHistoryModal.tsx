'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Calendar, DollarSign, ExternalLink, ArrowRight, Printer } from 'lucide-react';
import { getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';
import { Customer } from '@/lib/customer-storage';
import { formatCurrency, calculateInvoice } from '@/lib/calculations';
import Link from 'next/link';
import { formatDateMMDDYYYY } from '@/lib/date-utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface CustomerHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer;
}

interface StatementItem {
    id: string;
    date: string;
    description: string;
    type: 'INVOICE' | 'PAYMENT' | 'RETURN';
    debit?: number;
    credit?: number;
    balance: number;
    invoiceId?: string; // For linking
    reference?: string;
}

export default function CustomerHistoryModal({ isOpen, onClose, customer }: CustomerHistoryModalProps) {
    const [transactions, setTransactions] = useState<StatementItem[]>([]);
    const [loading, setLoading] = useState(true);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && customer) {
            loadStatement();
        }
    }, [isOpen, customer]);

    const loadStatement = async () => {
        setLoading(true);
        try {
            const allInvoices = await getAllInvoices();
            // Filter by customer name - flexible matching
            const customerInvoices = allInvoices.filter(inv => {
                const invoiceName = inv.data.soldTo.name.toLowerCase().trim();
                const currentName = customer.name.toLowerCase().trim();
                return invoiceName === currentName || invoiceName.includes(currentName) || currentName.includes(invoiceName);
            });

            const items: StatementItem[] = [];

            customerInvoices.forEach(inv => {
                const calculations = calculateInvoice(inv.data);

                // 1. Audit Intial Invoice Amount (Debit)
                // Use totalDue for Consignment/Sale as the debit amount
                // But wait, if consignment, totalDue is sum of prices. 
                // Let's rely on totalDue from calculations which accounts for logic.
                // However, for Consignment, only SOLD items are truly "debited" in strict accounting?
                // But the user sees the whole consignment list.
                // Re-reading user request: "history... charges... payment... date... note"
                // Let's stick to: 
                // - Invoice Creation: Total Value (Debit)
                // - Payments: Credit

                // Invoice Entry
                items.push({
                    id: inv.id,
                    date: inv.data.date,
                    description: `Invoice #${inv.data.invoiceNumber} (${inv.data.documentType})`,
                    type: 'INVOICE',
                    debit: calculations.totalDue,
                    balance: 0, // calc later
                    invoiceId: inv.id
                });

                // Payments (Credits)
                if (inv.data.payments && inv.data.payments.length > 0) {
                    inv.data.payments.forEach((p, idx) => {
                        items.push({
                            id: `${inv.id}_pay_${idx}`,
                            date: p.date,
                            description: `Payment: ${p.method} ${p.note ? `(${p.note})` : ''} - Ref: #${inv.data.invoiceNumber}`,
                            type: 'PAYMENT',
                            credit: p.amount,
                            balance: 0,
                            invoiceId: inv.id
                        });
                    });
                }

                // Returns (Credits) - If items were returned, that reduces the amount owed
                if (calculations.returnedAmount > 0) {
                    items.push({
                        id: `${inv.id}_return`,
                        date: inv.data.date, // Returns often happen later but we might not have a specific return date per item effortlessly. 
                        // Wait, items don't have return date. We'll use Invoice Date or Today? 
                        // Using Invoice Date is safest fallback or the invoice's last updated date?
                        // Let's use Invoice Date for now as 'Correction' or 'Return'
                        description: `Return Items - Ref: #${inv.data.invoiceNumber}`,
                        type: 'RETURN',
                        credit: calculations.returnedAmount,
                        balance: 0,
                        invoiceId: inv.id
                    });
                }
            });

            // Sort by Date Ascending
            items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Calculate Running Balance
            let runningBalance = 0;
            items.forEach(item => {
                if (item.debit) runningBalance += item.debit;
                if (item.credit) runningBalance -= item.credit;
                item.balance = runningBalance;
            });

            // If we want to show most recent at top, we reverse AFTER calculation
            // User probably wants most recent at top for viewing, but oldest at top for statement reading?
            // "History" usually implies chronological. Statements are usually chrono.
            // Let's keep Chronological ASC for the statement format.

            setTransactions(items);
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        if (!contentRef.current) return;

        try {
            const canvas = await html2canvas(contentRef.current, {
                scale: 2,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'in',
                format: 'letter'
            });

            const pdfWidth = 8.5;
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);

            // Open in new tab instead of saving
            const pdfBlob = pdf.output('blob');
            const blobUrl = URL.createObjectURL(pdfBlob);
            window.open(blobUrl, '_blank');

            // Optional: Clean up URL after a delay (not strictly necessary for simple blobs but good practice)
            // setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

        } catch (error) {
            console.error('Print failed', error);
            alert('Failed to generate PDF statement');
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
            zIndex: 2000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(4px)',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                background: 'white',
                width: '90%',
                maxWidth: 900,
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
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1f3c', margin: 0 }}>Customer Statement</h2>
                        <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: 13 }}>Transactions for <span style={{ fontWeight: 600, color: '#3b82f6' }}>{customer.name}</span></p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            onClick={handlePrint}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 16px',
                                background: '#1e293b',
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            <Printer size={16} /> Print Report
                        </button>
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
                </div>

                {/* Content - Scrollable */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: '#f8fafc' }}>

                    {/* Printable Area */}
                    <div ref={contentRef} style={{ background: 'white', padding: 32, borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>

                        {/* Statement Header */}
                        <div style={{ marginBottom: 32, borderBottom: '2px solid #e2e8f0', paddingBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>Statement of Account</h1>
                                    <div style={{ color: '#64748b', fontSize: 13 }}>
                                        Date: {new Date().toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{customer.name}</div>
                                    <div style={{ color: '#64748b', fontSize: 13 }}>{customer.address}</div>
                                    <div style={{ color: '#64748b', fontSize: 13 }}>{customer.city}, {customer.state} {customer.zip}</div>
                                    <div style={{ color: '#64748b', fontSize: 13 }}>{customer.phone}</div>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Generating statement...</div>
                        ) : transactions.length === 0 ? (
                            <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
                                <FileText size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
                                <p>No transactions found for this customer.</p>
                            </div>
                        ) : (
                            <>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '12px 8px', textAlign: 'left', color: '#64748b', fontWeight: 600, width: '15%' }}>DATE</th>
                                            <th style={{ padding: '12px 8px', textAlign: 'left', color: '#64748b', fontWeight: 600, width: '40%' }}>DESCRIPTION</th>
                                            <th style={{ padding: '12px 8px', textAlign: 'right', color: '#64748b', fontWeight: 600, width: '15%' }}>CHARGES</th>
                                            <th style={{ padding: '12px 8px', textAlign: 'right', color: '#64748b', fontWeight: 600, width: '15%' }}>PAYMENTS</th>
                                            <th style={{ padding: '12px 8px', textAlign: 'right', color: '#64748b', fontWeight: 600, width: '15%' }}>BALANCE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((item, idx) => (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fcfcfc' }}>
                                                <td style={{ padding: '12px 8px', color: '#334155' }}>
                                                    {formatDateMMDDYYYY(item.date)}
                                                </td>
                                                <td style={{ padding: '12px 8px', fontWeight: 500, color: '#1e293b' }}>
                                                    {item.description}
                                                    {item.invoiceId && (
                                                        <Link
                                                            href={`/invoices/view?id=${item.invoiceId}`}
                                                            target="_blank"
                                                            className="print-hide"
                                                            style={{ marginLeft: 8, color: '#3b82f6', textDecoration: 'none', fontSize: 11, fontWeight: 600 }}
                                                        >
                                                            [VIEW]
                                                        </Link>
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 500, color: '#334155' }}>
                                                    {item.debit ? formatCurrency(item.debit) : '-'}
                                                </td>
                                                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 500, color: '#059669' }}>
                                                    {item.credit ? formatCurrency(item.credit) : '-'}
                                                </td>
                                                <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                                                    {formatCurrency(item.balance)}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Total Row */}
                                        <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
                                            <td colSpan={2} style={{ padding: '16px 8px', textAlign: 'right', fontWeight: 700, fontSize: 13 }}>ENDING BALANCE:</td>
                                            <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: 600 }}>
                                                {formatCurrency(transactions.reduce((acc, curr) => acc + (curr.debit || 0), 0))}
                                            </td>
                                            <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                                                {formatCurrency(transactions.reduce((acc, curr) => acc + (curr.credit || 0), 0))}
                                            </td>
                                            <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: 800, fontSize: 14 }}>
                                                {formatCurrency(transactions[transactions.length - 1]?.balance || 0)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </>
                        )}

                        <div className="print-only" style={{ marginTop: 40, textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
                            <p>Thank you for your business!</p>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @media print {
                    .print-hide { display: none !important; }
                }
                @keyframes modalEnter {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
