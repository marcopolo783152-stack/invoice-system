'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, FileText, Download, Undo, Edit, ShoppingCart, Mail, Trash2, RotateCcw } from 'lucide-react';
import { getInvoiceByIdAsync, SavedInvoice, saveInvoice } from '@/lib/invoice-storage';
import { calculateInvoice, InvoiceCalculations } from '@/lib/calculations';
import { formatDateMMDDYYYY } from '@/lib/date-utils';
import { logActivity } from '@/lib/audit-logger';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import { ReturnedReceipt } from '@/components/ReturnedReceipt';
import { businessConfig } from '@/config/business';
import { generatePDF, openPDFInNewTab } from '@/lib/pdf-utils';

import { prepareInvoiceForEmail } from '@/lib/email-service';
import EmailModal from '@/components/EmailModal';

function ConsignmentConversionModal({ isOpen, items, onClose, onConvert }: { isOpen: boolean, items: any[], onClose: () => void, onConvert: (selectedIds: string[], note: string) => void }) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [note, setNote] = useState('Converted to Sale');
    const [processing, setProcessing] = useState(false);

    if (!isOpen) return null;

    const filteredItems = items.filter(item =>
        (item.sku?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (item.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: 24, borderRadius: 12, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Select Items to Sell</h3>

                <input
                    type="text"
                    placeholder="Search by SKU or Description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', marginBottom: 16, border: '1px solid #cbd5e1', borderRadius: 8 }}
                    autoFocus
                />

                <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    {filteredItems.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>No items found</div>
                    ) : (
                        filteredItems.map(item => (
                            <label key={item.id} style={{ display: 'flex', gap: 12, padding: 12, borderBottom: '1px solid #f1f5f9', cursor: item.returned ? 'default' : 'pointer', background: item.returned ? '#f8fafc' : 'white' }}>
                                <input
                                    type="checkbox"
                                    disabled={item.returned}
                                    checked={selectedIds.includes(item.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedIds([...selectedIds, item.id]);
                                        else setSelectedIds(selectedIds.filter(id => id !== item.id));
                                    }}
                                />
                                <div style={{ opacity: item.returned ? 0.6 : 1 }}>
                                    <div style={{ fontWeight: 600 }}>{item.sku}</div>
                                    <div style={{ fontSize: 13, color: '#64748b' }}>{item.description}</div>
                                    {item.returned && <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Already Returned</div>}
                                </div>
                            </label>
                        ))
                    )}
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#64748b', marginRight: 'auto' }}>
                        {selectedIds.length} selected
                    </span>
                    <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
                    <button
                        onClick={() => { setProcessing(true); onConvert(selectedIds, note); }}
                        disabled={processing || selectedIds.length === 0}
                        style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: (processing || selectedIds.length === 0) ? 0.7 : 1 }}
                    >
                        {processing ? 'Processing...' : 'Convert to Sale'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function MarkSoldModal({ isOpen, items, onClose, onConfirm }: { isOpen: boolean, items: any[], onClose: () => void, onConfirm: (selectedIds: string[]) => void }) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const filteredItems = items.filter(item =>
        !item.sold && // Only show items NOT yet sold
        ((item.sku?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (item.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()))
    );

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: 24, borderRadius: 12, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Confirm Payment (Mark as Sold)</h3>
                <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>Select items that have been paid for. This will mark them as SOLD.</p>

                <input
                    type="text"
                    placeholder="Search by SKU or Description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', marginBottom: 16, border: '1px solid #cbd5e1', borderRadius: 8 }}
                    autoFocus
                />

                <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    {filteredItems.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>No unsold items found</div>
                    ) : (
                        filteredItems.map(item => (
                            <label key={item.id} style={{ display: 'flex', gap: 12, padding: 12, borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(item.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedIds([...selectedIds, item.id]);
                                        else setSelectedIds(selectedIds.filter(id => id !== item.id));
                                    }}
                                />
                                <div>
                                    <div style={{ fontWeight: 600 }}>{item.sku}</div>
                                    <div style={{ fontSize: 13, color: '#64748b' }}>{item.description}</div>
                                </div>
                            </label>
                        ))
                    )}
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#64748b', marginRight: 'auto' }}>
                        {selectedIds.length} selected
                    </span>
                    <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
                    <button
                        onClick={() => {
                            if (confirm(`Are you sure these ${selectedIds.length} items sold? Confirm payment.`)) {
                                onConfirm(selectedIds);
                            }
                        }}
                        disabled={selectedIds.length === 0}
                        style={{ padding: '8px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: selectedIds.length === 0 ? 0.7 : 1 }}
                    >
                        Confirm Payment
                    </button>
                </div>
            </div>
        </div>
    );
}

function InvoiceViewContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get('id');

    const [invoice, setInvoice] = useState<SavedInvoice | null>(null);
    const [calculations, setCalculations] = useState<InvoiceCalculations | null>(null);
    const [loading, setLoading] = useState(true);
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [showPickupModal, setShowPickupModal] = useState(false);

    // Email State
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [invoiceHTML, setInvoiceHTML] = useState('');

    // Lazy load SignaturePad to avoid SSR issues
    const SignaturePad = React.useMemo(() => React.lazy(() => import('@/components/SignaturePad')), []);

    // Return Logic State
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnItems, setReturnItems] = useState<string[]>([]);
    const [returnNote, setReturnNote] = useState('');
    const [returnProcessing, setReturnProcessing] = useState(false);
    const [showReturnReceipt, setShowReturnReceipt] = useState(false);
    const [returnedReceiptData, setReturnedReceiptData] = useState<any>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [showMarkSoldModal, setShowMarkSoldModal] = useState(false);

    const [isPrinting, setIsPrinting] = useState(false);

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
            setIsPrinting(true);
            try {
                // Use client-side PDF generation to open in new tab
                // This bypasses CSS @media print issues completely
                await openPDFInNewTab(invoiceRef.current, invoice.data.invoiceNumber);
            } catch (error) {
                console.error('Print generation failed:', error);
                alert('Failed to generate print view. Please try again.');
            } finally {
                setIsPrinting(false);
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

    const handleEmail = () => {
        if (invoiceRef.current && invoice) {
            const html = prepareInvoiceForEmail(invoiceRef.current);
            setInvoiceHTML(html);
            setShowEmailModal(true);
        }
    };

    const handleEdit = () => {
        if (invoice) {
            router.push(`/invoices/new?edit=${invoice.id}`);
        }
    };

    // Return Handlers
    const handleReturnClick = () => {
        setIsConverting(false);
        setShowReturnModal(true);
        setReturnItems([]);
        setReturnNote('');
    };

    const handleConvertClick = () => {
        setIsConverting(true);
        setShowReturnModal(true);
        setReturnItems([]);
        setReturnNote('Converted to Sale');
    };

    const handleMarkSold = async (selectedIds: string[]) => {
        if (!invoice) return;
        setLoading(true);
        try {
            const updatedItems = invoice.data.items.map(item =>
                selectedIds.includes(item.id) ? { ...item, sold: true } : item
            );

            const updatedInvoice = {
                ...invoice,
                data: {
                    ...invoice.data,
                    items: updatedItems
                },
                updatedAt: new Date().toISOString()
            };

            await saveInvoice(updatedInvoice.data, invoice.id);
            await loadInvoice(invoice.id);
            setShowMarkSoldModal(false);
        } catch (error) {
            console.error('Failed to mark items as sold:', error);
            alert('Failed to update items.');
        } finally {
            setLoading(false);
        }
    };

    const handleProcessReturn = async () => {
        handleProcessReturnWithArgs(returnItems, returnNote);
    };

    const handleProcessReturnWithArgs = async (items: string[], note: string) => {
        if (!invoice) return;
        if (items.length === 0) {
            alert('Please select at least one item.');
            return;
        }

        if (!isConverting && !confirm('Process return for selected items?')) return;

        setReturnProcessing(true);
        try {
            const updatedItems = invoice.data.items.map(item =>
                items.includes(item.id)
                    ? { ...item, returned: true, returnNote: note || (isConverting ? 'Converted to Sale' : 'Returned by customer') }
                    : item
            );

            const updatedInvoice = {
                ...invoice,
                data: {
                    ...invoice.data,
                    items: updatedItems,
                    returnNote: note || (isConverting ? 'Converted to Sale' : 'Parts Returned'),
                    returned: updatedItems.every(i => i.returned)
                },
                updatedAt: new Date().toISOString()
            };

            await saveInvoice(updatedInvoice.data, invoice.id);

            if (isConverting) {
                // Get the items to sell
                const itemsToSell = invoice.data.items.filter(i => items.includes(i.id));
                // Save to session for new invoice
                const itemsForNewInvoice = itemsToSell.map(item => ({
                    ...item,
                    id: Math.random().toString(36).substr(2, 9), // New ID for new invoice
                    returned: false, // Reset returned status for new sale
                    returnNote: undefined
                }));
                sessionStorage.setItem('convert_items', JSON.stringify(itemsForNewInvoice));
                // Redirect
                router.push('/invoices/new');
                return;
            }

            await loadInvoice(invoice.id); // Reload to reflect changes

            // Show Receipt
            setReturnedReceiptData({
                ...updatedInvoice,
                returnedItems: updatedItems.filter(i => items.includes(i.id)), // Only show currently returned items
                returnNote: note
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

    const handleProcessPickup = async (signatureData: string) => {
        if (!invoice || !calculations) return;

        // Ask for payment confirmation - MANDATORY
        const totalAmount = calculations.totalDue;
        const isPaid = window.confirm(`Payment received for $${totalAmount.toLocaleString()}? \n\nConfirm to finish pickup. \n(Note: Pickup cannot be completed without payment)`);

        if (!isPaid) {
            alert('Pickup cancelled. Payment must be received to complete pickup.');
            return;
        }

        try {
            const updatedInvoice = {
                ...invoice,
                data: {
                    ...invoice.data,
                    status: 'picked_up' as const,
                    pickupSignature: signatureData,
                    terms: 'Paid' // Automatically set to Paid
                },
                updatedAt: new Date().toISOString()
            };
            await saveInvoice(updatedInvoice.data, invoice.id);
            await loadInvoice(invoice.id);
            setShowPickupModal(false);
            logActivity('Wash Pickup', `Completed pickup for Invoice #${invoice.data.invoiceNumber}. Status updated to Paid.`);
        } catch (error) {
            console.error('Failed to process pickup:', error);
            alert('Failed to save pickup information.');
        }
    };

    const handleUndoPickup = async () => {
        if (!invoice) return;
        if (!confirm('Are you sure you want to UNDO this pickup? \n\nThe status will be reset to "Ready for Pickup" and the "Paid" status will be removed.')) return;

        try {
            const updatedInvoice = {
                ...invoice,
                data: {
                    ...invoice.data,
                    status: 'ready' as const,
                    pickupSignature: '',
                    terms: 'Due on Receipt' // Revert to unpaid
                },
                updatedAt: new Date().toISOString()
            };
            await saveInvoice(updatedInvoice.data, invoice.id);
            await loadInvoice(invoice.id);
            alert('Pickup undone successfully.');
            logActivity('Undo Pickup', `Undid pickup for Invoice #${invoice.data.invoiceNumber}.`);
        } catch (error) {
            console.error('Failed to undo pickup:', error);
            alert('Failed to undo pickup.');
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
                                <p style={{ color: '#64748b', marginTop: 4 }}>Created on {formatDateMMDDYYYY(invoice.createdAt)}</p>
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                {invoice.data.documentType === 'CONSIGNMENT' && (
                                    <>
                                        <button
                                            onClick={() => setShowMarkSoldModal(true)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '10px 20px', background: '#059669', color: 'white',
                                                border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                                                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)'
                                            }}
                                        >
                                            <ShoppingCart size={18} /> Confirm Payment
                                        </button>
                                        <button
                                            onClick={handleConvertClick}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '10px 20px', background: '#e2e8f0', color: '#475569',
                                                border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer',
                                            }}
                                        >
                                            <Undo size={18} /> Convert to Sale
                                        </button>
                                    </>
                                )}
                                {invoice.data.documentType === 'WASH' && invoice.data.status !== 'picked_up' && (
                                    <button
                                        onClick={() => setShowPickupModal(true)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '10px 20px', background: '#059669', color: 'white',
                                            border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                                            boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)'
                                        }}
                                    >
                                        <Edit size={18} /> Process Pickup
                                    </button>
                                )}
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
                                    onClick={handleEdit}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '10px 20px', background: '#6366f1', color: 'white',
                                        border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(99, 102, 241, 0.3)'
                                    }}
                                >
                                    <Edit size={18} /> Edit
                                </button>
                                <button
                                    onClick={handleEmail}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '10px 20px', background: '#e0f2fe', color: '#0369a1',
                                        border: '1px solid #7dd3fc', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(3, 105, 161, 0.1)'
                                    }}
                                >
                                    <Mail size={18} /> Email
                                </button>
                                <button
                                    onClick={handlePrint}
                                    disabled={isPrinting}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '10px 20px', background: '#3b82f6', color: 'white',
                                        border: 'none', borderRadius: 8, fontWeight: 600, cursor: isPrinting ? 'wait' : 'pointer',
                                        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                                        opacity: isPrinting ? 0.7 : 1
                                    }}
                                >
                                    <Printer size={18} /> {isPrinting ? 'Preparing...' : 'Print'}
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

                    {/* Email Modal */}
                    <EmailModal
                        isOpen={showEmailModal}
                        onClose={() => setShowEmailModal(false)}
                        customerEmail={invoice.data.soldTo.email || ''}
                        customerName={invoice.data.soldTo.name}
                        invoiceNumber={invoice.data.invoiceNumber}
                        invoiceHTML={invoiceHTML}
                        onSend={async (email, config) => {
                            if (!invoice) throw new Error('Invoice content missing');

                            // Generate Link
                            const link = `${window.location.origin}/public/invoice?id=${invoice.id}`;

                            // Send Link (Client Side - Free Tier Compatible)
                            const { sendInvoiceEmail } = await import('@/lib/email-service');
                            await sendInvoiceEmail(
                                email,
                                invoice.data.soldTo.name,
                                invoice.data.invoiceNumber,
                                link,
                                config
                            );
                        }}
                    />

                    {/* Return Modal Overlay - REPLACED WITH Searchable Consignment Modal logic if needed */}
                    {showReturnModal && !isConverting && (
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

                    {/* Consignment Conversion Modal (Searchable) */}
                    {showReturnModal && isConverting && (
                        <ConsignmentConversionModal
                            isOpen={true}
                            items={invoice.data.items}
                            onClose={() => setShowReturnModal(false)}
                            onConvert={(ids: string[], note: string) => {
                                setReturnItems(ids);
                                setReturnNote(note);
                                handleProcessReturnWithArgs(ids, note);
                            }}
                        />
                    )}

                    {/* Mark Sold Modal */}
                    <MarkSoldModal
                        isOpen={showMarkSoldModal}
                        items={invoice.data.items}
                        onClose={() => setShowMarkSoldModal(false)}
                        onConfirm={handleMarkSold}
                    />

                    {/* Pickup Signature Modal */}
                    {showPickupModal && (
                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ background: 'white', padding: 24, borderRadius: 12, width: '100%', maxWidth: 600, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Confirm Pickup</h3>
                                <p style={{ color: '#64748b', marginBottom: 20 }}>Please satisfy the customer signature below to confirm receipt of items.</p>
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                                    <Suspense fallback={<div>Loading signature pad...</div>}>
                                        <SignaturePad
                                            onSave={handleProcessPickup}
                                            onCancel={() => setShowPickupModal(false)}
                                        />
                                    </Suspense>
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
                    <div
                        id="invoice-view"
                        className="invoice-paper"
                        style={{
                            background: 'white',
                            padding: 40,
                            borderRadius: 8,
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            border: '1px solid #e2e8f0'
                        }}
                        ref={invoiceRef}
                    >
                        <InvoiceTemplate
                            data={invoice.data}
                            calculations={calculations}
                            businessInfo={businessConfig}
                        />
                    </div>
                </div>
            </div>
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
