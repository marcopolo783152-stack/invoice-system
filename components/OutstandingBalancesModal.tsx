'use client';

import React, { useState } from 'react';
import { X, ExternalLink, ChevronDown, ChevronUp, User } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import Link from 'next/link';
import styles from './Modal.module.css'; // Assuming a generic modal module exists or use inline

export default function OutstandingBalancesModal({
    isOpen,
    onClose,
    balances
}: {
    isOpen: boolean;
    onClose: () => void;
    balances: {
        name: string;
        balance: number;
        phone: string;
        invoices: { id: string; invoiceNumber: string; balanceDue: number; date: string }[]
    }[]
}) {
    const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>Outstanding Balances</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                            {balances.length} customers with unpaid invoices
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px',
                            borderRadius: '50%',
                            border: 'none',
                            backgroundColor: '#f1f5f9',
                            cursor: 'pointer',
                            color: '#64748b',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {balances.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 0',
                            color: '#64748b'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                            <p style={{ margin: 0, fontWeight: 500 }}>No outstanding balances found!</p>
                        </div>
                    ) : (
                        balances.map((item, idx) => (
                            <div key={idx} style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                overflow: 'hidden'
                            }}>
                                <div
                                    onClick={() => setExpandedCustomer(expandedCustomer === item.name ? null : item.name)}
                                    style={{
                                        padding: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        cursor: 'pointer',
                                        backgroundColor: expandedCustomer === item.name ? '#f8fafc' : 'white',
                                        transition: 'background-color 0.2s'
                                    }}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        backgroundColor: '#e0f2fe',
                                        color: '#0284c7',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}>
                                        <User size={20} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '15px', color: '#1e293b' }}>{item.name}</div>
                                        <div style={{ fontSize: '13px', color: '#64748b' }}>{item.phone}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, fontSize: '16px', color: '#dc2626' }}>{formatCurrency(item.balance)}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{item.invoices.length} invoices</div>
                                    </div>
                                    <div style={{ color: '#94a3b8' }}>
                                        {expandedCustomer === item.name ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {expandedCustomer === item.name && (
                                    <div style={{
                                        padding: '12px 16px',
                                        backgroundColor: '#f8fafc',
                                        borderTop: '1px solid #e2e8f0'
                                    }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <thead>
                                                <tr style={{ color: '#64748b', textAlign: 'left' }}>
                                                    <th style={{ padding: '8px 0', fontWeight: 500 }}>Invoice #</th>
                                                    <th style={{ padding: '8px 0', fontWeight: 500 }}>Date</th>
                                                    <th style={{ padding: '8px 0', fontWeight: 500, textAlign: 'right' }}>Balance</th>
                                                    <th style={{ padding: '8px 0' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {item.invoices.map((inv) => (
                                                    <tr key={inv.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '10px 0', color: '#0284c7', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                                                        <td style={{ padding: '10px 0', color: '#1e293b' }}>{inv.date}</td>
                                                        <td style={{ padding: '10px 0', color: '#dc2626', fontWeight: 600, textAlign: 'right' }}>{formatCurrency(inv.balanceDue)}</td>
                                                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                                                            <Link
                                                                href={`/invoices/new?edit=${inv.id}`}
                                                                onClick={onClose}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    color: '#6366f1',
                                                                    textDecoration: 'none',
                                                                    fontWeight: 500,
                                                                    fontSize: '12px'
                                                                }}
                                                            >
                                                                Edit <ExternalLink size={12} />
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    backgroundColor: '#f8fafc',
                    borderBottomLeftRadius: '12px',
                    borderBottomRightRadius: '12px'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 24px',
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#1e293b',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
