'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, FileText, Download, Undo, Edit, ShoppingCart, Mail, Trash2, RotateCcw, DollarSign } from 'lucide-react';
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
import PaymentModal from '@/components/PaymentModal';
import AdditionalChargeModal from '@/components/AdditionalChargeModal';
import { InvoiceData } from '@/lib/calculations';
import CustomerHistoryModal from '@/components/CustomerHistoryModal';
import { MoreHorizontal, History } from 'lucide-react'; // Import icons

function ConsignmentConversionModal({ isOpen, items, onClose, onConvert, initialSelectedIds }: { isOpen: boolean, items: any[], onClose: () => void, onConvert: (selectedIds: string[], note: string) => Promise<boolean>, initialSelectedIds?: string[] }) {
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds || []);
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
                                    disabled={item.returned && !item.sold} // Only disable if returned (but not sold) - we want to allow un-selling
                                    checked={selectedIds.includes(item.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedIds([...selectedIds, item.id]);
                                        else setSelectedIds(selectedIds.filter(id => id !== item.id));
                                    }}
                                />
                                <div style={{ opacity: item.returned && !item.sold ? 0.6 : 1 }}>
                                    <div style={{ fontWeight: 600 }}>{item.sku}</div>
                                    <div style={{ fontSize: 13, color: '#64748b' }}>{item.description}</div>
                                    {item.returned && !item.sold && <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Already Returned</div>}
                                    {item.sold && <div style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>Sold (Uncheck to Undo)</div>}
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
                        onClick={async () => {
                            setProcessing(true);
                            try {
                                const success = await onConvert(selectedIds, note);
                                if (!success) setProcessing(false);
                            } catch (e) {
                                setProcessing(false);
                            }
                        }}
                        disabled={processing}
                        style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: processing ? 0.7 : 1 }}
                    >
                        {processing ? 'Processing...' : 'Convert to Sale'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ReturnItemsModal({ isOpen, items, onClose, onConfirm, initialSelectedIds, initialNote }: { isOpen: boolean, items: any[], onClose: () => void, onConfirm: (selectedIds: string[], note: string) => Promise<boolean>, initialSelectedIds?: string[], initialNote?: string }) {
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds || []);
    const [searchTerm, setSearchTerm] = useState('');
    const [note, setNote] = useState(initialNote || '');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(initialSelectedIds || []);
            setNote(initialNote || '');
        }
    }, [isOpen, initialSelectedIds, initialNote]);

    if (!isOpen) return null;

    const filteredItems = items.filter(item =>
        (item.sku?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (item.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: 24, borderRadius: 12, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Manage Returns</h3>

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
                            <label key={item.id} style={{ display: 'flex', gap: 12, padding: 12, borderBottom: '1px solid #f1f5f9', cursor: item.sold ? 'default' : 'pointer', background: item.sold ? '#f8fafc' : 'white' }}>
                                <input
                                    type="checkbox"
                                    disabled={item.sold}
                                    checked={selectedIds.includes(item.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedIds([...selectedIds, item.id]);
                                        else setSelectedIds(selectedIds.filter(id => id !== item.id));
                                    }}
                                />
                                <div style={{ opacity: item.sold ? 0.6 : 1 }}>
                                    <div style={{ fontWeight: 600 }}>{item.sku}</div>
                                    <div style={{ fontSize: 13, color: '#64748b' }}>{item.description}</div>
                                    {item.sold && <div style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>Already Sold</div>}
                                    {item.returned && !item.sold && <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Currently Returned</div>}
                                </div>
                            </label>
                        ))
                    )}
                </div>

                <textarea
                    placeholder="Return Note / Reason"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 16, fontFamily: 'inherit' }}
                    rows={3}
                />

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#64748b', marginRight: 'auto' }}>
                        {selectedIds.length} returned
                    </span>
                    <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
                    <button
                        onClick={async () => {
                            setProcessing(true);
                            try {
                                const success = await onConfirm(selectedIds, note);
                                if (!success) setProcessing(false);
                            } catch (e) {
                                setProcessing(false);
                            }
                        }}
                        disabled={processing}
                        style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: processing ? 0.7 : 1 }}
                    >
                        {processing ? 'Processing...' : 'Save Changes'}
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
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showReturnReceipt, setShowReturnReceipt] = useState(false);
    const [returnedReceiptData, setReturnedReceiptData] = useState<any>(null);
    const [isConverting, setIsConverting] = useState(false);


    const [isPrinting, setIsPrinting] = useState(false);
    const [showChargeModal, setShowChargeModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false); // Customer History State
    const [showMoreMenu, setShowMoreMenu] = useState(false); // Dropdown State

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
        // Pre-populate with currently returned items
        if (invoice) {
            const returnedIds = invoice.data.items.filter(i => i.returned).map(i => i.id);
            setReturnItems(returnedIds);
            // Try to find a common return note if any
            const commonNote = invoice.data.items.find(i => i.returned && i.returnNote)?.returnNote || '';
            setReturnNote(commonNote);
        }
        setShowReturnModal(true);
    };

    const handleConvertClick = () => {
        setIsConverting(true);
        setShowReturnModal(true);
        if (invoice) {
            // Pre-select items that are already sold so they can be deselected
            const soldIds = invoice.data.items.filter(i => i.sold).map(i => i.id);
            setReturnItems(soldIds);
        } else {
            setReturnItems([]);
        }
        setReturnNote('Converted to Sale');
    };



    const handleProcessReturnWithArgs = async (itemsIds: string[], note: string): Promise<boolean> => {
        if (!invoice) return false;

        /* 
        // Validation removed to allow undoing ALL sales by selecting nothing
        if (isConverting && itemsIds.length === 0) {
            alert('Please select at least one item.');
            return false;
        }
        */

        if (!isConverting && !confirm('Save return changes?')) return false;

        setReturnProcessing(true);
        try {
            const updatedItems = invoice.data.items.map(item => {
                if (isConverting) {
                    // Logic for converting to sale: 
                    // 1. If ID is in list, MARK AS SOLD
                    // 2. If ID is NOT in list, but WAS sold, MARK AS UNSOLD (Undo)

                    if (itemsIds.includes(item.id)) {
                        // Mark as sold (or update note)
                        return { ...item, sold: true, soldDate: item.soldDate || new Date().toISOString(), returnNote: note };
                    } else if (item.sold) {
                        // Was sold, but now deselected -> UNSOLD
                        const isConvertNote = item.returnNote === 'Converted to Sale';
                        return {
                            ...item,
                            sold: false,
                            soldDate: undefined,
                            returnNote: isConvertNote ? undefined : item.returnNote
                        };
                    }
                    return item;
                } else {
                    // Logic for Returns: Check/Uncheck determined by presence in itemsIds
                    if (itemsIds.includes(item.id)) {
                        // It IS selected, so ensure it IS returned
                        return { ...item, returned: true, returnNote: note || 'Returned by customer' };
                    } else {
                        // It is NOT selected. If it WAS returned, we UNDO it (unless it's sold)
                        if (item.returned && !item.sold) {
                            return { ...item, returned: false, returnNote: undefined };
                        }
                        return item;
                    }
                }
            });

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
                // const itemsToSell = invoice.data.items.filter(i => itemsIds.includes(i.id));
                // Save to session for new invoice
                /*
                const itemsForNewInvoice = itemsToSell.map(item => ({
                    ...item,
                    id: Math.random().toString(36).substr(2, 9), // New ID for new invoice
                    sold: false, // Reset sold status for new sale (it's the new sale itself)
                    returned: false, // Reset returned status for new sale
                    returnNote: undefined
                }));

                sessionStorage.setItem('convert_items', JSON.stringify(itemsForNewInvoice));
                // Redirect
                router.push('/invoices/new');
                return true;
                */

                // RELOAD to display changes instead of redirecting
                await loadInvoice(invoice.id);
                setShowReturnModal(false);
                return true;
            }

            // Reload to reflect changes if not converting
            await loadInvoice(invoice.id);
            // Close the modal upon success
            setShowReturnModal(false);
            return true;

        } catch (error) {
            console.error(error);
            alert('Failed to process return');
            return false;
        } finally {
            setReturnProcessing(false);
        }
    };

    const handleSavePayment = async (payment: any) => {
        if (!invoice) return;

        // Use type assertion to handle the new field until types propagate fully
        const currentData = invoice.data as any;
        const currentPayments = currentData.payments || [];

        const newPayments = [...currentPayments, payment];
        const newData = {
            ...currentData,
            payments: newPayments
        };
        
        const calcs = calculateInvoice(newData);
        if (calcs.balanceDue <= 0.01) {
            newData.terms = 'Paid';
        } else {
            newData.terms = 'Outstanding';
        }

        const updatedInvoice = {
            ...invoice,
            data: newData,
            updatedAt: new Date().toISOString()
        };

        try {
            await saveInvoice(updatedInvoice.data, invoice.id);
            await loadInvoice(invoice.id);
            setShowPaymentModal(false);
            alert('Payment recorded successfully');
        } catch (e) {
            console.error(e);
            alert('Failed to save payment');
        }
    }



    const handleDeletePayment = async (paymentId: string) => {
        if (!invoice) return;

        if (!confirm('Are you sure you want to delete this payment?')) {
            return;
        }

        try {
            const currentPayments = invoice.data.payments || [];
            const updatedPayments = currentPayments.filter(p => p.id !== paymentId);

            const newData = {
                ...invoice.data,
                payments: updatedPayments
            };
            
            const calcs = calculateInvoice(newData);
            if (calcs.balanceDue <= 0.01) {
                newData.terms = 'Paid';
            } else {
                newData.terms = 'Outstanding';
            }

            const updatedInvoice = {
                ...invoice,
                data: newData,
                updatedAt: new Date().toISOString()
            };

            await saveInvoice(updatedInvoice.data, invoice.id);
            await loadInvoice(invoice.id);
            alert('Payment deleted successfully');
        } catch (error) {
            console.error('Failed to delete payment:', error);
            alert('Failed to delete payment');
        }
    };

    const handleSaveCharge = async (charge: { id: string; description: string; amount: number }) => {
        if (!invoice) return;

        const currentData = invoice.data;
        const currentCharges = currentData.additionalCharges || [];

        const updatedInvoice = {
            ...invoice,
            data: {
                ...currentData,
                additionalCharges: [...currentCharges, charge]
            },
            updatedAt: new Date().toISOString()
        };

        try {
            await saveInvoice(updatedInvoice.data, invoice.id);
            await loadInvoice(invoice.id);
            setShowChargeModal(false);
            alert('Charge added successfully!');
        } catch (e) {
            console.error(e);
            alert('Failed to save charge');
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

    // deleted handleUndoConversion


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
                                        {invoice.data.documentType === 'CONSIGNMENT' ? 'CONSIGNMENT OUT' :
                                            (invoice.data.documentType === 'WASH' || invoice.data.mode === 'wash') ? 'WASH/REPAIR SERVICE' :
                                                invoice.data.mode.startsWith('retail') ? 'RETAIL' :
                                                    invoice.data.mode.startsWith('wholesale') ? 'WHOLESALE' : 'INVOICE'}
                                    </span>
                                </h1>
                                <p style={{ color: '#64748b', marginTop: 4 }}>Created on {formatDateMMDDYYYY(invoice.createdAt)}</p>
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    onClick={() => setShowPaymentModal(true)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '10px 20px', background: '#10b981', color: 'white',
                                        border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                                    }}
                                >
                                    <DollarSign size={18} /> Record Payment
                                </button>
                                {invoice.data.documentType === 'CONSIGNMENT' && (
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
                                        <ShoppingCart size={18} /> Process Pickup
                                    </button>
                                )}
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
                            </div>

                            {/* More Actions Dropdown */}
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '10px 14px', background: 'white', color: '#64748b',
                                        border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer'
                                    }}
                                    title="More Options"
                                >
                                    <MoreHorizontal size={20} />
                                </button>

                                {showMoreMenu && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '120%',
                                        right: 0,
                                        background: 'white',
                                        borderRadius: 12,
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                        border: '1px solid #f1f5f9',
                                        minWidth: 200,
                                        zIndex: 50,
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Customer Options
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowHistoryModal(true);
                                                setShowMoreMenu(false);
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                width: '100%', padding: '10px 16px',
                                                background: 'white', border: 'none',
                                                textAlign: 'left', cursor: 'pointer',
                                                fontSize: 14, color: '#334155',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                        >
                                            <History size={16} /> Customer History
                                        </button>
                                    </div>
                                )}

                                {showMoreMenu && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '120%',
                                        right: 0,
                                        background: 'white',
                                        borderRadius: 12,
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                        border: '1px solid #e2e8f0',
                                        zIndex: 100,
                                        minWidth: 200,
                                        overflow: 'hidden',
                                        padding: '5px 0'
                                    }}>
                                        <button
                                            onClick={async () => {
                                                setShowMoreMenu(false);
                                                if (!invoice.data.soldTo.email) {
                                                    alert('Customer email is required to send a signature link.');
                                                    return;
                                                }

                                                if (confirm('Send a one-time signature link to this customer?')) {
                                                    try {
                                                        const { createSignatureToken } = await import('@/lib/invoice-storage');
                                                        const { sendSignatureRequestEmail } = await import('@/lib/email-service');

                                                        const token = await createSignatureToken(invoice.id);
                                                        const link = `${window.location.origin}/public/signature/?token=${token}`;

                                                        const sent = await sendSignatureRequestEmail(
                                                            invoice.data.soldTo.email,
                                                            invoice.data.soldTo.name,
                                                            invoice.data.invoiceNumber || 'New',
                                                            link
                                                        );

                                                        if (sent) {
                                                            alert('Signature link sent successfully!');
                                                            logActivity('Signature Link Sent', `Sent link to ${invoice.data.soldTo.email} for invoice ${invoice.data.invoiceNumber}`);
                                                        } else {
                                                            alert('Failed to send email, but token was generated. Copy this link for the customer:\n\n' + link);
                                                            console.log('Signature Link:', link);
                                                        }
                                                    } catch (error: any) {
                                                        alert('Error: ' + error.message);
                                                    }
                                                }
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                width: '100%', padding: '12px 16px', background: 'none',
                                                border: 'none', color: '#1e293b', fontSize: 14,
                                                fontWeight: 500, cursor: 'pointer', textAlign: 'left',
                                            }}
                                            className="hover-row"
                                        >
                                            <Mail size={16} /> Send Signature Link
                                        </button>
                                        {/* Actions Group */}
                                        <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Invoice Actions
                                        </div>

                                        <button onClick={() => { handleEdit(); setShowMoreMenu(false); }} className="dropdown-item">
                                            <Edit size={16} /> Edit Invoice
                                        </button>

                                        <button onClick={() => { handleEmail(); setShowMoreMenu(false); }} className="dropdown-item">
                                            <Mail size={16} /> Email Invoice
                                        </button>

                                        <button onClick={() => { handleDownloadPDF(); setShowMoreMenu(false); }} className="dropdown-item">
                                            <Download size={16} /> Download PDF
                                        </button>

                                        <button onClick={() => { setShowChargeModal(true); setShowMoreMenu(false); }} className="dropdown-item">
                                            <DollarSign size={16} /> Add Charge
                                        </button>

                                        <button onClick={() => { handleReturnClick(); setShowMoreMenu(false); }} className="dropdown-item">
                                            <Undo size={16} /> Process Return
                                        </button>

                                        {invoice?.data.status === 'picked_up' && (
                                            <button onClick={() => { handleUndoPickup(); setShowMoreMenu(false); }} className="dropdown-item" style={{ color: '#e11d48' }}>
                                                <RotateCcw size={16} /> Undo Pickup
                                            </button>
                                        )}

                                        <hr style={{ margin: '4px 0', borderTop: '1px solid #f1f5f9' }} />

                                        {/* Customer Group */}
                                        <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Customer Options
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowHistoryModal(true);
                                                setShowMoreMenu(false);
                                            }}
                                            className="dropdown-item"
                                        >
                                            <History size={16} /> Customer History
                                        </button>
                                    </div>
                                )}
                            </div>
                            <style jsx>{`
                                .dropdown-item {
                                    display: flex;
                                    align-items: center;
                                    gap: 10px;
                                    width: 100%;
                                    padding: 10px 16px;
                                    background: white;
                                    border: none;
                                    text-align: left;
                                    cursor: pointer;
                                    font-size: 14px;
                                    color: #334155;
                                    transition: background 0.2s;
                                }
                                .dropdown-item:hover {
                                    background: #f8fafc;
                                    color: #0f172a;
                                }
                            `}</style>
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
                            const link = `${window.location.origin}/public/invoice?id=${invoice.id}&pdf=true`;

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

                    {/* Payment Modal */}
                    <PaymentModal
                        isOpen={showPaymentModal}
                        onClose={() => setShowPaymentModal(false)}
                        onSave={handleSavePayment}
                        totalDue={calculations?.totalDue || 0}
                        balanceDue={calculations?.balanceDue || 0}
                    />

                    {/* Additional Charge Modal */}
                    {showChargeModal && (
                        <AdditionalChargeModal
                            isOpen={showChargeModal}
                            onClose={() => setShowChargeModal(false)}
                            onSave={handleSaveCharge}
                        />
                    )}

                    {/* Return Modal (Searchable) */}
                    {showReturnModal && !isConverting && (
                        <ReturnItemsModal
                            isOpen={true}
                            items={invoice.data.items}
                            initialSelectedIds={returnItems}
                            initialNote={returnNote}
                            onClose={() => setShowReturnModal(false)}
                            onConfirm={async (ids: string[], note: string) => {
                                setReturnItems(ids);
                                setReturnNote(note);
                                return await handleProcessReturnWithArgs(ids, note);
                            }}
                        />
                    )}

                    {/* Customer History Modal */}
                    {showHistoryModal && (
                        <CustomerHistoryModal
                            isOpen={showHistoryModal}
                            customer={{
                                ...invoice.data.soldTo, // Use invoice customer data
                                id: 'temp_view_id', // ID might not be needed for view-only or we can try to fetch real ID later if strictly required. 
                                // Actually, history modal matches by NAME primarily, so this is fine.
                                // We need to mock the minimal required fields if they are missing
                                address: invoice.data.soldTo.address || '',
                                city: invoice.data.soldTo.city || '',
                                state: invoice.data.soldTo.state || '',
                                zip: invoice.data.soldTo.zip || '',
                                phone: invoice.data.soldTo.phone || '',
                                createdAt: '',
                                updatedAt: ''
                            }}
                            onClose={() => setShowHistoryModal(false)}
                        />
                    )}

                    {/* Consignment Conversion Modal (Searchable) */}
                    {showReturnModal && isConverting && (
                        <ConsignmentConversionModal
                            isOpen={true}
                            items={invoice.data.items}
                            initialSelectedIds={returnItems}
                            onClose={() => setShowReturnModal(false)}
                            onConvert={async (ids: string[], note: string) => {
                                setReturnItems(ids);
                                setReturnNote(note);
                                return await handleProcessReturnWithArgs(ids, note);
                            }}
                        />
                    )}



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
                            onDeletePayment={handleDeletePayment}
                        />
                    </div>
                </div>
            </div>
        </div >
    );
}

export default function InvoiceViewPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <InvoiceViewContent />
        </Suspense>
    );
}
