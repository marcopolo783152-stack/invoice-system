'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { getInventoryItems, InventoryItem } from '@/lib/inventory-storage';

function PrintTagsContent() {
    const searchParams = useSearchParams();
    const idsParam = searchParams.get('ids');
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const load = async () => {
            if (!idsParam) return;
            const allItems = await getInventoryItems();
            const ids = new Set(idsParam.split(','));
            const selected = allItems.filter(i => ids.has(i.id));
            setItems(selected);
            setLoading(false);

            // Auto print after a short delay
            setTimeout(() => {
                window.print();
            }, 1000);
        };
        load();
    }, [idsParam]);

    // Cleanup: Remove class when unmounting
    useEffect(() => {
        if (mounted) {
            document.body.classList.add('has-print-portal');
            return () => {
                document.body.classList.remove('has-print-portal');
            };
        }
    }, [mounted]);

    if (loading) return <div style={{ padding: 20 }}>Loading tags...</div>;

    // We render specifically into a portal to escape the layout constraints
    // This matches the logic found in app/print.css
    if (!mounted) return null;

    return createPortal(
        <div id="print-root" style={{ background: 'white', minHeight: '100vh', width: '100%', position: 'absolute', top: 0, left: 0 }}>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+39+Text&family=Inter:wght@400;600;800&display=swap');

                .tag-grid {
                    display: grid;
                    /* Avery 5161: 2 columns */
                    grid-template-columns: 4in 4in; 
                    column-gap: 0.18in; 
                    row-gap: 0;
                    width: 8.35in; /* 4 + 4 + 0.18 + slack */
                    padding-left: 0.16in; /* Left Margin */
                    padding-top: 0.5in;   /* Top Margin */
                }

                .tag {
                    width: 100%;
                    height: 1in;
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    padding: 0.05in 0.15in; /* Reduce padding to fit content */
                    gap: 8px;
                    page-break-inside: avoid;
                    overflow: hidden;
                    outline: 1px dotted rgba(0,0,0,0.1); /* Faint guide for cutting, optional */
                }
                
                .tag-left {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    overflow: hidden;
                }

                .tag-right {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    justify-content: center;
                    text-align: right;
                    min-width: 90px;
                    flex-shrink: 0;
                }

                .barcode {
                    font-family: 'Libre Barcode 39 Text', cursive;
                    font-size: 24px; /* Reduced font size to prevent overlapping */
                    white-space: nowrap;
                    margin: 1px 0;
                }

                @media print {
                    @page { 
                        size: letter; 
                        margin: 0; /* Clear browser margins, we control exact positioning via padding */
                    }
                    
                    /* HIDE EVERYTHING GLOBALLY */
                    body * {
                        visibility: hidden;
                    }

                    /* SHOW ONLY OUR PRINT ROOT */
                    #print-root, #print-root * {
                        visibility: visible;
                    }

                    /* Important: Reset body layout to ensure absolute positioning works relative to page */
                    html, body {
                        background: white !important;
                        height: 100% !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }

                    #print-root {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                    }
                    
                    .tag {
                        outline: none; /* Remove guide in print if desired, or keep for testing */
                    }

                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="tag-grid">
                {items.map((item) => (
                    <div key={item.id} className="tag">
                        {/* Left Side: Brand, SKU, Details */}
                        <div className="tag-left">
                            <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', marginBottom: 1, lineHeight: 1 }}>Marco Polo Rugs</div>
                            <div style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 11, marginBottom: 1 }}>SKU: {item.sku}</div>
                            <div style={{ fontFamily: 'Inter', fontSize: 10, lineHeight: 1.1 }}>
                                {item.widthFeet}'{item.widthInches}" × {item.lengthFeet}'{item.lengthInches}" {item.shape === 'round' ? '(R)' : ''}
                            </div>
                            <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#000', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                                {item.material || item.quality}
                            </div>
                        </div>

                        {/* Right Side: Logo, Barcode, Price */}
                        <div className="tag-right">
                            {/* Mini Logo */}
                            <img src="/invoice-logo.png" alt="" style={{ height: 14, marginBottom: 1, objectFit: 'contain' }} />

                            {/* Barcode (SKU) */}
                            <div className="barcode">*{item.sku}*</div>

                            {/* Price */}
                            <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 14 }}>
                                ${item.price?.toLocaleString()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>,
        document.body
    );
}

export default function PrintTagsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PrintTagsContent />
        </Suspense>
    );
}
