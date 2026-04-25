import React, { useState, useEffect } from 'react';
import { InventoryItem, deriveCategory } from '@/lib/inventory-storage';
import { Printer, Tag, Calendar, Truck, User, Info, CheckCircle } from 'lucide-react';
import { openPDFInNewTab } from '@/lib/pdf-utils';
import { useRef } from 'react';

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
    const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
    const historyPrintRef = useRef<HTMLDivElement>(null);

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

    const handleMultiImageUpload = (files: FileList) => {
        if (!files || files.length === 0) return;

        const currentImages = formData.images || (formData.image ? [formData.image] : []);
        const slotsAvailable = 5 - currentImages.length;
        if (slotsAvailable <= 0) {
            alert('Maximum 5 images allowed.');
            return;
        }

        const filesToProcess = Array.from(files).slice(0, slotsAvailable);

        filesToProcess.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 600;
                    const MAX_HEIGHT = 600;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);

                    setFormData(prev => {
                        const imgs = prev.images || (prev.image ? [prev.image] : []);
                        if (imgs.length >= 5) return prev;
                        return { ...prev, images: [...imgs, dataUrl], image: dataUrl };
                    });
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setFormData(prev => {
            const newImages = (prev.images || []).filter((_, i) => i !== index);
            return { ...prev, images: newImages, image: newImages[0] || '' };
        });
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
                <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', marginBottom: 24, gap: 24 }}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('details')}
                        style={{
                            padding: '12px 0',
                            background: 'none',
                            border: 'none',
                            color: activeTab === 'details' ? 'var(--primary)' : 'var(--text-dim)',
                            borderBottom: activeTab === 'details' ? '2px solid var(--primary)' : 'none',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        Item Details
                    </button>
                    {initialData?.serviceHistory && initialData.serviceHistory.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('history')}
                            style={{
                                padding: '12px 0',
                                background: 'none',
                                border: 'none',
                                color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-dim)',
                                borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : 'none',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            Service History ({initialData.serviceHistory.length})
                        </button>
                    )}
                </div>

                {activeTab === 'details' ? (
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
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-dim)' }}>Status</label>
                            <select
                                value={formData.status}
                                onChange={e => handleChange('status', e.target.value)}
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
                                <option value="AVAILABLE">AVAILABLE</option>
                                <option value="SOLD">SOLD</option>
                                <option value="ON_APPROVAL">ON_APPROVAL</option>
                                <option value="WHOLESALE">WHOLESALE</option>
                            </select>
                        </div>

                        {/* Images Section */}
                        <div style={{ gridColumn: 'span 2', marginTop: 8 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-dim)' }}>
                                Rug Pictures (Max 5)
                            </label>

                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                                {(formData.images || (formData.image ? [formData.image] : [])).map((img, idx) => (
                                    <div key={idx} style={{ position: 'relative' }}>
                                        <img
                                            src={img}
                                            alt=""
                                            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 12, border: '2px solid var(--glass-border)' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(idx)}
                                            style={{
                                                position: 'absolute', top: -8, right: -8,
                                                background: '#ef4444', color: 'white', border: '2px solid white',
                                                borderRadius: '50%', width: 24, height: 24, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12
                                            }}
                                        >
                                            ✕
                                        </button>
                                        <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 6px', borderRadius: 6, fontSize: 10 }}>
                                            {idx + 1}
                                        </div>
                                    </div>
                                ))}

                                {(formData.images?.length || (formData.image ? 1 : 0)) < 5 && (
                                    <label style={{
                                        width: 80, height: 80, borderRadius: 12, border: '2px dashed var(--glass-border)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                        flexDirection: 'column', gap: 4, background: 'var(--glass-bg)'
                                    }}>
                                        <span style={{ fontSize: 24 }}>📷</span>
                                        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Add</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={e => handleMultiImageUpload(e.target.files!)}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                )}
                            </div>
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
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }} className="no-print">
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>Service History</h3>
                            <button
                                onClick={async () => {
                                    if (historyPrintRef.current) {
                                        await openPDFInNewTab(historyPrintRef.current, `History-${initialData?.sku || 'Item'}`);
                                    }
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--glass-bg)',
                                    color: 'var(--primary)',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: 600
                                }}
                            >
                                <Printer size={16} /> Print History
                            </button>
                        </div>
                        {initialData?.serviceHistory?.map((entry, idx) => (
                            <div key={idx} style={{ padding: '1.25rem', borderRadius: '1rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{entry.serviceType}</div>
                                        <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>{entry.vendorName}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 800, color: 'var(--primary)' }}>${entry.cost.toLocaleString()}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{new Date(entry.dateSent).toLocaleDateString()} - {entry.dateReturned ? new Date(entry.dateReturned).toLocaleDateString() : 'N/A'}</div>
                                    </div>
                                </div>
                                {entry.notes && <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: 0, opacity: 0.8 }}>{entry.notes}</p>}
                                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>Received by: {entry.receivedBy}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Hidden Print Section for History */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '850px' }}>
                <div ref={historyPrintRef}>
                    <div className="pdf-page" style={{
                        padding: '40px',
                        color: 'black',
                        background: 'white',
                        fontFamily: "'Inter', sans-serif",
                        minHeight: '1050px',
                        width: '800px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Branding Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '30px' }}>
                            <div style={{ flex: 1 }}>
                                <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 5px 0' }}>ARIANA ORIENTAL RUGS INC</h1>
                                <p style={{ margin: '1px 0', fontSize: '11px' }}>3210 DUKE ST, ALEXANDRIA, VA 22314</p>
                                <p style={{ margin: '1px 0', fontSize: '11px' }}>Phone: +1 (703) 801 1640</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <img
                                    src="/LOGO.png"
                                    alt="Logo"
                                    style={{ height: '50px', marginBottom: '5px', objectFit: 'contain' }}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>SERVICE HISTORY REPORT</h2>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px' }}>
                                <span style={{ fontWeight: 600, fontSize: '12px' }}>SKU:</span>
                                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{initialData?.sku}</span>
                                <span style={{ fontWeight: 600, fontSize: '12px' }}>Description:</span>
                                <span style={{ fontSize: '13px' }}>{initialData?.description}</span>
                            </div>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', border: '1px solid #e2e8f0' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #333' }}>
                                    <th style={{ textAlign: 'left', padding: '10px', fontSize: '11px' }}>Date Sent</th>
                                    <th style={{ textAlign: 'left', padding: '10px', fontSize: '11px' }}>Vendor</th>
                                    <th style={{ textAlign: 'left', padding: '10px', fontSize: '11px' }}>Service</th>
                                    <th style={{ textAlign: 'left', padding: '10px', fontSize: '11px' }}>Returned</th>
                                    <th style={{ textAlign: 'right', padding: '10px', fontSize: '11px' }}>Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {initialData?.serviceHistory?.map((entry, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '10px', fontSize: '12px' }}>{new Date(entry.dateSent).toLocaleDateString()}</td>
                                        <td style={{ padding: '10px', fontSize: '12px' }}>{entry.vendorName}</td>
                                        <td style={{ padding: '10px', fontSize: '12px' }}>{entry.serviceType}</td>
                                        <td style={{ padding: '10px', fontSize: '12px' }}>{entry.dateReturned ? new Date(entry.dateReturned).toLocaleDateString() : 'Pending'}</td>
                                        <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold' }}>
                                            ${entry.cost.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ marginTop: '20px', textAlign: 'right', padding: '10px', borderTop: '2px solid #333' }}>
                            <span style={{ fontSize: '12px', marginRight: '10px' }}>Total Service Investment:</span>
                            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                                ${initialData?.serviceHistory?.reduce((sum, e) => sum + e.cost, 0).toLocaleString()}
                            </span>
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '20px', fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
                            Generated on {new Date().toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    #history-print-section { display: block !important; }
                    div[role="main"], .luxury-card, .luxury-button { display: none !important; }
                    #__next { overflow: visible !important; }
                }
            `}</style>
        </div>
    );
}
