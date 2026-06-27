'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getInventoryItems, InventoryItem } from '@/lib/inventory-storage';
import { generateInventoryTagsPDF } from '@/lib/tag-pdf';

function PrintTagsContent() {
    const searchParams = useSearchParams();
    const idsParam = searchParams.get('ids');
    const [loading, setLoading] = useState(true);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!idsParam) return;
            const allItems = await getInventoryItems();
            const ids = new Set(idsParam.split(','));
            const selected = allItems.filter(i => ids.has(i.id));

            // Generate PDF
            const url = generateInventoryTagsPDF(selected);
            setPdfUrl(url);
            setLoading(false);
        };
        load();
    }, [idsParam]);

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Generating PDF...</div>;

    if (!pdfUrl) return <div style={{ padding: 40, color: 'red' }}>Error generating PDF</div>;

    return (
        <div style={{ height: '100vh', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 20px', background: '#f0f2f5', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 16, margin: 0 }}>Print Preview (PDF)</h2>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={() => window.location.href = '/inventory'}
                        style={{ padding: '8px 16px', background: 'white', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}
                    >
                        Back
                    </button>
                    <button
                        onClick={() => {
                            const link = document.createElement('a');
                            link.href = pdfUrl!;
                            link.download = 'inventory-tags.pdf';
                            link.click();
                        }}
                        style={{ padding: '8px 16px', background: '#1e293b', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    >
                        Download PDF
                    </button>
                    <button
                        onClick={() => {
                            // Print the iframe
                            const iframe = document.querySelector('iframe');
                            iframe?.contentWindow?.print();
                        }}
                        style={{ padding: '8px 16px', background: '#1e50ff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                    >
                        Print
                    </button>
                </div>
            </div>
            <iframe
                src={pdfUrl}
                style={{ flex: 1, border: 'none', width: '100%' }}
                title="Tags PDF"
            />
        </div>
    );
}

export default function PrintTagsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PrintTagsContent />
        </Suspense>
    );
}
