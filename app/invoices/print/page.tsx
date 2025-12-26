'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getInvoiceByIdAsync, SavedInvoice } from '@/lib/invoice-storage';
import { calculateInvoice, InvoiceCalculations } from '@/lib/calculations';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import { businessConfig } from '@/config/business';
import { generatePDFBlobUrl } from '@/lib/pdf-utils';
import { Printer, Download } from 'lucide-react';

function PrintPageContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const [invoice, setInvoice] = useState<SavedInvoice | null>(null);
    const [calculations, setCalculations] = useState<InvoiceCalculations | null>(null);
    const [status, setStatus] = useState('Loading invoice...');
    const [error, setError] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

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
                setStatus('Rendering invoice...');
            } else {
                setError(`Invoice not found (${invoiceId})`);
            }
        } catch (err) {
            setError('Failed to load invoice data');
        }
    };

    useEffect(() => {
        if (invoice && calculations && containerRef.current) {
            setStatus('Generating PDF...');
            // Wait for render
            setTimeout(async () => {
                try {
                    if (!containerRef.current) return;
                    const url = await generatePDFBlobUrl(containerRef.current, invoice.data.invoiceNumber);
                    // Replace current window with PDF
                    window.location.href = url;
                    setStatus('PDF Generated. Opening...');
                } catch (e) {
                    console.error(e);
                    setError('Failed to generate PDF');
                }
            }, 1000);
        }
    }, [invoice, calculations]);

    if (error) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: 'red', fontFamily: 'sans-serif' }}>
                <h2>Error</h2>
                <p>{error}</p>
                <button onClick={() => window.close()} style={{ padding: '8px 16px', marginTop: 20 }}>Close</button>
            </div>
        );
    }

    if (!invoice || !calculations) {
        return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>{status}</div>;
    }

    return (
        <div style={{ minHeight: '100vh', background: '#ccc', padding: 20 }}>
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'white', zIndex: 9999, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
                <div style={{ fontSize: 24, marginBottom: 16, fontWeight: 600 }}>{status}</div>
                <div style={{ color: '#666' }}>Please wait while we prepare your document...</div>
            </div>

            {/* Hidden render container for PDF generation */}
            <div ref={containerRef} style={{ position: 'absolute', top: -9999, left: -9999 }}>
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
