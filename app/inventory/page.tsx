'use client';

import React, { useState, useEffect } from 'react';
import { getInventoryItems, InventoryItem, importInventoryBatch, deleteInventoryItem, deriveCategory } from '@/lib/inventory-storage';
import * as XLSX from 'xlsx';
import Link from 'next/link';

export default function InventoryManager() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    const [activeMaterial, setActiveMaterial] = useState('All'); // New Material Filter
    const [isLoading, setIsLoading] = useState(true);

    const categories = ['All', 'Small / 2x3', '3x5 / 4x6', '5x7 / 6x9', '8x10', '9x12', '10x14', 'Oversize / Palace', 'Runner', 'Round', 'Other'];
    const materials = ['All', 'Silk', 'Wool', 'Silk/Wool', 'Wool/Silk'];

    useEffect(() => {
        loadInventory();
        // Check for imported items from session (if coming from upload page redirect)
        // Not implemented yet, we do direct upload here.
    }, []);

    const loadInventory = async () => {
        setIsLoading(true);
        const data = await getInventoryItems();
        setItems(data);
        setIsLoading(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            // Map standard Excel columns to our schema
            const mapped: Partial<InventoryItem>[] = data.map((row: any) => ({
                sku: row['Rug Number']?.toString() || row['SKU'] || '',
                description: row['Design'] || row['Description'] || '',
                shape: (row['Shape'] || '').toLowerCase().includes('round') ? 'round' : 'rectangle',
                widthFeet: Number(row['W Foot'] || row['Width_Ft']) || 0,
                widthInches: Number(row['W Inch'] || row['Width_In']) || 0,
                lengthFeet: Number(row['Length Foot'] || row['Length_Ft']) || 0,
                lengthInches: Number(row['Length Inch'] || row['Length_In']) || 0,
                price: Number(row['Selling Price'] || row['Price'] || row['Fixed Top']) || 0,
                origin: row['Origin'] || '',
                quality: row['Quality'] || row['quality'] || '',
                design: row['Design'] || '',
                colorBg: row['Color Bg'] || '',
                colorBorder: row['Color Border'] || '',
                importCost: Number(row['Total cost'] || row['Cost']) || 0,
                totalCost: Number(row['Total cost']) || 0,
                zone: row['Zone'] || '',
                material: row['Material'] || row['Content'] || row['Composition'] || ''
            }));


            if (mapped.length > 0) {
                if (confirm(`Found ${mapped.length} items. Import them?`)) {
                    await importInventoryBatch(mapped);
                    alert('Import successful!');
                    loadInventory();
                }
            } else {
                alert('No items found. Please check column headers (Rug Number, Design, W Foot, etc.)');
            }
            e.target.value = ''; // Reset
        };
        reader.readAsBinaryString(file);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this item?')) {
            await deleteInventoryItem(id);
            loadInventory();
        }
    };

    // Filter Logic
    const filteredItems = items.filter(item => {
        // 1. Tab Filter
        if (activeTab !== 'All' && item.category !== activeTab) {
            // Re-derive if category missing/stale
            const derived = deriveCategory(item.widthFeet, item.widthInches, item.lengthFeet, item.lengthInches, item.shape);
            if (derived !== activeTab) return false;
        }

        // 2. Material Filter
        if (activeMaterial !== 'All') {
            const m = (item.material || '').toLowerCase();
            const filterM = activeMaterial.toLowerCase();

            // Strict checking for mixed types if needed, or simple includes
            // User asked for "Silk", "Wool", "Silk/Wool", "Wool/Silk" to be separate
            if (activeMaterial === 'Silk/Wool' || activeMaterial === 'Wool/Silk') {
                return m.includes('silk') && m.includes('wool');
            }
            if (activeMaterial === 'Silk') {
                // Exclude blends if strictly Silk selected? 
                // Usually "Silk" means pure silk. 
                return m.includes('silk') && !m.includes('wool');
            }
            if (activeMaterial === 'Wool') {
                return m.includes('wool') && !m.includes('silk');
            }
        }

        // 3. Search Filter
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const mat = (item.material || '').toLowerCase(); // Include material in search
        return (
            item.sku.toLowerCase().includes(term) ||
            item.description.toLowerCase().includes(term) ||
            item.origin?.toLowerCase().includes(term) ||
            mat.includes(term) ||
            false
        );
    });

    return (
        <div style={{ padding: 40, background: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Inventory Manager</h1>
                    <p style={{ color: '#64748b' }}>Manage your digital pick list.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <Link href="/" style={{ textDecoration: 'none', padding: '10px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 8, color: '#475569', fontWeight: 600 }}>
                        ← Back to Dashboard
                    </Link>
                    <label style={{ cursor: 'pointer', padding: '10px 20px', background: '#3b82f6', color: 'white', borderRadius: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>📥 Bulk Upload</span>
                        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>
                </div>
            </header>

            {/* Categories */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, marginBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveTab(cat)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 20,
                            border: 'none',
                            background: activeTab === cat ? '#0f172a' : 'white',
                            color: activeTab === cat ? 'white' : '#64748b',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: activeTab === cat ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Material Tabs - Secondary Level */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, marginBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600, color: '#64748b', marginRight: 8 }}>Material:</span>
                {materials.map(mat => (
                    <button
                        key={mat}
                        onClick={() => setActiveMaterial(mat)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: 16,
                            border: '1px solid #e2e8f0',
                            background: activeMaterial === mat ? '#475569' : 'white',
                            color: activeMaterial === mat ? 'white' : '#64748b',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: 13,
                        }}
                    >
                        {mat}
                    </button>
                ))}
            </div>

            {/* Search */}
            <input
                type="text"
                placeholder="Search by SKU, Design, Origin..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                    width: '100%',
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    marginBottom: 24,
                    fontSize: 16,
                    boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
                }}
            />

            {/* List */}
            {isLoading ? (
                <div>Loading inventory...</div>
            ) : (
                <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f1f5f9' }}>
                            <tr>
                                <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: '#64748b' }}>Rug #</th>
                                <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: '#64748b' }}>Preview</th>
                                <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: '#64748b' }}>Description</th>
                                <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: '#64748b' }}>Design</th>
                                <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: '#64748b' }}>Size</th>
                                <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: '#64748b' }}>Material</th>
                                <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: '#64748b' }}>Origin</th>
                                <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: '#64748b' }}>Price</th>
                                <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: '#64748b' }}>Status</th>
                                <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: '#64748b' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.slice(0, 50).map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: 16, fontWeight: 700 }}>{item.sku}</td>
                                    <td style={{ padding: 16 }}>
                                        <div style={{ width: 48, height: 48, background: '#f1f5f9', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {item.image ? (
                                                <img src={item.image} alt="" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                                            ) : (
                                                <span style={{ fontSize: 20 }}>🖼️</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: 16 }}>
                                        <div style={{ fontWeight: 600 }}>{item.description}</div>
                                        <div style={{ fontSize: 12, color: '#64748b' }}>{item.design} {item.colorBg && `• ${item.colorBg}`}</div>
                                    </td>
                                    <td style={{ padding: 16 }}>
                                        {item.widthFeet}'{item.widthInches}" x {item.lengthFeet}'{item.lengthInches}"
                                        {item.shape === 'round' && ' (Round)'}
                                    </td>
                                    <td style={{ padding: 16 }}>
                                        <span style={{ fontSize: 13, padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', color: '#475569' }}>
                                            {item.material || '—'}
                                        </span>
                                    </td>
                                    <td style={{ padding: 16 }}>{item.origin}</td>
                                    <td style={{ padding: 16, fontWeight: 600 }}>${item.price.toLocaleString()}</td>
                                    <td style={{ padding: 16 }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: 20,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            background: item.status === 'SOLD' ? '#fecaca' : '#dcfce7',
                                            color: item.status === 'SOLD' ? '#991b1b' : '#166534'
                                        }}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: 16 }}>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                                        No items found in this category.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
