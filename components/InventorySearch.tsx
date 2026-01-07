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
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <div className="luxury-card animate-slide-up" style={{
                background: 'var(--bg-nebula)',
                width: '95%',
                maxWidth: 900,
                borderRadius: 24,
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 25px 80px rgba(0,0,0,0.8)',
                backdropFilter: 'blur(40px)'
            }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Select Item from Inventory</h2>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer', color: 'var(--text-dim)', opacity: 0.7 }}>×</button>
                </div>

                <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            style={{
                                padding: '10px 16px',
                                borderRadius: 12,
                                border: '1px solid var(--glass-border)',
                                background: 'var(--bg-void)',
                                color: 'var(--text-main)',
                                outline: 'none',
                                fontWeight: 800,
                                fontSize: 13,
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)'
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
                                borderRadius: 12,
                                border: '1px solid var(--glass-border)',
                                background: 'var(--bg-void)',
                                color: 'var(--text-main)',
                                outline: 'none',
                                fontSize: 14,
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)'
                            }}
                            className="focus-glow"
                        />
                        <button
                            onClick={handleSearch}
                            className="luxury-button"
                            style={{
                                padding: '10px 24px',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: 13
                            }}
                        >
                            Search
                        </button>
                    </div>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, padding: 0 }} className="hide-scrollbar">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-nebula)', zIndex: 10 }}>
                            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.15em', borderBottom: '2px solid var(--glass-border)' }}>Image</th>
                                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.15em', borderBottom: '2px solid var(--glass-border)' }}>SKU / Info</th>
                                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.15em', borderBottom: '2px solid var(--glass-border)' }}>Size</th>
                                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.15em', borderBottom: '2px solid var(--glass-border)' }}>Price</th>
                                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.15em', borderBottom: '2px solid var(--glass-border)' }}>Status</th>
                                <th style={{ padding: '16px 20px', textAlign: 'left', borderBottom: '2px solid var(--glass-border)' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Searching...</td></tr>
                            ) : results.length === 0 ? (
                                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No items found.</td></tr>
                            ) : (
                                results.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--glass-border)' }} className="hover-row">
                                        <td style={{ padding: '12px 20px' }}>
                                            <div style={{ width: 44, height: 44, background: 'var(--glass-bg)', borderRadius: 8, border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 3 }}>
                                                {item.image ? (
                                                    <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                                                ) : (
                                                    <span style={{ fontSize: 16, opacity: 0.5 }}>🖼️</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 20px' }}>
                                            <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: 14 }}>{item.sku}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{item.description || item.design}</div>
                                        </td>
                                        <td style={{ padding: '12px 20px', color: 'var(--text-main)', fontWeight: 600, fontSize: 13 }}>
                                            {item.widthFeet}'{item.widthInches}" x {item.lengthFeet}'{item.lengthInches}"
                                        </td>
                                        <td style={{ padding: '12px 20px', fontWeight: 800, color: 'var(--text-main)', fontSize: 15 }}>
                                            ${item.price.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px 20px' }}>
                                            <span style={{
                                                fontSize: 10,
                                                fontWeight: 800,
                                                padding: '4px 8px',
                                                borderRadius: 8,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                background: item.status === 'AVAILABLE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                                color: item.status === 'AVAILABLE' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                                                border: `1px solid ${item.status === 'AVAILABLE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`
                                            }}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                                            <button
                                                onClick={() => onSelect(item)}
                                                disabled={item.status !== 'AVAILABLE'}
                                                className="luxury-button"
                                                style={{
                                                    padding: '6px 14px',
                                                    background: item.status === 'AVAILABLE' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                    color: item.status === 'AVAILABLE' ? 'white' : 'var(--text-muted)',
                                                    border: 'none',
                                                    opacity: item.status === 'AVAILABLE' ? 1 : 0.5,
                                                    fontSize: 12,
                                                    fontWeight: 700
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
