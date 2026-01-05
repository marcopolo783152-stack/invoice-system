'use client';

import React, { useState, useEffect } from 'react';
import { InventoryItem, searchInventory } from '@/lib/inventory-storage';

interface InventorySearchProps {
    onClose: () => void;
    onSelect: (item: InventoryItem) => void;
}

export default function InventorySearch({ onClose, onSelect }: InventorySearchProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<InventoryItem[]>([]);
    const [category, setCategory] = useState('All');
    const [isLoading, setIsLoading] = useState(false);

    // Initial load
    useEffect(() => {
        handleSearch();
    }, [category]); // Reload when category changes

    const handleSearch = async () => {
        setIsLoading(true);
        // Debounce could be added here for optimization
        const items = await searchInventory(searchTerm, category);
        setResults(items);
        setIsLoading(false);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                background: 'white',
                width: '90%',
                maxWidth: 800,
                borderRadius: 12,
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ padding: 20, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 18 }}>Select Item from Inventory</h2>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer', color: '#64748b' }}>×</button>
                </div>

                <div style={{ padding: 16, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            style={{
                                padding: '10px 16px',
                                borderRadius: 8,
                                border: '1px solid #e2e8f0',
                                outline: 'none'
                            }}
                        >
                            <option value="All">All Categories</option>
                            <option value="Runner">Runners</option>
                            <option value="9x12">9x12</option>
                            <option value="8x10">8x10</option>
                            <option value="Round">Round</option>
                            <option value="Oversize / Palace">Oversize</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Search SKU, Description, Origin..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            autoFocus
                            style={{
                                flex: 1,
                                padding: '10px 16px',
                                borderRadius: 8,
                                border: '1px solid #e2e8f0',
                                outline: 'none'
                            }}
                        />
                        <button
                            onClick={handleSearch}
                            style={{
                                padding: '10px 20px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Search
                        </button>
                    </div>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                            <tr>
                                <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Image</th>
                                <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>SKU / Info</th>
                                <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Size</th>
                                <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Price</th>
                                <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                                <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center' }}>Searching...</td></tr>
                            ) : results.length === 0 ? (
                                <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No items found.</td></tr>
                            ) : (
                                results.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: 12 }}>
                                            <div style={{ width: 40, height: 40, background: '#f1f5f9', borderRadius: 4 }}>
                                                {item.image && <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                            </div>
                                        </td>
                                        <td style={{ padding: 12 }}>
                                            <div style={{ fontWeight: 700 }}>{item.sku}</div>
                                            <div style={{ fontSize: 13, color: '#64748b' }}>{item.description}</div>
                                        </td>
                                        <td style={{ padding: 12 }}>
                                            {item.widthFeet}'{item.widthInches}" x {item.lengthFeet}'{item.lengthInches}"
                                        </td>
                                        <td style={{ padding: 12, fontWeight: 600 }}>
                                            ${item.price.toLocaleString()}
                                        </td>
                                        <td style={{ padding: 12 }}>
                                            <span style={{
                                                fontSize: 11,
                                                padding: '2px 6px',
                                                borderRadius: 12,
                                                background: item.status === 'AVAILABLE' ? '#dcfce7' : '#fee2e2',
                                                color: item.status === 'AVAILABLE' ? '#166534' : '#991b1b'
                                            }}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: 12, textAlign: 'right' }}>
                                            <button
                                                onClick={() => onSelect(item)}
                                                disabled={item.status !== 'AVAILABLE'}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: item.status === 'AVAILABLE' ? '#22c55e' : '#e2e8f0',
                                                    color: item.status === 'AVAILABLE' ? 'white' : '#94a3b8',
                                                    border: 'none',
                                                    borderRadius: 6,
                                                    cursor: item.status === 'AVAILABLE' ? 'pointer' : 'not-allowed',
                                                    fontWeight: 600,
                                                    fontSize: 13
                                                }}
                                            >
                                                Add +
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
