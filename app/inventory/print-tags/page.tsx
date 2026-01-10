'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getInventoryItems, InventoryItem } from '@/lib/inventory-storage';

function PrintTagsContent() {
    const searchParams = useSearchParams();
    const idsParam = searchParams.get('ids');
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!idsParam) return;
            const allItems = await getInventoryItems();
            const ids = new Set(idsParam.split(','));
            const selected = allItems.filter(i => ids.has(i.id));
            setItems(selected);
            setLoading(false);

            // Auto print after a short delay to ensure fonts load
            setTimeout(() => {
                window.print();
            }, 1000);
        };
        load();
    }, [idsParam]);

    if (loading) return <div style={{ padding: 20 }}>Loading tags...</div>;

    return (
        <div style={{ background: 'white', minHeight: '100vh' }}>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+39+Text&family=Inter:wght@400;600;800&display=swap');

                @media print {
                    @page { margin: 0.5in 0.15in; size: letter; }
                    
                    /* Reset global layout containers */
                    html, body, #__next {
                        margin: 0 !important; 
                        padding: 0 !important; 
                        height: auto !important; 
                        overflow: visible !important; 
                        background: white !important;
                        display: block !important;
                    }

                    /* Hide sidebar and other layout elements explicitly */
                    .sidebar-container, .desktop-sidebar-space, header, .mobile-only-header {
                        display: none !important;
                    }

                    /* Ensure main content is visible and resets flexbox constraints */
                    .main-content {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        display: block !important;
                        overflow: visible !important;
                        flex: none !important;
                    }

                    /* Visibility helpers */
                    .no-print { display: none !important; }
                    .tag-grid { display: grid !important; }
                }

                .tag-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    column-gap: 0.18in; /* Standard gap for Avery 5161 */
                    row-gap: 0;
                    width: 100%;
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
