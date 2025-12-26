'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getInvoiceByIdAsync, SavedInvoice } from '@/lib/invoice-storage';
import { calculateInvoice, InvoiceCalculations } from '@/lib/calculations';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import { businessConfig } from '@/config/business';
import { Printer } from 'lucide-react';

function PrintPageContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const [invoice, setInvoice] = useState<SavedInvoice | null>(null);
    const [calculations, setCalculations] = useState<InvoiceCalculations | null>(null);
    const [status, setStatus] = useState('Loading invoice...');
    const [error, setError] = useState('');

    useEffect(() => {
        if (id) loadInvoice(id);
        else setError('No Invoice ID provided');
    }, [id]);

    const loadInvoice = async (invoiceId: string) => {
        try {
            const data = await getInvoiceByIdAsync(invoiceId);
            if (data) {
                setInvoice(data);
                setCalculations(calculateInvoice(data.data));
                setStatus('Ready to print');
            } else {
                setError(`Invoice not found (${invoiceId})`);
            }
        } catch (err) {
            setError('Failed to load invoice data');
        }
    };

    useEffect(() => {
        if (invoice && calculations) {
            // Apply User's "Universal Print Fix" Logic
            const timer = setTimeout(() => {
                window.scrollTo(0, 0);
                window.print();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [invoice, calculations]);

    const handleManualPrint = () => {
        window.scrollTo(0, 0);
        window.print();
    };

    if (error) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontFamily: 'sans-serif' }}>
                <h2>Error</h2>
                <p>{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    style={{ padding: '8px 16px', marginTop: 20, cursor: 'pointer', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6 }}
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!invoice || !calculations) {
        return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>{status}</div>;
    }

    // Main UI - Render Invoice for Native Print
    return (
        <div id="invoice-print-view" className="printable-area" style={{ background: 'white', minHeight: '100vh', position: 'relative' }}>
            {/* Debug/Manual Print Header - Hidden when printing via CSS */}
            <div className="no-print" style={{
                padding: '10px 20px',
                background: '#f1f5f9',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px',
                color: '#64748b'
            }}>
                <div>Print Preview (ID: {invoice.data.invoiceNumber})</div>
                <button
                    onClick={handleManualPrint}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 16px', background: '#3b82f6', color: 'white',
                        border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer'
                    }}
                >
                    <Printer size={16} /> Print Now
                </button>
            </div>

            <div className="invoice-container">
                <InvoiceTemplate
                    data={invoice.data}
                    calculations={calculations}
                    businessInfo={businessConfig}
                />
            </div>
        </div>
    );
}

export default function PrintPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PrintPageContent />
        </Suspense>
    );
}
