'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, FileText, Download } from 'lucide-react';
import { getInvoiceById, getInvoiceByIdAsync, SavedInvoice } from '@/lib/invoice-storage';
import { calculateInvoice, InvoiceCalculations } from '@/lib/calculations';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import PrintPortal from '@/components/PrintPortal';
import { businessConfig } from '@/config/business';
import { generatePDF } from '@/lib/pdf-utils';

function InvoiceViewContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const [invoice, setInvoice] = useState<SavedInvoice | null>(null);
    const [calculations, setCalculations] = useState<InvoiceCalculations | null>(null);
    const [loading, setLoading] = useState(true);
    const invoiceRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id) {
            getInvoiceByIdAsync(id).then(data => {
                if (data) {
                    setInvoice(data);
                    setCalculations(calculateInvoice(data.data));
                }
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [id]);

    const handlePrint = () => {
        window.print();
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
        <div style={{ padding: '40px 20px', maxWidth: 1000, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
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
                            onClick={handlePrint}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 20px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                            }}
                        >
                            <Printer size={18} />
                            Print
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 20px',
                                background: 'white',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                borderRadius: 8,
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <Download size={18} />
                            Download
                        </button>
                    </div>
                </div>
            </div>

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

            {/* Print Portal */}
            <PrintPortal>
                <div className="print-only-portal">
                    <InvoiceTemplate
                        data={invoice.data}
                        calculations={calculations}
                        businessInfo={businessConfig}
                    />
                </div>
            </PrintPortal>

            <style jsx global>{`
                @media print {
                    body > * {
                        display: none !important;
                    }
                    body > .print-portal-root {
                        display: block !important;
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                    }
                    /* Ensure the portal content isn't hidden by specific styles */
                    .print-only-portal {
                        display: block !important;
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
