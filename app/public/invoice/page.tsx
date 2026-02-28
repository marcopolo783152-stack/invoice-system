'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Printer } from 'lucide-react';
import { getInvoiceByIdAsync, SavedInvoice } from '@/lib/invoice-storage';
import { calculateInvoice, InvoiceCalculations } from '@/lib/calculations';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import { businessConfig } from '@/config/business';
import { generatePDF, openPDFInNewTab, viewPDFInCurrentTab } from '@/lib/pdf-utils';

function PublicInvoiceContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const [invoice, setInvoice] = useState<SavedInvoice | null>(null);
    const [calculations, setCalculations] = useState<InvoiceCalculations | null>(null);
    const [loading, setLoading] = useState(true);
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        if (id) {
            loadInvoice(id);
        } else {
            setLoading(false);
        }
    }, [id]);

    // Handle automatic PDF view if requested via query param
    useEffect(() => {
        const shouldShowPDF = searchParams.get('pdf') === 'true';
        if (shouldShowPDF && !loading && invoice && invoiceRef.current) {
            // Give a small delay for the template to fully render
            const timer = setTimeout(() => {
                viewPDFInCurrentTab(invoiceRef.current!, invoice.data.invoiceNumber)
                    .catch(err => {
                        console.error('Auto-PDF generation failed:', err);
                        // Fallback: the user can still click the download button if auto-trigger fails
                    });
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [loading, invoice, searchParams]);

    const loadInvoice = async (invoiceId: string) => {
        try {
            const data = await getInvoiceByIdAsync(invoiceId);
            if (data) {
                setInvoice(data);
                setCalculations(calculateInvoice(data.data));
            }
        } catch (error) {
            console.error('Failed to load invoice:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        if (invoiceRef.current && invoice) {
            setIsPrinting(true);
            try {
                await openPDFInNewTab(invoiceRef.current, invoice.data.invoiceNumber);
            } catch (error) {
                console.error('Print failed:', error);
                alert('Failed to generate print view.');
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
                alert('Failed to generate PDF.');
            }
        }
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading Invoice...</div>;

    if (!invoice || !calculations) {
        return (
            <div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center' }}>
                <h2 style={{ color: '#ef4444' }}>Invoice Not Found</h2>
                <p style={{ color: '#666' }}>This invoice may have been deleted or does not exist.</p>
            </div>
        );
    }

    return (
        <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#f3f4f6', padding: '10px 0' }}>
            <div style={{ maxWidth: 850, margin: '0 auto', padding: '0 10px' }}>
                {/* Header Actions */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20,
                    background: 'white',
                    padding: '15px 25px',
                    borderRadius: 8,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }} className="no-print">
                    <div style={{ fontWeight: 600, color: '#334155' }}>
                        Invoice #{invoice.data.invoiceNumber}
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            onClick={handlePrint}
                            disabled={isPrinting}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 16px', background: '#3b82f6', color: 'white',
                                border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer',
                                opacity: isPrinting ? 0.7 : 1
                            }}
                        >
                            <Printer size={16} /> {isPrinting ? 'Preparing details...' : 'Print'}
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 16px', background: 'white', color: '#334155',
                                border: '1px solid #cbd5e1', borderRadius: 6, fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            <Download size={16} /> Download PDF
                        </button>
                    </div>
                </div>

                {/* Invoice Paper */}
                <div
                    id="invoice-view"
                    className="invoice-paper"
                    style={{
                        background: 'white',
                        padding: 0,
                        borderRadius: 8,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        margin: '0 auto',
                        overflow: 'hidden'
                    }}
                >
                    <div ref={invoiceRef}>
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

export default function PublicInvoicePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PublicInvoiceContent />
        </Suspense>
    );
}
