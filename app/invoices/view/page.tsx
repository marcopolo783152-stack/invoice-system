'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, FileText, Download, Undo } from 'lucide-react';
import { getInvoiceByIdAsync, SavedInvoice, saveInvoice } from '@/lib/invoice-storage';
import { calculateInvoice, InvoiceCalculations } from '@/lib/calculations';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import { ReturnedReceipt } from '@/components/ReturnedReceipt';
import { businessConfig } from '@/config/business';
import { generatePDF, openPDFInNewTab } from '@/lib/pdf-utils';

function InvoiceViewContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const [invoice, setInvoice] = useState<SavedInvoice | null>(null);
    const [calculations, setCalculations] = useState<InvoiceCalculations | null>(null);
    const [loading, setLoading] = useState(true);
    const invoiceRef = useRef<HTMLDivElement>(null);

    // Return Logic State
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnItems, setReturnItems] = useState<string[]>([]);
    const [returnNote, setReturnNote] = useState('');
    const [returnProcessing, setReturnProcessing] = useState(false);
    const [showReturnReceipt, setShowReturnReceipt] = useState(false);
    const [returnedReceiptData, setReturnedReceiptData] = useState<any>(null);

    useEffect(() => {
        if (id) {
            loadInvoice(id);
        } else {
            setLoading(false);
        }
    }, [id]);

    const loadInvoice = async (invoiceId: string) => {
        const data = await getInvoiceByIdAsync(invoiceId);
        if (data) {
            setInvoice(data);
            setCalculations(calculateInvoice(data.data));
        }
        setLoading(false);
    };

    const handlePrint = async () => {
        if (invoiceRef.current && invoice) {
            try {
                await openPDFInNewTab(invoiceRef.current, invoice.data.invoiceNumber);
            } catch (error) {
                alert('Failed to open PDF for printing. Please try again.');
            }
        }
    };

    const handleDownloadPDF = async () => {
        if (invoiceRef.current && invoice) {
            try {
                await generatePDF(invoiceRef.current, invoice.data.invoiceNumber);
            } catch (error) {
                alert('Failed to generate PDF. Please try using Print instead.');
            }
        }
    };

    // Return Handlers
    const handleReturnClick = () => {
        setShowReturnModal(true);
        setReturnItems([]);
        setReturnNote('');
    };

    const handleProcessReturn = async () => {
        if (!invoice) return;
        if (returnItems.length === 0) {
            alert('Please select at least one item to return.');
            return;
        }
        if (!confirm('Process return for selected items?')) return;

        setReturnProcessing(true);
        try {
            const updatedItems = invoice.data.items.map(item =>
                returnItems.includes(item.id)
                    ? { ...item, returned: true, returnNote: returnNote || 'Returned by customer' }
                    : item
            );

            const updatedInvoice = {
                ...invoice,
                data: {
                    ...invoice.data,
                    items: updatedItems,
                    returnNote: returnNote || 'Parts Returned',
                    returned: updatedItems.every(i => i.returned)
                },
                updatedAt: new Date().toISOString()
            };

            await saveInvoice(updatedInvoice.data);
            await loadInvoice(invoice.id); // Reload to reflect changes

            // Show Receipt
            setReturnedReceiptData({
                ...updatedInvoice,
                returnedItems: updatedItems.filter(i => returnItems.includes(i.id)), // Only show currently returned items
                returnNote: returnNote
            });
            setShowReturnReceipt(true);
            setShowReturnModal(false);
        } catch (error) {
            console.error(error);
            alert('Failed to process return');
        } finally {
            setReturnProcessing(false);
        }
    };

    if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

    if (!invoice || !calculations) {
        return (
            <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
                <Link href="/invoices" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, textDecoration: 'none', color: '#666' }}>
                    <ArrowLeft size={16} /> Back to Invoices
                </Link>
                <div style={{ textAlign: 'center', marginTop: 40 }}>
                    <h2 style={{ color: '#ef4444' }}>Invoice Not Found</h2>
                    <p style={{ color: '#666' }}>The invoice ID could not be found.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            <div id="invoice-screen-view">
                <div style={{ padding: '40px 20px', maxWidth: 1000, margin: '0 auto' }}>
                    <div className="no-print">
                        <Link
                            href="/invoices"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 24,
                                textDecoration: 'none',
                                color: '#64748b',
                                fontWeight: 500,
                                transition: 'color 0.2s'
                            }}
                            className="hover:text-blue-600"
                        >
                            <ArrowLeft size={18} /> Back to Invoices
                        </Link>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                            <div>
                                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 12 }}>
                                    Invoice #{invoice.data.invoiceNumber}
                                    <span style={{
                                        fontSize: 13,
                                        padding: '4px 12px',
                                        borderRadius: 20,
                                        background: invoice.data.documentType === 'CONSIGNMENT' ? '#fff7ed' : '#f0f9ff',
                                        color: invoice.data.documentType === 'CONSIGNMENT' ? '#c2410c' : '#0369a1',
                                        fontWeight: 600,
                                        letterSpacing: '0.02em'
                                    }}>
                                        {invoice.data.documentType || 'INVOICE'}
                                    </span>
                                </h1>
                                <p style={{ color: '#64748b', marginTop: 4 }}>Created on {new Date(invoice.createdAt).toLocaleDateString()}</p>
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    onClick={handleReturnClick}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '10px 20px', background: '#f59e0b', color: 'white',
                                        border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                                    }}
                                >
                                    <Undo size={18} /> Return
                                </button>
                                <button
                                    onClick={handlePrint}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '10px 20px', background: '#3b82f6', color: 'white',
                                        border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                                    }}
                                >
                                    <Printer size={18} /> Print
                                </button>
                                <button
                                    onClick={handleDownloadPDF}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '10px 20px', background: 'white', color: '#334155',
                                        border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    <Download size={18} /> Download
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Return Modal Overlay */}
                    {showReturnModal && (
                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ background: 'white', padding: 24, borderRadius: 12, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Return Items</h3>
                                <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                                    {invoice.data.items.map(item => (
                                        <label key={item.id} style={{ display: 'flex', gap: 12, padding: 12, borderBottom: '1px solid #f1f5f9', cursor: item.returned ? 'default' : 'pointer', background: item.returned ? '#f8fafc' : 'white' }}>
                                            <input
                                                type="checkbox"
                                                disabled={item.returned}
                                                checked={returnItems.includes(item.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setReturnItems([...returnItems, item.id]);
                                                    else setReturnItems(returnItems.filter(id => id !== item.id));
                                                }}
                                            />
                                            <div style={{ opacity: item.returned ? 0.6 : 1 }}>
                                                <div style={{ fontWeight: 600 }}>{item.sku}</div>
                                                <div style={{ fontSize: 13, color: '#64748b' }}>{item.description}</div>
                                                {item.returned && <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Already Returned</div>}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                <textarea
                                    placeholder="Return Note / Reason"
                                    value={returnNote}
                                    onChange={(e) => setReturnNote(e.target.value)}
                                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 16, fontFamily: 'inherit' }}
                                    rows={3}
                                />
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                    <button onClick={() => setShowReturnModal(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
                                    <button onClick={handleProcessReturn} disabled={returnProcessing} style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: returnProcessing ? 0.7 : 1 }}>
                                        {returnProcessing ? 'Processing...' : 'Confirm Return'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Return Receipt Modal */}
                    {showReturnReceipt && returnedReceiptData && (
                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ background: 'white', padding: 0, borderRadius: 12, width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ padding: 16, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0 }}>Return Receipt</h3>
                                    <button onClick={() => setShowReturnReceipt(false)} style={{ border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer' }}>&times;</button>
                                </div>
                                <div style={{ padding: 24, overflowY: 'auto', background: '#f8fafc', flex: 1 }}>
                                    <ReturnedReceipt receiptData={returnedReceiptData} />
                                </div>
                                <div style={{ padding: 16, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                    <button onClick={() => setShowReturnReceipt(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>Close</button>
                                    <button
                                        onClick={() => {
                                            const printData = JSON.stringify(returnedReceiptData);
                                            // Open standard print window for receipt
                                            const w = window.open('', '_blank');
                                            if (w) {
                                                w.document.write(`<html><head><title>Print Receipt</title></head><body><div id="root"></div></body></html>`);
                                                // Note: we can't easily inject React into new window without complex setup.
                                                // Simplified: redirect to a print page or just print current view logic? 
                                                // Actually, let's just use window.print on this modal content? No, it prints the whole page.
                                                // Better: Create a hidden specific area for receipt and print it?
                                                // For now, let's just simple alert or console.
                                                // Actually, since I have the layout in the modal, I can print just the modal content?
                                                // Standard pattern: open a dedicated print route.
                                                w.location.href = `/returned-receipt-print?data=${encodeURIComponent(printData)}`;
                                            }
                                        }}
                                        style={{ padding: '8px 16px', borderRadius: 8, background: '#3b82f6', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                                    >
                                        <Printer size={16} /> Print Receipt
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Screen Preview */}
                    <div style={{
                        background: 'white',
                        padding: 40,
                        borderRadius: 8,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        border: '1px solid #e2e8f0'
                    }} ref={invoiceRef}>
                        <InvoiceTemplate
                            data={invoice.data}
                            calculations={calculations}
                            businessInfo={businessConfig}
                        />
                    </div>
                </div>
            </div>

            {/* Print Version - Hidden on screen, shown on print */}
            <div id="printable-invoice-content" style={{ display: 'none' }}>
                <InvoiceTemplate
                    data={invoice.data}
                    calculations={calculations}
                    businessInfo={businessConfig}
                />
            </div>

            <style jsx global>{`
                @media print {
                    /* Hide the screen view */
                    #invoice-screen-view, .no-print {
                        display: none !important;
                    }
                    
                    /* Show the hidden print version */
                    #printable-invoice-content {
                        display: block !important;
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        background: white;
                    }

                    /* Important: Reset parent containers to avoid clipping */
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                }
            `}</style>
        </div>
    );
}


export default function InvoiceViewPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <InvoiceViewContent />
        </Suspense>
    );
}
