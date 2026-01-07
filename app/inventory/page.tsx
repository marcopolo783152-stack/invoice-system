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
                        price: Number(getValue(row, 'Selling Price', 'Price', 'Retail Price', 'Sell Price', 'SellingPrice')) || 0,
                        origin: getValue(row, 'origin', 'Country', 'Origin', 'Place of Origin', 'Org') || '',
                        quality: getValue(row, 'quality', 'Quality', 'Material', 'Content', 'Qty') || '',
                        design: getValue(row, 'Design', 'Desing', 'Desc', 'Pattern', 'Model') || '',
                        colorBg: getValue(row, 'Color Bg', 'Background Color', 'Field Color', 'Color') || '',
                        colorBorder: getValue(row, 'Color Border', 'Border Color', 'Border') || '',
                        importCost: Number(getValue(row, 'cost per sq foot', 'Cost', 'Import Cost')) || 0,
                        totalCost: Number(getValue(row, 'Total cost', 'Cost', 'Purchase Price')) || 0,
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
        <div style={{ padding: 'var(--dashboard-padding)', maxWidth: 1400, margin: '0 auto' }}>
            <header style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
                <div className="animate-fade-in">
                    <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.03em', marginBottom: 6 }}>Asset Inventory</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Portfolio of high-end transaction assets.</p>
                        {selectedItems.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="luxury-button"
                                style={{ padding: '6px 14px', background: 'var(--accent-rose)', color: '#000', fontSize: 12 }}
                            >
                                DELETE SELECTED ({selectedItems.size})
                            </button>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} className="no-print">
                    <button
                        onClick={() => {
                            setEditingItem(null);
                            setIsModalOpen(true);
                        }}
                        className="luxury-button"
                    >
                        ➕ Add Item
                    </button>
                    <button
                        onClick={downloadTemplate}
                        className="luxury-button"
                        style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                    >
                        📝 Template
                    </button>
                    <label className="luxury-button" style={{ cursor: 'pointer' }}>
                        <span>📥 Bulk Upload</span>
                        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>
                </div>
            </header>

            {/* Filters Section */}
            <div className="luxury-card no-print" style={{ marginBottom: 32, padding: '32px 40px', background: 'var(--bg-nebula)' }}>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 20, marginBottom: 24, borderBottom: '1px solid var(--glass-border)' }} className="hide-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveTab(cat)}
                            style={{
                                padding: '10px 24px',
                                borderRadius: 6,
                                border: '1px solid var(--glass-border)',
                                background: activeTab === cat ? 'var(--primary)' : 'transparent',
                                color: activeTab === cat ? '#000' : 'var(--text-muted)',
                                fontWeight: 700,
                                fontSize: 11,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-void)', padding: 4, borderRadius: 6, border: '1px solid var(--glass-border)' }}>
                        {materials.map(mat => (
                            <button
                                key={mat}
                                onClick={() => setActiveMaterial(mat)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 4,
                                    border: 'none',
                                    background: activeMaterial === mat ? 'var(--primary)' : 'transparent',
                                    color: activeMaterial === mat ? '#000' : 'var(--text-muted)',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: 11,
                                    transition: 'all 0.2s',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                {mat}
                            </button>
                        ))}
                    </div>

                    <div style={{ flex: 1, position: 'relative', minWidth: 320 }}>
                        <input
                            type="text"
                            placeholder="Identify specific assets by SKU, Design, or Origin..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px 12px 42px',
                                borderRadius: 8,
                                border: '1px solid var(--glass-border)',
                                background: 'var(--bg-void)',
                                color: 'var(--text-main)',
                                fontSize: 14,
                                outline: 'none',
                                transition: 'all 0.3s',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
                            }}
                            className="focus-glow"
                        />
                        <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>🔍</span>
                    </div>
                </div>
            </div>

            {/* List */}
            {isLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading inventory...</div>
            ) : (
                <div className="luxury-card" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-nebula)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: '16px 20px', width: 40, borderBottom: '1px solid var(--glass-border)' }}>
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={filteredItems.length > 0 && selectedItems.size === filteredItems.length}
                                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }}
                                        />
                                    </th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--glass-border)' }}>Identifier</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--glass-border)' }}>Visual</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--glass-border)' }}>Description</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--glass-border)' }}>Execution</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--glass-border)' }}>Dimensions</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--glass-border)' }}>Provenance</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--glass-border)' }}>Valuation</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--glass-border)' }}>Status</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--glass-border)' }}>Controls</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.slice(0, 500).map(item => (
                                    <tr key={item.id} style={{
                                        borderBottom: '1px solid var(--glass-border)',
                                        background: selectedItems.has(item.id) ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                                        transition: 'background 0.3s'
                                    }} className="hover-row">
                                        <td style={{ padding: '16px 20px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.has(item.id)}
                                                onChange={() => handleSelectOne(item.id)}
                                                style={{ width: 17, height: 17, cursor: 'pointer', accentColor: 'var(--primary)' }}
                                            />
                                        </td>
                                        <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--text-main)', fontSize: 15 }}>{item.sku}</td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{
                                                width: 54, height: 54,
                                                background: 'var(--glass-bg)',
                                                borderRadius: 10,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: 4,
                                                border: '1px solid var(--glass-border)'
                                            }}>
                                                {item.image ? (
                                                    <img src={item.image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 4 }} />
                                                ) : (
                                                    <span style={{ fontSize: 20, opacity: 0.5 }}>🖼️</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>{item.description || item.design}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {item.material && (
                                                    <span style={{ background: 'var(--glass-bg)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--glass-border)' }}>
                                                        {item.material}
                                                    </span>
                                                )}
                                                {item.quality && <span style={{ color: 'var(--text-muted)' }}>Quality: {item.quality}</span>}
                                                {item.zone && <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>Loc: {item.zone}</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                            {item.design}
                                        </td>
                                        <td style={{ padding: '16px 20px', color: 'var(--text-main)', fontWeight: 700 }}>
                                            {item.widthFeet}'{item.widthInches}" × {item.lengthFeet}'{item.lengthInches}"
                                            {item.shape === 'round' && <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 4 }}>[R]</span>}
                                        </td>
                                        <td style={{ padding: '16px 20px', color: 'var(--text-dim)' }}>{item.origin}</td>
                                        <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--text-main)', fontSize: 17 }}>${item.price.toLocaleString()}</td>
                                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '6px 12px',
                                                borderRadius: 10,
                                                fontSize: 11,
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                background: item.status === 'SOLD' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                color: item.status === 'SOLD' ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                                                border: `1px solid ${item.status === 'SOLD' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                                            }}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => {
                                                        setEditingItem(item);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="luxury-button"
                                                    style={{ padding: '8px 14px', fontSize: 12 }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="luxury-button"
                                                    style={{ padding: '8px', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)', border: '1px solid rgba(244, 63, 94, 0.2)' }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredItems.length === 0 && (
                                    <tr>
                                        <td colSpan={10} style={{ padding: 80, textAlign: 'center' }}>
                                            <div style={{ color: 'var(--text-dim)', fontSize: 16 }}>No items found match the filters.</div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
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
