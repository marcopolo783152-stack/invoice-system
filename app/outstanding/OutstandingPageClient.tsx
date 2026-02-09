'use client';

import React, { useState, useEffect } from 'react';
import { User, ChevronDown, ChevronUp, ExternalLink, Search, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import { getOutstandingBalances } from '@/lib/invoice-storage';
import Link from 'next/link';
import styles from './OutstandingPage.module.css';

export default function OutstandingPageClient() {
    const [balances, setBalances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

    const loadBalances = async () => {
        setLoading(true);
        try {
            const data = await getOutstandingBalances();
            setBalances(data);
        } catch (error) {
            console.error('Failed to load balances:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBalances();
    }, []);

    const filteredBalances = balances.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.phone.includes(searchQuery)
    );

    const totalOutstanding = balances.reduce((sum, b) => sum + b.balance, 0);

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                        Outstanding Balances
                    </h1>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '16px' }}>
                        Track and manage unpaid invoices for your customers.
                    </p>
                </div>
                <div style={{ textAlign: 'right', background: 'white', padding: '16px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Outstanding</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626' }}>{formatCurrency(totalOutstanding)}</div>
                </div>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search by customer name or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px 10px 40px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '14px',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                        />
                    </div>
                    <button
                        onClick={loadBalances}
                        disabled={loading}
                        style={{
                            padding: '10px 16px',
                            backgroundColor: 'white',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#334155'
                        }}
                    >
                        <RefreshCw size={16} className={loading ? 'spin' : ''} />
                        Refresh
                    </button>
                </div>

                <div style={{ padding: '0' }}>
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                            <RefreshCw size={32} className="spin" style={{ marginBottom: '16px' }} />
                            <p>Loading balances...</p>
                        </div>
                    ) : filteredBalances.length === 0 ? (
                        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🌈</div>
                            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>All Clear!</h3>
                            <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
                                There are no outstanding balances matching your criteria.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {filteredBalances.map((item, idx) => (
                                <div key={idx} style={{ borderBottom: idx === filteredBalances.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                                    <div
                                        onClick={() => setExpandedCustomer(expandedCustomer === item.name ? null : item.name)}
                                        style={{
                                            padding: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '20px',
                                            cursor: 'pointer',
                                            backgroundColor: expandedCustomer === item.name ? '#f1f5f9' : 'transparent',
                                            transition: 'background-color 0.2s',
                                            userSelect: 'none'
                                        }}
                                    >
                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <User size={24} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>{item.name}</div>
                                            <div style={{ fontSize: '14px', color: '#64748b' }}>{item.phone}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 800, fontSize: '20px', color: '#dc2626' }}>{formatCurrency(item.balance)}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{item.invoices.length} Invoices Owed</div>
                                        </div>
                                        <div style={{ color: '#94a3b8' }}>
                                            {expandedCustomer === item.name ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                        </div>
                                    </div>

                                    {expandedCustomer === item.name && (
                                        <div style={{ padding: '0 20px 20px 88px', backgroundColor: '#f8fafc' }}>
                                            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                                    <thead>
                                                        <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                                                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Invoice #</th>
                                                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date Created</th>
                                                            <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Unpaid Amount</th>
                                                            <th style={{ padding: '12px 16px', width: '100px' }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {item.invoices.map((inv: any) => (
                                                            <tr key={inv.id} style={{ borderTop: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                                                                <td style={{ padding: '14px 16px', color: '#0284c7', fontWeight: 700 }}>{inv.invoiceNumber}</td>
                                                                <td style={{ padding: '14px 16px', color: '#334155' }}>{inv.date}</td>
                                                                <td style={{ padding: '14px 16px', color: '#dc2626', fontWeight: 700, textAlign: 'right' }}>{formatCurrency(inv.balanceDue)}</td>
                                                                <td style={{ padding: '14px 16px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                    <Link
                                                                        href={`/invoices/view?id=${inv.id}`}
                                                                        style={{
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '6px',
                                                                            padding: '6px 12px',
                                                                            backgroundColor: '#f8fafc',
                                                                            color: '#475569',
                                                                            borderRadius: '6px',
                                                                            textDecoration: 'none',
                                                                            fontWeight: 600,
                                                                            fontSize: '13px',
                                                                            border: '1px solid #e2e8f0'
                                                                        }}
                                                                    >
                                                                        View <Search size={14} />
                                                                    </Link>
                                                                    <Link
                                                                        href={`/invoices/new?edit=${inv.id}`}
                                                                        style={{
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '6px',
                                                                            padding: '6px 12px',
                                                                            backgroundColor: '#eff6ff',
                                                                            color: '#2563eb',
                                                                            borderRadius: '6px',
                                                                            textDecoration: 'none',
                                                                            fontWeight: 600,
                                                                            fontSize: '13px',
                                                                            border: '1px solid #dbeafe'
                                                                        }}
                                                                    >
                                                                        Edit <ExternalLink size={14} />
                                                                    </Link>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
        </div>
    );
}
