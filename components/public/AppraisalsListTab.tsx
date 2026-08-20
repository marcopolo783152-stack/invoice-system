'use client';

import React, { useState, useEffect } from 'react';
import { getAppraisals, deleteAppraisal, Appraisal } from '@/lib/appraisals-storage';
import { Search, Plus, Trash2, Printer, Edit, Download } from 'lucide-react';
import { formatDateMMDDYYYY } from '@/lib/date-utils';
import AppraisalTemplate from '@/components/AppraisalTemplate';
import { getInvoicePDFBlob } from '@/lib/pdf-utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export function AppraisalsListTab({ onNew, onEdit }: { onNew: () => void, onEdit: (id: string) => void }) {
    const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isGeneratingZip, setIsGeneratingZip] = useState(false);

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
        window.open(`/admin/invoices/appraisals/print?id=${id}`, '_blank');
    };

    const filtered = appraisals.filter(app => 
        app.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.rugNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === appraisals.length) {
            setSelectedIds(new Set()); // Deselect all
        } else {
            setSelectedIds(new Set(appraisals.map(app => app.id))); // Select all
        }
    };

    const handleBulkInvoice = () => {
        const selectedAppraisals = appraisals.filter(app => selectedIds.has(app.id));
        if (selectedAppraisals.length === 0) return;

        const feeStr = prompt(`Enter the appraisal fee amount to charge PER APPRAISAL (e.g. 150):`, "150");
        if (feeStr === null) return;
        const fee = parseFloat(feeStr) || 0;

        const primaryCustomer = selectedAppraisals[0];

        const invoiceData = {
            documentType: 'APPRAISAL_RECEIPT',
            soldTo: {
                name: primaryCustomer.customerName,
                address: primaryCustomer.customerAddress,
                email: '',
                phone: ''
            },
            items: selectedAppraisals.map((appraisal, idx) => ({
                id: `item-${Date.now()}-${idx}`,
                sku: 'APPRAISAL',
                description: `Appraisal Services (Ref: ${appraisal.id}) - Rug #${appraisal.rugNumber}`,
                shape: 'rectangle',
                widthFeet: 0,
                widthInches: 0,
                lengthFeet: 0,
                lengthInches: 0,
                fixedPrice: fee,
                pricingMethod: 'piece'
            }))
        };
        sessionStorage.setItem('convert_invoice_data', JSON.stringify(invoiceData));
        window.location.href = '/admin/invoices/invoices/new';
    };

    const handleBulkDownload = async () => {
        setIsGeneratingZip(true);
        try {
            const zip = new JSZip();
            
            for (const id of Array.from(selectedIds)) {
                const element = document.getElementById(`hidden-appraisal-${id}`);
                const appraisal = appraisals.find(a => a.id === id);
                if (element && appraisal) {
                    const blob = await getInvoicePDFBlob(element, appraisal.id);
                    const safeId = appraisal.id.replace(/[^a-zA-Z0-9]/g, '');
                    const safeRugNum = (appraisal.rugNumber || 'Unknown').replace(/[^a-zA-Z0-9]/g, '');
                    zip.file(`Appraisal_${safeId}_${safeRugNum}.pdf`, blob);
                }
            }
            
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, 'Appraisals.zip');
        } catch (error) {
            console.error('Failed to generate PDF bundle', error);
            alert('Failed to generate PDF bundle');
        } finally {
            setIsGeneratingZip(false);
        }
    };
    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>Certificates of Authenticity</h2>
                </div>
                <button 
                    onClick={(e) => { e.preventDefault(); onNew(); }} 
                    style={{ 
                        background: 'linear-gradient(135deg, #4f46e5, #3b82f6)', color: 'white', 
                        padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', 
                        fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
                        boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)', border: 'none', cursor: 'pointer'
                    }}
                >
                    <Plus size={18} /> Create New Appraisal
                </button>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc' }}>
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
                                <th style={{ padding: '16px 20px', width: '40px' }}></th>
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
                                    <td style={{ padding: '16px 20px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.has(app.id)}
                                            onChange={(e) => toggleSelect(app.id, e as any)}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                    </td>
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
                                                    onEdit(app.id);
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

            {/* Hidden templates for PDF generation */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, pointerEvents: 'none', width: '800px' }}>
                {appraisals.filter(app => selectedIds.has(app.id)).map(app => (
                    <div key={app.id} id={`hidden-appraisal-${app.id}`} style={{ display: 'none' }}>
                        <div className="pdf-page" style={{ background: 'white', width: '100%', minHeight: '1100px' }}>
                            <AppraisalTemplate appraisal={app} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
