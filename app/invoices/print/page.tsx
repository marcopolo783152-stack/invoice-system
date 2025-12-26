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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (id) {
            loadInvoice(id);
        } else {
            setError('No Invoice ID provided');
            setLoading(false);
        }
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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && invoice && calculations) {
            // Wait for DOM updates and images
            const timer = setTimeout(() => {
                window.print();
            }, 1000); // 1s delay to Ensure content is ready
            return () => clearTimeout(timer);
        }
    }, [loading, invoice, calculations]);

    const handleManualPrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
                <div style={{ marginBottom: 20 }}>Prepare for printing...</div>
                <div style={{ fontSize: 12, color: '#666' }}>ID: {id}</div>
            </div>
        );
    }

    if (error || !invoice || !calculations) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: 'red', fontFamily: 'sans-serif' }}>
                <h2>Error Printing Invoice</h2>
                <p>{error || 'Unknown error occurred'}</p>
                <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', marginTop: 20, cursor: 'pointer' }}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div style={{ background: 'white', minHeight: '100vh', position: 'relative' }}>
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

            <InvoiceTemplate
                data={invoice.data}
                calculations={calculations}
                businessInfo={businessConfig}
            />
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
