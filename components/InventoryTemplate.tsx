import React from 'react';
import { InventoryItem } from '@/lib/inventory-storage';

interface Props {
    item: InventoryItem;
}

export default function InventoryTemplate({ item }: Props) {
    // Helper to format dimensions
    const formatDimensions = () => {
        return `${item.widthFeet}'${item.widthInches}" × ${item.lengthFeet}'${item.lengthInches}" ${item.shape === 'round' ? '(Round)' : ''}`;
    };

    return (
        <div className="pdf-page" style={{ 
            width: '8.5in',
            minHeight: '11in',
            padding: '0.6in',
            margin: '0 auto',
            background: 'white',
            fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            color: '#1a1a1a',
            position: 'relative',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header / Branding */}
            <div style={{ 
                borderBottom: '2px solid #1e293b', 
                paddingBottom: '20px', 
                marginBottom: '40px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>
                        ARIANA
                    </h1>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Oriental Rugs & Textiles
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>PRODUCT SPECIFICATION</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Registry ID: {item.sku}</div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px', flex: 1 }}>
                
                {/* Left: Image Box */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ 
                        width: '100%', 
                        height: '400px', 
                        background: '#f8fafc', 
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}>
                        {item.image || (item.images && item.images.length > 0) ? (
                            <img 
                                src={item.image || item.images![0]} 
                                alt={item.sku}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                        ) : (
                            <div style={{ color: '#cbd5e1', fontWeight: 600 }}>IMAGE NOT AVAILABLE</div>
                        )}
                    </div>

                    {/* Additional Details Box */}
                    <div style={{ 
                        background: '#f1f5f9', 
                        borderRadius: '12px', 
                        padding: '24px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Asset Highlights
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <DetailRow label="Design" value={item.design || item.description} />
                            <DetailRow label="Origin" value={item.origin} />
                            <DetailRow label="Composition" value={item.material || item.quality} />
                            <DetailRow label="Color Palette" value={item.colorBg + (item.colorBorder ? ` / ${item.colorBorder}` : '')} />
                        </div>
                    </div>
                </div>

                {/* Right: Technical Details & Pricing */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    
                    {/* Identification section */}
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Object Description</div>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>
                            {item.description || "Oriental Area Rug"}
                        </h2>
                    </div>

                    {/* Dimensions section */}
                    <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '12px', textTransform: 'uppercase' }}>Dimensions</div>
                        <div style={{ fontSize: '22px', fontWeight: 600, color: '#1e293b' }}>
                            {formatDimensions()}
                        </div>
                    </div>

                    {/* Valuation Section */}
                    <div style={{ marginTop: 'auto', padding: '32px', background: '#1e293b', color: 'white', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Estimated Valuation
                        </div>
                        <div style={{ fontSize: '42px', fontWeight: 800 }}>
                            ${item.price.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '16px' }}>
                            Valuation current as of {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                    </div>

                    {/* Quality Mark */}
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <div style={{ 
                            display: 'inline-block',
                            padding: '12px 24px',
                            border: '2px solid #e2e8f0',
                            borderRadius: '50px',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em'
                        }}>
                            ARIANA Certified Authentic
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Contact */}
            <div style={{ 
                marginTop: '60px', 
                paddingTop: '20px', 
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: '#94a3b8',
                fontWeight: 600
            }}>
                <div>ARIANA ORIENTAL RUGS INC | 3210 DUKE ST, ALEXANDRIA, VA 22314</div>
                <div>+1 (703) 801 1640</div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .pdf-page { margin: 0 !important; box-shadow: none !important; }
                }
            `}} />
        </div>
    );
}

function DetailRow({ label, value }: { label: string, value?: string }) {
    if (!value) return null;
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>{label}</span>
            <span style={{ color: '#1e293b', fontWeight: 700 }}>{value}</span>
        </div>
    );
}
