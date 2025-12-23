'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Download, User, Phone, Mail, MapPin } from 'lucide-react';
import { getCustomers, exportCustomersCSV } from '@/lib/invoice-storage';

interface AddressBookModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddressBookModal({ isOpen, onClose }: AddressBookModalProps) {
    const [customers, setCustomers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadCustomers();
        }
    }, [isOpen]);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const data = await getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error('Failed to load customers', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleDownload = () => {
        const csv = exportCustomersCSV(filteredCustomers);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `AddressBook_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(4px)',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                background: 'white',
                width: '90%',
                maxWidth: 900,
                maxHeight: '85vh',
                borderRadius: 24,
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'modalEnter 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px 32px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#fff'
                }}>
                    <div>
                        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1a1f3c', margin: 0 }}>Address Book</h2>
                        <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: 14 }}>Preview and export your customer contacts.</p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '50%',
                            width: 40,
                            height: 40,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#64748b',
                            transition: 'all 0.2s'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Toolbar */}
                <div style={{
                    padding: '16px 32px',
                    background: '#f8fafc',
                    display: 'flex',
                    gap: 16,
                    alignItems: 'center',
                    borderBottom: '1px solid #f1f5f9'
                }}>
                    <div style={{
                        position: 'relative',
                        flex: 1
                    }}>
                        <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search by name, phone, or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 48px',
                                borderRadius: 12,
                                border: '1px solid #e2e8f0',
                                fontSize: 14,
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                        />
                    </div>
                    <button
                        onClick={handleDownload}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '12px 24px',
                            background: '#1e293b',
                            color: 'white',
                            border: 'none',
                            borderRadius: 12,
                            fontWeight: 600,
                            fontSize: 14,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Download size={18} />
                        Download CSV
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '0 32px'
                }}>
                    {loading ? (
                        <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Loading contacts...</div>
                    ) : filteredCustomers.length === 0 ? (
                        <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
                            {searchTerm ? 'No contacts match your search.' : 'Your address book is empty.'}
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                                    <th style={{ padding: '20px 0', color: '#64748b', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>Customer</th>
                                    <th style={{ padding: '20px 0', color: '#64748b', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>Contact Info</th>
                                    <th style={{ padding: '20px 0', color: '#64748b', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map((cust, idx) => (
                                    <tr key={cust.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td style={{ padding: '20px 0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <User size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: '#1a1f3c' }}>{cust.name}</div>
                                                    <div style={{ fontSize: 12, color: '#94a3b8' }}>ID: {cust.id.split('|')[1]}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px 0' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4b5563' }}>
                                                    <Phone size={14} color="#94a3b8" /> {cust.phone}
                                                </div>
                                                {cust.email && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4b5563' }}>
                                                        <Mail size={14} color="#94a3b8" /> {cust.email}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px 0' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, color: '#4b5563', maxWidth: 250 }}>
                                                <MapPin size={14} color="#94a3b8" style={{ marginTop: 2, flexShrink: 0 }} />
                                                <span>{cust.address}, {cust.city}, {cust.state} {cust.zip}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 32px',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    background: '#fff'
                }}>
                    <div style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                        Total: {filteredCustomers.length} contact{filteredCustomers.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes modalEnter {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
