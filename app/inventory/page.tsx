'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
    getInventoryItems,
    saveInventoryItem,
    deleteInventoryItem,
    InventoryItem
} from '@/lib/inventory-storage';
import { formatCurrency, RugShape } from '@/lib/calculations';
import { Search, Plus, Trash2, Edit, Save, X, Image as ImageIcon } from 'lucide-react';
import Login from '@/components/Login';

function InventoryContent() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<InventoryItem> | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<InventoryItem>>({
        sku: '',
        description: '',
        shape: 'rectangle',
        widthFeet: 0,
        widthInches: 0,
        lengthFeet: 0,
        lengthInches: 0,
        price: 0,
        status: 'AVAILABLE',
        image: ''
    });

    useEffect(() => {
        // Authenticate
        const auth = sessionStorage.getItem('mp-invoice-auth') || localStorage.getItem('mp-invoice-auth');
        const user = sessionStorage.getItem('mp-invoice-user') || localStorage.getItem('mp-invoice-user');

        if (auth === '1' && user) {
            setIsAuthenticated(true);
            try { setCurrentUser(JSON.parse(user)); } catch { }
            loadInventory();
        } else {
            setIsAuthenticated(false);
            setLoading(false);
        }
    }, []);

    const onLogin = () => {
        setIsAuthenticated(true);
        loadInventory();
    };

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredItems(items);
        } else {
            const lower = searchQuery.toLowerCase();
            setFilteredItems(items.filter(i =>
                i.sku.toLowerCase().includes(lower) ||
                i.description.toLowerCase().includes(lower)
            ));
        }
    }, [searchQuery, items]);

    const loadInventory = async () => {
        setLoading(true);
        const data = await getInventoryItems();
        setItems(data);
        setFilteredItems(data);
        setLoading(false);
    };

    if (loading) return <div style={{ padding: 40, color: '#666' }}>Loading inventory...</div>;
    if (!isAuthenticated) return <Login onLogin={onLogin} />;

    const handleAddNew = () => {
        setEditingItem(null);
        setFormData({
            sku: '',
            description: '',
            shape: 'rectangle',
            widthFeet: 0,
            widthInches: 0,
            lengthFeet: 0,
            lengthInches: 0,
            price: 0,
            status: 'AVAILABLE',
            image: ''
        });
        setShowModal(true);
    };

    const handleEdit = (item: InventoryItem) => {
        setEditingItem(item);
        setFormData({ ...item });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        await deleteInventoryItem(id);
        await loadInventory();
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await saveInventoryItem({ ...formData, id: editingItem.id });
            } else {
                await saveInventoryItem(formData);
            }
            setShowModal(false);
            await loadInventory();
        } catch (err) {
            alert('Error saving item');
        }
    };

    const handleImageUpload = (file: File) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            // Basic resize logic (can be shared utility later)
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 400;
                let w = img.width;
                let h = img.height;

                if (w > h) {
                    if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; }
                } else {
                    if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; }
                }

                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, w, h);
                setFormData(prev => ({ ...prev, image: canvas.toDataURL('image/jpeg', 0.8) }));
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1f3c', marginBottom: 8 }}>
                        Inventory
                    </h1>
                    <p style={{ color: '#64748b' }}>Manage your digital pick list</p>
                </div>
                <button
                    onClick={handleAddNew}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: '#0f172a', color: 'white',
                        padding: '12px 24px', borderRadius: 12,
                        border: 'none', fontWeight: 600, cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                    }}
                >
                    <Plus size={20} /> Add New Rug
                </button>
            </header>

            {/* Search */}
            <div style={{ marginBottom: 24, position: 'relative' }}>
                <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                    type="text"
                    placeholder="Search by SKU or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: '100%', padding: '16px 16px 16px 48px',
                        borderRadius: 16, border: '1px solid #e2e8f0',
                        fontSize: 16, outline: 'none', background: 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                />
            </div>

            {/* List */}
            <div style={{ background: 'white', borderRadius: 24, padding: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                            <th style={{ padding: 16, borderRadius: '16px 0 0 16px' }}>Image</th>
                            <th style={{ padding: 16 }}>SKU</th>
                            <th style={{ padding: 16 }}>Description</th>
                            <th style={{ padding: 16 }}>Size</th>
                            <th style={{ padding: 16 }}>Price</th>
                            <th style={{ padding: 16 }}>Status</th>
                            <th style={{ padding: 16, borderRadius: '0 16px 16px 0' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: 16 }}>
                                    {item.image ? (
                                        <img src={item.image} alt={item.sku} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                    ) : (
                                        <div style={{ width: 48, height: 48, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ImageIcon size={20} color="#cbd5e1" />
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: 16, fontWeight: 600 }}>{item.sku}</td>
                                <td style={{ padding: 16, color: '#64748b' }}>{item.description}</td>
                                <td style={{ padding: 16 }}>
                                    {item.shape === 'round'
                                        ? `${item.widthFeet}'${item.widthInches}" Round`
                                        : `${item.widthFeet}'${item.widthInches}" × ${item.lengthFeet}'${item.lengthInches}"`
                                    }
                                </td>
                                <td style={{ padding: 16, color: '#0f172a', fontWeight: 600 }}>{formatCurrency(item.price)}</td>
                                <td style={{ padding: 16 }}>
                                    <span style={{
                                        padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                                        background: item.status === 'AVAILABLE' ? '#dcfce7' : item.status === 'SOLD' ? '#fee2e2' : '#ffedd5',
                                        color: item.status === 'AVAILABLE' ? '#166534' : item.status === 'SOLD' ? '#991b1b' : '#9a3412'
                                    }}>
                                        {item.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td style={{ padding: 16 }}>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => handleEdit(item)} style={{ padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                                            <Edit size={16} color="#64748b" />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} style={{ padding: 8, borderRadius: 8, border: '1px solid #fee2e2', background: '#fef2f2', cursor: 'pointer' }}>
                                            <Trash2 size={16} color="#ef4444" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredItems.length === 0 && (
                            <tr>
                                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                                    No items found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit/Add Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', zIndex: 100,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        background: 'white', borderRadius: 24, padding: 32,
                        width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <h2 style={{ marginBottom: 24 }}>{editingItem ? 'Edit Rug' : 'Add New Rug'}</h2>
                        <form onSubmit={handleSave}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>SKU</label>
                                    <input
                                        required
                                        value={formData.sku}
                                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                        style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                        style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                                    >
                                        <option value="AVAILABLE">Available</option>
                                        <option value="SOLD">Sold</option>
                                        <option value="ON_APPROVAL">On Approval</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Description</label>
                                <input
                                    required
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Shape</label>
                                    <select
                                        value={formData.shape}
                                        onChange={e => setFormData({ ...formData, shape: e.target.value as RugShape })}
                                        style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                                    >
                                        <option value="rectangle">Rectangle</option>
                                        <option value="round">Round</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Price</label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                        style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600 }}>Width (Ft)</label>
                                    <input type="number" value={formData.widthFeet} onChange={e => setFormData({ ...formData, widthFeet: Number(e.target.value) })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600 }}>Width (In)</label>
                                    <input type="number" value={formData.widthInches} onChange={e => setFormData({ ...formData, widthInches: Number(e.target.value) })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                </div>
                                {formData.shape === 'rectangle' && (
                                    <>
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 600 }}>Length (Ft)</label>
                                            <input type="number" value={formData.lengthFeet} onChange={e => setFormData({ ...formData, lengthFeet: Number(e.target.value) })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 600 }}>Length (In)</label>
                                            <input type="number" value={formData.lengthInches} onChange={e => setFormData({ ...formData, lengthInches: Number(e.target.value) })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Image</label>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                    {formData.image && (
                                        <img src={formData.image} style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => handleImageUpload(e.target.files![0])}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '12px 24px', borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: '#0f172a', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Save Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function InventoryPage() {
    return (
        <Suspense fallback={<div>Loading inventory...</div>}>
            <InventoryContent />
        </Suspense>
    );
}
