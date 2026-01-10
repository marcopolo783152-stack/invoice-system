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
        <div className="print-portal-root" style={{ background: 'white', minHeight: '100vh', width: '100%', position: 'absolute', top: 0, left: 0 }}>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+39+Text&family=Inter:wght@400;600;800&display=swap');

                /* Print overrides are handled by print.css via .print-portal-root */
                /* We just need to define the grid here */

                .tag-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    column-gap: 0.18in; /* Standard gap for Avery 5161 */
                    row-gap: 0;
                    width: 100%;
                    max-width: 8.5in; /* Ensure it fits on letter */
                    margin: 0 auto;
                }

                .tag {
                    width: 4in;
                    height: 1in;
                    box-sizing: border-box;
                    /* border: 1px dashed #ccc; */ /* Debug border, remove for final */
                    display: flex;
                    align-items: center;
                    padding: 0.1in 0.2in;
                    gap: 12px;
                    page-break-inside: avoid;
                    overflow: hidden;
                }
                
                .tag-left {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                .tag-right {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    justify-content: center;
                    text-align: right;
                    min-width: 100px;
                }

                .barcode {
                    font-family: 'Libre Barcode 39 Text', cursive;
                    font-size: 28px;
                    white-space: nowrap;
                    margin: 2px 0;
                }
            `}</style>

            <div className="tag-grid">
                {items.map((item) => (
                    <div key={item.id} className="tag">
                        {/* Left Side: Brand, SKU, Details */}
                        <div className="tag-left">
                            <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', marginBottom: 2 }}>Marco Polo Rugs</div>
                            <div style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 11 }}>SKU: {item.sku}</div>
                            <div style={{ fontFamily: 'Inter', fontSize: 10, marginTop: 1 }}>
                                {item.widthFeet}'{item.widthInches}" × {item.lengthFeet}'{item.lengthInches}" {item.shape === 'round' ? '(Round)' : ''}
                            </div>
                            <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#444', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                                {item.material || item.quality}
                            </div>
                        </div>

                        {/* Right Side: Logo, Barcode, Price */}
                        <div className="tag-right">
                            {/* Mini Logo */}
                            <img src="/invoice-logo.png" alt="" style={{ height: 16, marginBottom: 2, objectFit: 'contain' }} />

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
