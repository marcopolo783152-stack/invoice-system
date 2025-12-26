'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getInvoiceByIdAsync, SavedInvoice } from '@/lib/invoice-storage';
import { calculateInvoice, InvoiceCalculations } from '@/lib/calculations';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import { businessConfig } from '@/config/business';

function PrintPageContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const [invoice, setInvoice] = useState<SavedInvoice | null>(null);
    const [calculations, setCalculations] = useState<InvoiceCalculations | null>(null);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        if (!loading && invoice && calculations) {
            // Give specific time for fonts/images to load (better than load event sometimes)
            // or just trigger immediately
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [loading, invoice, calculations]);

    if (loading) return <div>Loading print view...</div>;

    if (!invoice || !calculations) {
        return <div style={{ padding: 20 }}>Error: Invoice not found</div>;
    }

    return (
        <div style={{ background: 'white', minHeight: '100vh' }}>
            <InvoiceTemplate
                data={invoice.data}
                calculations={calculations}
                businessInfo={businessConfig}
            />
            <style jsx global>{`
                /* Hide sidebar/header if they somehow leak in (though layout should handle it) */
                .sidebar-container, .desktop-sidebar-space, header, .mobile-only-header {
                    display: none !important;
                }
                body {
                    background: white !important;
                }
                /* Print specific overrides if needed */
                @media print {
                    @page {
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                    }
                }
            `}</style>
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
