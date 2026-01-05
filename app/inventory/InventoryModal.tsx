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
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{
                background: 'white', padding: 24, borderRadius: 12, width: '90%', maxWidth: '600px',
                maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ marginTop: 0, marginBottom: 20, fontSize: 20 }}>
                    {initialData ? 'Edit Inventory Item' : 'Add New Item'}
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Unique Identifier */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>SKU / Rug Number *</label>
                        <input
                            type="text"
                            required
                            value={formData.sku}
                            onChange={e => handleChange('sku', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        />
                    </div>

                    {/* Basic Info */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Design *</label>
                        <input
                            type="text"
                            required
                            value={formData.design}
                            onChange={e => handleChange('design', e.target.value)}
                            placeholder="e.g. Tabriz, Oushak"
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        />
                    </div>

                    {/* Dimensions */}
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Width (Ft / In)</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="number"
                                placeholder="Ft"
                                value={formData.widthFeet || ''}
                                onChange={e => handleChange('widthFeet', Number(e.target.value))}
                                style={{ width: '50%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                            />
                            <input
                                type="number"
                                placeholder="In"
                                value={formData.widthInches || ''}
                                onChange={e => handleChange('widthInches', Number(e.target.value))}
                                style={{ width: '50%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                            />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Length (Ft / In)</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="number"
                                placeholder="Ft"
                                value={formData.lengthFeet || ''}
                                onChange={e => handleChange('lengthFeet', Number(e.target.value))}
                                style={{ width: '50%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                            />
                            <input
                                type="number"
                                placeholder="In"
                                value={formData.lengthInches || ''}
                                onChange={e => handleChange('lengthInches', Number(e.target.value))}
                                style={{ width: '50%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Shape</label>
                        <select
                            value={formData.shape}
                            onChange={e => handleChange('shape', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
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
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Material</label>
                        <input
                            type="text"
                            value={formData.material || ''}
                            onChange={e => handleChange('material', e.target.value)}
                            placeholder="Wool, Silk, etc."
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Origin</label>
                        <input
                            type="text"
                            value={formData.origin || ''}
                            onChange={e => handleChange('origin', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Color (Bg)</label>
                        <input
                            type="text"
                            value={formData.colorBg || ''}
                            onChange={e => handleChange('colorBg', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        />
                    </div>

                    {/* Financials */}
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Selling Price ($)</label>
                        <input
                            type="number"
                            value={formData.price || ''}
                            onChange={e => handleChange('price', Number(e.target.value))}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Cost ($) (Optional)</label>
                        <input
                            type="number"
                            value={formData.totalCost || ''}
                            onChange={e => handleChange('totalCost', Number(e.target.value))}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        />
                    </div>

                    {/* Zone */}
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Zone / Location</label>
                        <input
                            type="text"
                            value={formData.zone || ''}
                            onChange={e => handleChange('zone', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Quality</label>
                        <input
                            type="text"
                            value={formData.quality || ''}
                            onChange={e => handleChange('quality', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        />
                    </div>

                    <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#0f172a', color: 'white', cursor: 'pointer', opacity: isSaving ? 0.7 : 1 }}
                        >
                            {isSaving ? 'Saving...' : 'Save Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
