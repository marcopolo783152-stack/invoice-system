import React, { useState, useEffect } from 'react';
import { Calculator, X, RotateCcw } from 'lucide-react';



type Mode = 'rectangle' | 'round';

export function InlineRugCalculator() {
    const [mode, setMode] = useState<Mode>('rectangle');

    // Rectangle Inputs
    const [widthFt, setWidthFt] = useState('');
    const [widthIn, setWidthIn] = useState('');
    const [lengthFt, setLengthFt] = useState('');
    const [lengthIn, setLengthIn] = useState('');

    // Round Inputs
    const [diameterFt, setDiameterFt] = useState('');
    const [diameterIn, setDiameterIn] = useState('');

    const [pricePerSqFt, setPricePerSqFt] = useState('');

    const [result, setResult] = useState<number | null>(null);
    const [totalPrice, setTotalPrice] = useState<number | null>(null);

    useEffect(() => {
        calculate();
    }, [widthFt, widthIn, lengthFt, lengthIn, diameterFt, diameterIn, mode, pricePerSqFt]);

    const calculate = () => {
        let area: number | null = null;
        if (mode === 'rectangle') {
            const w = (parseFloat(widthFt) || 0) + (parseFloat(widthIn) || 0) / 12;
            const l = (parseFloat(lengthFt) || 0) + (parseFloat(lengthIn) || 0) / 12;
            if (w > 0 && l > 0) area = w * l;
        } else {
            const d = (parseFloat(diameterFt) || 0) + (parseFloat(diameterIn) || 0) / 12;
            if (d > 0) {
                const r = d / 2;
                area = Math.PI * r * r;
            }
        }

        setResult(area);

        if (area !== null && pricePerSqFt) {
            setTotalPrice(area * parseFloat(pricePerSqFt));
        } else {
            setTotalPrice(area && pricePerSqFt ? area * parseFloat(pricePerSqFt) : null);
            // Actually, simplified:
            const p = parseFloat(pricePerSqFt);
            if (area !== null && !isNaN(p) && p > 0) {
                setTotalPrice(area * p);
            } else {
                setTotalPrice(null);
            }
        }
    };

    const reset = () => {
        setWidthFt(''); setWidthIn('');
        setLengthFt(''); setLengthIn('');
        setDiameterFt(''); setDiameterIn('');
        setPricePerSqFt('');
        setResult(null);
        setTotalPrice(null);
    };

    

    return (
        <div style={{
            background: 'white', padding: '32px', borderRadius: '0px',
            width: '100%', maxWidth: '600px', margin: '0 auto',
            border: '1px solid #E5E1DA',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 12, color: '#1f2937' }}>
                        <Calculator size={28} className="text-blue-600" style={{ color: '#2563eb' }} />
                        Rug Size Calculator
                    </h2>
                    
                </div>

                {/* Mode Switcher */}
                <div style={{ background: '#f1f5f9', padding: 4, borderRadius: 12, display: 'flex', marginBottom: 24 }}>
                    <button
                        onClick={() => { setMode('rectangle'); reset(); }}
                        style={{
                            flex: 1, padding: '10px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                            background: mode === 'rectangle' ? 'white' : 'transparent',
                            color: mode === 'rectangle' ? '#1f2937' : '#6b7280',
                            boxShadow: mode === 'rectangle' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        Rectangle
                    </button>
                    <button
                        onClick={() => { setMode('round'); reset(); }}
                        style={{
                            flex: 1, padding: '10px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                            background: mode === 'round' ? 'white' : 'transparent',
                            color: mode === 'round' ? '#1f2937' : '#6b7280',
                            boxShadow: mode === 'round' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        Round
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {mode === 'rectangle' ? (
                        <>
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Width</label>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            type="number" value={widthFt} onChange={e => setWidthFt(e.target.value)}
                                            placeholder="0"
                                            style={{ width: '100%', padding: '12px', paddingRight: 32, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 600 }}
                                        />
                                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 12, fontWeight: 600 }}>ft</span>
                                    </div>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            type="number" value={widthIn} onChange={e => setWidthIn(e.target.value)}
                                            placeholder="0"
                                            style={{ width: '100%', padding: '12px', paddingRight: 32, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 600 }}
                                        />
                                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 12, fontWeight: 600 }}>in</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Length</label>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            type="number" value={lengthFt} onChange={e => setLengthFt(e.target.value)}
                                            placeholder="0"
                                            style={{ width: '100%', padding: '12px', paddingRight: 32, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 600 }}
                                        />
                                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 12, fontWeight: 600 }}>ft</span>
                                    </div>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            type="number" value={lengthIn} onChange={e => setLengthIn(e.target.value)}
                                            placeholder="0"
                                            style={{ width: '100%', padding: '12px', paddingRight: 32, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 600 }}
                                        />
                                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 12, fontWeight: 600 }}>in</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diameter</label>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <input
                                        type="number" value={diameterFt} onChange={e => setDiameterFt(e.target.value)}
                                        placeholder="0"
                                        style={{ width: '100%', padding: '12px', paddingRight: 32, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 600 }}
                                    />
                                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 12, fontWeight: 600 }}>ft</span>
                                </div>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <input
                                        type="number" value={diameterIn} onChange={e => setDiameterIn(e.target.value)}
                                        placeholder="0"
                                        style={{ width: '100%', padding: '12px', paddingRight: 32, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 600 }}
                                    />
                                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 12, fontWeight: 600 }}>in</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price per Sq Ft</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                value={pricePerSqFt}
                                onChange={e => setPricePerSqFt(e.target.value)}
                                placeholder="0.00"
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 32px',
                                    borderRadius: 10,
                                    border: '1px solid #cbd5e1',
                                    fontSize: 16,
                                    fontWeight: 600,
                                    boxSizing: 'border-box'
                                }}
                            />
                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 14, fontWeight: 700 }}>$</span>
                        </div>
                    </div>

                    {/* Result */}
                    <div style={{
                        marginTop: 12,
                        padding: 24,
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        borderRadius: 16,
                        textAlign: 'center',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16
                    }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>TOTAL AREA</div>
                            <div style={{ fontSize: 32, fontWeight: 800, color: '#1f2937', lineHeight: 1 }}>
                                {result !== null ? result.toFixed(2) : '0.00'}
                                <span style={{ fontSize: 16, fontWeight: 600, color: '#6b7280', marginLeft: 6 }}>sq ft</span>
                            </div>
                        </div>

                        {totalPrice !== null && (
                            <div style={{ paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>ESTIMATED TOTAL</div>
                                <div style={{ fontSize: 42, fontWeight: 900, color: '#10b981', lineHeight: 1 }}>
                                    <span style={{ fontSize: 24, fontWeight: 700, marginRight: 2 }}>$</span>
                                    {totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                        <button
                            onClick={reset}
                            style={{
                                background: 'transparent', border: 'none', color: '#6b7280',
                                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            <RotateCcw size={14} /> Clear
                        </button>
                    </div>

                </div>
            </div>
    );
}
