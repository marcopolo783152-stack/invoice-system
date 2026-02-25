import React, { useState, useEffect } from 'react';
import { Calculator, X, RotateCcw } from 'lucide-react';

interface RugCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Mode = 'rectangle' | 'round';

export default function RugCalculatorModal({ isOpen, onClose }: RugCalculatorModalProps) {
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

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)', zIndex: 1200,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                background: 'white', padding: 32, borderRadius: 20,
                width: '100%', maxWidth: 480,
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                border: '1px solid var(--surface-border)',
                animation: 'slideUp 0.3s ease-out'
            }} onClick={e => e.stopPropagation()}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-main)' }}>
                        <Calculator size={28} className="text-blue-600" style={{ color: 'var(--primary)' }} />
                        Rug Size Calculator
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Mode Switcher */}
                <div style={{ background: '#f1f5f9', padding: 4, borderRadius: 12, display: 'flex', marginBottom: 24 }}>
                    <button
                        onClick={() => { setMode('rectangle'); reset(); }}
                        style={{
                            flex: 1, padding: '10px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                            background: mode === 'rectangle' ? 'white' : 'transparent',
                            color: mode === 'rectangle' ? 'var(--text-main)' : 'var(--text-muted)',
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
                            color: mode === 'round' ? 'var(--text-main)' : 'var(--text-muted)',
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
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Width</label>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            type="number" value={widthFt} onChange={e => setWidthFt(e.target.value)}
                                            placeholder="0"
                                            style={{ width: '100%', padding: '12px', paddingRight: 32, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 600 }}
                                        />
                                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>ft</span>
                                    </div>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            type="number" value={widthIn} onChange={e => setWidthIn(e.target.value)}
                                            placeholder="0"
                                            style={{ width: '100%', padding: '12px', paddingRight: 32, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 600 }}
                                        />
                                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>in</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Length</label>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            type="number" value={lengthFt} onChange={e => setLengthFt(e.target.value)}
                                            placeholder="0"
                                            style={{ width: '100%', padding: '12px', paddingRight: 32, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 600 }}
                                        />
                                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>ft</span>
                                    </div>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            type="number" value={lengthIn} onChange={e => setLengthIn(e.target.value)}
                                            placeholder="0"
                                            style={{ width: '100%', padding: '12px', paddingRight: 32, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 600 }}
                                        />
                                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>in</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diameter</label>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <input
                                        type="number" value={diameterFt} onChange={e => setDiameterFt(e.target.value)}
                                        placeholder="0"
                                        style={{ width: '100%', padding: '12px', paddingRight: 32, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 600 }}
                                    />
                                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>ft</span>
                                </div>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <input
                                        type="number" value={diameterIn} onChange={e => setDiameterIn(e.target.value)}
                                        placeholder="0"
                                        style={{ width: '100%', padding: '12px', paddingRight: 32, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 600 }}
                                    />
                                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>in</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price per Sq Ft</label>
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
                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14, fontWeight: 700 }}>$</span>
                        </div>
                    </div>

                    {/* Result */}
                    <div style={{
                        marginTop: 12,
                        padding: 24,
                        background: 'linear-gradient(135deg, var(--bg-slate) 0%, #f1f5f9 100%)',
                        borderRadius: 16,
                        textAlign: 'center',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16
                    }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>TOTAL AREA</div>
                            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                                {result !== null ? result.toFixed(2) : '0.00'}
                                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 6 }}>sq ft</span>
                            </div>
                        </div>

                        {totalPrice !== null && (
                            <div style={{ paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>ESTIMATED TOTAL</div>
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
                                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            <RotateCcw size={14} /> Clear
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
