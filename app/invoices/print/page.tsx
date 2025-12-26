'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getInvoiceByIdAsync, SavedInvoice } from '@/lib/invoice-storage';
import { calculateInvoice, InvoiceCalculations } from '@/lib/calculations';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import { businessConfig } from '@/config/business';
import { generatePDFBlobUrl } from '@/lib/pdf-utils';
import { Loader2 } from 'lucide-react';

function PrintPageContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const [invoice, setInvoice] = useState<SavedInvoice | null>(null);
    const [calculations, setCalculations] = useState<InvoiceCalculations | null>(null);
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
            } else {
                setError(`Invoice not found (${invoiceId})`);
            }
        } catch (err) {
            setError('Failed to load invoice data');
        }
    };

    useEffect(() => {
        if (invoice && calculations) {
            const timer = setTimeout(() => {
                window.print();
            }, 500); // 500ms delay to ensure rendering
            return () => clearTimeout(timer);
        }
    }, [invoice, calculations]);

    const handleRetry = () => window.location.reload();

    if (error) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontFamily: 'sans-serif' }}>
                <h2>Error</h2>
                <p>{error}</p>
                <button
                    onClick={handleRetry}
                    style={{ padding: '8px 16px', marginTop: 20, cursor: 'pointer', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6 }}
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!invoice || !calculations) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={32} color="#3b82f6" />
                <span style={{ marginLeft: 10, fontFamily: 'sans-serif', color: '#64748b' }}>Preparing document...</span>
            </div>
        );
    }

    return (
        <div className="print-page-root printable-area invoice-container">
            <InvoiceTemplate
                data={invoice.data}
                calculations={calculations}
                businessInfo={businessConfig}
            />
            {/* 
                We use global styles in InvoiceTemplate.module.css or global.css
                to handle @media print visibility.
                Usually 'print-page-root' is just a wrapper.
            */}
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
