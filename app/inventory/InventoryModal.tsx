import React, { useState, useEffect } from 'react';
import { InventoryItem, deriveCategory } from '@/lib/inventory-storage';

interface InventoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: Partial<InventoryItem>) => Promise<void>;
    initialData?: InventoryItem | null;
}

export default function InventoryModal({ isOpen, onClose, onSave, initialData }: InventoryModalProps) {
    const [formData, setFormData] = useState<Partial<InventoryItem>>({
        sku: '',
        description: '',
        design: '',
        widthFeet: 0,
        widthInches: 0,
        lengthFeet: 0,
        lengthInches: 0,
        price: 0,
        material: '',
        origin: '',
        colorBg: '',
        colorBorder: '',
        zone: '',
        importCost: 0,
        totalCost: 0,
        shape: 'rectangle',
        status: 'AVAILABLE'
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            // Reset for new item
            setFormData({
                sku: '',
                description: '',
                design: '',
                widthFeet: 0,
                widthInches: 0,
                lengthFeet: 0,
                lengthInches: 0,
                price: 0,
                material: '',
                origin: '',
                colorBg: '',
                colorBorder: '',
                zone: '',
                importCost: 0,
                totalCost: 0,
                shape: 'rectangle',
                status: 'AVAILABLE'
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Failed to save item', error);
            alert('Failed to save item. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (field: keyof InventoryItem, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="luxury-card animate-slide-up" style={{
                background: 'var(--bg-nebula)',
                padding: 32,
                borderRadius: 24,
                width: '95%',
                maxWidth: '700px',
                maxHeight: '90vh',
                overflowY: 'auto',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 25px 80px rgba(0,0,0,0.8)',
                backdropFilter: 'blur(40px)'
            }}>
                <h2 style={{ marginTop: 0, marginBottom: 24, fontSize: 24, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                    {initialData ? 'Edit Inventory Item' : 'Add New Item'}
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Unique Identifier */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-dim)' }}>SKU / Rug Number *</label>
                        <input
                            type="text"
                            required
                            value={formData.sku}
                            onChange={e => handleChange('sku', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: '1px solid var(--glass-border)',
                                background: 'var(--glass-bg)',
                                color: 'var(--text-main)',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Basic Info */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-dim)' }}>Design *</label>
                        <input
                            type="text"
                            required
                            value={formData.design}
                            onChange={e => handleChange('design', e.target.value)}
                            placeholder="e.g. Tabriz, Oushak"
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: '1px solid var(--glass-border)',
                                background: 'var(--glass-bg)',
                                color: 'var(--text-main)',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Dimensions */}
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-dim)' }}>Width (Ft / In)</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="number"
                                placeholder="Ft"
                                value={formData.widthFeet || ''}
                                onChange={e => handleChange('widthFeet', Number(e.target.value))}
                                style={{
                                    width: '50%',
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--glass-bg)',
                                    color: 'var(--text-main)',
                                    outline: 'none'
                                }}
                            />
                            <input
                                type="number"
                                placeholder="In"
                                min={0}
                                max={11}
                                value={formData.widthInches === 0 ? '' : formData.widthInches}
                                onChange={e => handleChange('widthInches', e.target.value === '' ? 0 : Number(e.target.value))}
                                style={{
                                    width: '50%',
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--glass-bg)',
                                    color: 'var(--text-main)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-dim)' }}>Length (Ft / In)</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="number"
                                placeholder="Ft"
                                value={formData.lengthFeet || ''}
                                onChange={e => handleChange('lengthFeet', Number(e.target.value))}
                                style={{
                                    width: '50%',
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--glass-bg)',
                                    color: 'var(--text-main)',
                                    outline: 'none'
                                }}
                            />
                            <input
                                type="number"
                                placeholder="In"
                                min={0}
                                max={11}
                                value={formData.lengthInches === 0 ? '' : formData.lengthInches}
                                onChange={e => handleChange('lengthInches', e.target.value === '' ? 0 : Number(e.target.value))}
                                style={{
                                    width: '50%',
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--glass-bg)',
                                    color: 'var(--text-main)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-dim)' }}>Shape</label>
                        <select
                            value={formData.shape}
                            onChange={e => handleChange('shape', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: '1px solid var(--glass-border)',
                                background: 'var(--glass-bg)',
                                color: 'var(--text-main)',
                                outline: 'none'
                            }}
                        >
                            <option value="rectangle">Rectangle</option>
                            <option value="round">Round</option>
                            <option value="oval">Oval</option>
                            <option value="square">Square</option>
                            <option value="runner">Runner</option>
                        </select>
                    </div>

                    {/* Details */}
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-dim)' }}>Material</label>
                        <input
                            type="text"
                            value={formData.material || ''}
                            onChange={e => handleChange('material', e.target.value)}
                            placeholder="Wool, Silk, etc."
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: '1px solid var(--glass-border)',
                                background: 'var(--glass-bg)',
                                color: 'var(--text-main)',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-dim)' }}>Origin</label>
                        <input
                            type="text"
                            value={formData.origin || ''}
                            onChange={e => handleChange('origin', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: '1px solid var(--glass-border)',
                                background: 'var(--glass-bg)',
                                color: 'var(--text-main)',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-dim)' }}>Color (Bg)</label>
                        <input
                            type="text"
                            value={formData.colorBg || ''}
                            onChange={e => handleChange('colorBg', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: '1px solid var(--glass-border)',
                                background: 'var(--glass-bg)',
                                color: 'var(--text-main)',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Financials */}
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-dim)' }}>Selling Price ($)</label>
                        <input
                            type="number"
                            value={formData.price || ''}
                            onChange={e => handleChange('price', Number(e.target.value))}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: '1px solid var(--glass-border)',
                                background: 'var(--glass-bg)',
                                color: 'var(--text-main)',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-dim)' }}>Cost ($) (Optional)</label>
                        <input
                            type="number"
                            value={formData.totalCost || ''}
                            onChange={e => handleChange('totalCost', Number(e.target.value))}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: '1px solid var(--glass-border)',
                                background: 'var(--glass-bg)',
                                color: 'var(--text-main)',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Zone */}
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-dim)' }}>Zone / Location</label>
                        <input
                            type="text"
                            value={formData.zone || ''}
                            onChange={e => handleChange('zone', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: '1px solid var(--glass-border)',
                                background: 'var(--glass-bg)',
                                color: 'var(--text-main)',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-dim)' }}>Quality</label>
                        <input
                            type="text"
                            value={formData.quality || ''}
                            onChange={e => handleChange('quality', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: '1px solid var(--glass-border)',
                                background: 'var(--glass-bg)',
                                color: 'var(--text-main)',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="luxury-button"
                            style={{
                                padding: '10px 24px',
                                background: 'transparent',
                                color: 'var(--text-dim)',
                                border: '1px solid var(--glass-border)'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="luxury-button"
                            style={{
                                padding: '10px 32px',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                opacity: isSaving ? 0.7 : 1,
                                boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
                            }}
                        >
                            {isSaving ? 'Saving...' : 'Save Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
