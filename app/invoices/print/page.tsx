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
    const [status, setStatus] = useState('Initializing...');
    const [error, setError] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id) loadInvoice(id);
        else setError('No Invoice ID provided');
    }, [id]);

    const loadInvoice = async (invoiceId: string) => {
        try {
            setStatus('Loading invoice data...');
            const data = await getInvoiceByIdAsync(invoiceId);
            if (data) {
                setInvoice(data);
                setCalculations(calculateInvoice(data.data));
                setStatus('Rendering document...');
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

            // Give React a moment to render the template in the hidden container
            const generate = async () => {
                try {
                    // Slight delay to ensure images/fonts might be ready
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    if (!containerRef.current) return;
                    console.log('Starting PDF generation...');

                    const url = await generatePDFBlobUrl(containerRef.current, invoice.data.invoiceNumber);
                    console.log('PDF Generated, redirecting to blob...');

                    setStatus('Opening PDF...');
                    window.location.href = url;
                } catch (e) {
                    console.error('PDF Generation failed:', e);
                    setError('Failed to generate PDF. Please try again.');
                }
            };

            generate();
        }
    }, [invoice, calculations, containerRef]);

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

    // Main UI - Loading State
    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', padding: 40, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', textAlign: 'center', maxWidth: 400 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, animation: 'spin 1s linear infinite' }}>
                    <Loader2 size={32} color="#3b82f6" />
                </div>
                <h2 style={{ fontSize: 20, color: '#1e293b', marginBottom: 8, fontWeight: 600 }}>{status}</h2>
                <p style={{ color: '#64748b', fontSize: 14 }}>Please wait while we prepare your document.</p>
                {invoice && <p style={{ marginTop: 16, fontSize: 12, color: '#94a3b8' }}>Invoice #{invoice.data.invoiceNumber}</p>}
            </div>

            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>

            {/* 
                HIDDEN RENDER CONTAINER 
                Must be visible to the DOM (display cannot be none) for html2canvas to work.
                Position absolute off-screen is the best technique.
                Width set to 800px to approximate Letter/A4 width for consistent rendering.
            */}
            <div
                ref={containerRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '800px', // Enforce generic print width
                    zIndex: -1,
                    visibility: 'visible', // Ensure it's not hidden
                    transform: 'translateX(-10000px)' // Move way off screen
                }}
            >
                {invoice && calculations && (
                    <InvoiceTemplate
                        data={invoice.data}
                        calculations={calculations}
                        businessInfo={businessConfig}
                    />
                )}
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
