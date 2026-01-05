'use client';

import React, { useState, useEffect } from 'react';
import { getInventoryItems, InventoryItem, importInventoryBatch, deleteInventoryItem, deleteInventoryBatch, deriveCategory, saveInventoryItem } from '@/lib/inventory-storage';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import InventoryModal from './InventoryModal';

export default function InventoryManager() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    const [activeMaterial, setActiveMaterial] = useState('All'); // New Material Filter
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

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
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });

                let allItems: any[] = [];

                // Iterate ALL sheets
                wb.SheetNames.forEach((sheetName, index) => {
                    const ws = wb.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json(ws);
                    if (data.length > 0 && index === 0) {
                        const firstRowKeys = Object.keys(data[0] as any).join(', ');
                        alert(`Debug: Reading Sheet "${sheetName}". Found columns: ${firstRowKeys}`);
                    }
                    allItems = [...allItems, ...data];
                });

                // Helper to find value case-insensitively
                const getValue = (row: any, ...keys: string[]) => {
                    const rowKeys = Object.keys(row);
                    for (const k of keys) {
                        // Exact match
                        if (row[k] !== undefined) return row[k];
                        // Case insensitive match
                        const foundKey = rowKeys.find(rk => rk.toLowerCase().trim() === k.toLowerCase().trim());
                        if (foundKey && row[foundKey] !== undefined) return row[foundKey];

                        // "Contains" match (useful for "Zone 15" when searching for "Zone")
                        if (k === 'Zone') {
                            const containsKey = rowKeys.find(rk => rk.toLowerCase().includes('zone'));
                            if (containsKey) return row[containsKey];
                        }
                    }
                    return undefined;
                };

                // Map standard Excel columns to our schema
                const mapped: Partial<InventoryItem>[] = allItems.map((row: any) => {
                    // Try multiple variations for each field
                    const sku = getValue(row, 'Rug Number', 'SKU', 'Stock Number', 'ID')?.toString();

                    // Skip empty rows
                    if (!sku) return null;

                    return {
                        sku: getValue(row, 'Rug Number', 'SKU', 'Stock Number', 'ID', 'Rug #', 'Stock #')?.toString(),
                        description: getValue(row, 'Design', 'Description', 'Pattern', 'Desing', 'Desc') || '',
                        shape: (getValue(row, 'Shape')?.toString() || '').toLowerCase().includes('round') ? 'round' : 'rectangle',
                        widthFeet: Number(getValue(row, 'W Foot', 'Width_Ft', 'Width Feet', 'Width', 'W')) || 0,
                        widthInches: Number(getValue(row, 'W Inch', 'Width_In', 'Width Inches', 'Inches')) || 0,
                        lengthFeet: Number(getValue(row, 'length Foot', 'Length_Ft', 'Length Feet', 'Length', 'L')) || 0,
                        lengthInches: Number(getValue(row, 'Length Inch', 'Length_In', 'Length Inches', 'Inches')) || 0,
                        price: Number(getValue(row, 'Selling Price', 'Price', 'Retail Price', 'Sell Price')) || 0,
                        origin: getValue(row, 'origin', 'Country', 'Origin', 'Place of Origin') || '',
                        quality: getValue(row, 'quality', 'Quality', 'Material', 'Content') || '',
                        design: getValue(row, 'Desing', 'Desc', 'Design', 'Pattern') || '',
                        colorBg: getValue(row, 'Color Bg', 'Background Color', 'Field Color', 'Color') || '',
                        colorBorder: getValue(row, 'Color Border', 'Border Color', 'Border') || '',
                        importCost: Number(getValue(row, 'cost per sq foot', 'Cost', 'Import Cost')) || 0,
                        totalCost: Number(getValue(row, 'Total cost', 'Total Cost', 'Cost')) || 0,
                        zone: getValue(row, 'Zone', 'Location', 'Bin') || '',
                        material: getValue(row, 'quality', 'Material', 'Content', 'Composition') || ''
                    };
                }).filter(Boolean) as Partial<InventoryItem>[]; // Filter out nulls

                if (mapped.length > 0) {
                    if (confirm(`Found ${mapped.length} valid items across ${wb.SheetNames.length} sheets. Import them?`)) {
                        const count = await importInventoryBatch(mapped);
                        alert(`Successfully imported ${count} items!`);
                        loadInventory();
                    }
                } else {
                    alert('No valid items found. Please check column headers (Rug Number, Design, W Foot, etc.)');
                }
            } catch (error) {
                console.error('Import error:', error);
                alert('Error parsing file. Please ensure it is a valid Excel file.');
            }
            e.target.value = ''; // Reset
        };
        reader.readAsBinaryString(file);
    };

    const handleSaveItem = async (item: Partial<InventoryItem>) => {
        try {
            await saveInventoryItem(item);
            setIsModalOpen(false);
            setEditingItem(null);
            loadInventory(); // Refresh list
        } catch (error) {
            console.error(error);
            alert('Failed to save item');
        }
    };

    const downloadTemplate = () => {
        const templateData = [
            {
                'Rug Number': '197111',
                'Desing': 'Super kazak',
                'W Foot': 8,
                'W Inch': 5,
                'length Foot': 10,
                'Length Inch': 9,
                'quality': 'Wool',
                'origin': 'Afghanistan',
                'cost per sq foot': 1350,
                'Total cost': 3375,
                'Color Border': 'Blue',
                'Color Bg': 'Red',
                'Regular Price': 10800,
                'Selling Price': 3375,
                'Zone': 'Zone 1'
            },
            {
                'Rug Number': '197115',
                'Desing': 'Fine Mahal',
                'W Foot': 8,
                'W Inch': 2,
                'length Foot': 10,
                'Length Inch': 9,
                'quality': 'Wool',
                'origin': 'Afghanistan',
                'cost per sq foot': 1350,
                'Total cost': 3375,
                'Color Border': 'Blue',
                'Color Bg': 'Blue',
                'Regular Price': 10800,
                'Selling Price': 3375,
                'Zone': 'Zone 1'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory Template");
        XLSX.writeFile(wb, "inventory_import_template.xlsx");
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this item?')) {
            await deleteInventoryItem(id);
            loadInventory();
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = filteredItems.map(i => i.id);
            setSelectedItems(new Set(allIds));
        } else {
            setSelectedItems(new Set());
        }
    };

    const handleSelectOne = (id: string) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedItems(newSet);
    };

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return;
        if (confirm(`Are you sure you want to delete ${selectedItems.size} items?`)) {
            setIsLoading(true);
            await deleteInventoryBatch(Array.from(selectedItems));
            setSelectedItems(new Set());
            await loadInventory();
            setIsLoading(false);
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Inventory Manager</h1>
                        <p style={{ color: '#64748b' }}>Manage your digital pick list.</p>
                    </div>
                    {selectedItems.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            style={{
                                padding: '8px 16px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                            }}
                        >
                            Delete Selected ({selectedItems.size})
                        </button>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={() => {
                            setEditingItem(null);
                            setIsModalOpen(true);
                        }}
                        style={{
                            padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13
                        }}
                    >
                        ➕ Add Item
                    </button>
                    <Link href="/dashboard">
                        <button style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>
                            ← Back to Dashboard
                        </button>
                    </Link>
                    <button
                        onClick={downloadTemplate}
                        style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        📝 Template
                    </button>
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
                                <th style={{ padding: 16, width: 40 }}>
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={filteredItems.length > 0 && selectedItems.size === filteredItems.length}
                                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                                    />
                                </th>
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
                            {filteredItems.slice(0, 500).map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: selectedItems.has(item.id) ? '#f0fdf4' : 'white' }}>
                                    <td style={{ padding: 16 }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.has(item.id)}
                                            onChange={() => handleSelectOne(item.id)}
                                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                                        />
                                    </td>
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
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.description || item.design}</div>
                                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {item.quality && <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>Qty: {item.quality}</span>}
                                            {item.origin && <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>Org: {item.origin}</span>}
                                            {item.zone && <span style={{ background: '#fff7ed', color: '#c2410c', padding: '2px 6px', borderRadius: 4 }}>{item.zone}</span>}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                            {[
                                                item.colorBg && `Bg: ${item.colorBg}`,
                                                item.colorBorder && `Border: ${item.colorBorder}`
                                            ].filter(Boolean).join(' • ')}
                                        </div>
                                    </td>
                                    <td style={{ padding: 16 }}>
                                        {item.design}
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
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                                onClick={() => {
                                                    setEditingItem(item);
                                                    setIsModalOpen(true);
                                                }}
                                                style={{ color: '#3b82f6', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                Delete
                                            </button>
                                        </div>
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
            {/* Inventory Modal */}
            <InventoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveItem}
                initialData={editingItem}
            />
        </div>
    );
}
