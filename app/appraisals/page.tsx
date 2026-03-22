'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAppraisals, deleteAppraisal, Appraisal } from '@/lib/appraisals-storage';
import { Search, Plus, Trash2, Printer, ArrowLeft, Edit } from 'lucide-react';
import { formatDateMMDDYYYY } from '@/lib/date-utils';

export default function AppraisalsPage() {
    const router = useRouter();
    const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        const data = await getAppraisals();
        setAppraisals(data);
        setLoading(false);
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this Appraisal?')) {
            await deleteAppraisal(id);
            await loadData();
        }
    };

    const handlePrint = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        window.open(`/appraisals/print?id=${id}`, '_blank');
    };

    const filtered = appraisals.filter(app => 
        app.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.rugNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <Link href="/" style={{ color: '#6366f1', fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Certificates & Appraisals</h1>
                </div>
                <Link 
                    href="/appraisals/new" 
                    style={{ 
                        background: 'linear-gradient(135deg, #4f46e5, #3b82f6)', color: 'white', 
                        padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', 
                        textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px',
                        boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                    }}
                >
                    <Plus size={20} /> New Appraisal
                </Link>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', background: '#f8fafc' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search by customer, id, or rug number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', 
                                border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' 
                            }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading Appraisals...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📜</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>No Appraisals Found</h3>
                        <p>Create your first certificate of authenticity to see it here.</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f1f5f9', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                            <tr>
                                <th style={{ padding: '16px 20px', fontWeight: 'bold' }}>Date</th>
                                <th style={{ padding: '16px 20px', fontWeight: 'bold' }}>Appraisal ID</th>
                                <th style={{ padding: '16px 20px', fontWeight: 'bold' }}>Customer</th>
                                <th style={{ padding: '16px 20px', fontWeight: 'bold' }}>Rug Details</th>
                                <th style={{ padding: '16px 20px', fontWeight: 'bold' }}>Value</th>
                                <th style={{ padding: '16px 20px', fontWeight: 'bold', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(app => (
                                <tr 
                                    key={app.id} 
                                    onClick={() => handlePrint(app.id, { stopPropagation: () => {} } as React.MouseEvent)}
                                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background 0.2s' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    <td style={{ padding: '16px 20px', fontSize: '14px', color: '#475569' }}>
                                        {formatDateMMDDYYYY(app.date)}
                                    </td>
                                    <td style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 'bold', color: '#3b82f6' }}>
                                        {app.id}
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '15px' }}>{app.customerName}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>#{app.rugNumber}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{app.type} ({app.size})</div>
                                    </td>
                                    <td style={{ padding: '16px 20px', fontWeight: 'bold', color: '#10b981' }}>
                                        ${app.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/appraisals/new?edit=${app.id}`);
                                                }}
                                                style={{ border: 'none', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={(e) => handlePrint(app.id, e)}
                                                style={{ border: 'none', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                                title="Print Certificate"
                                            >
                                                <Printer size={16} />
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(app.id, e)}
                                                style={{ border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
