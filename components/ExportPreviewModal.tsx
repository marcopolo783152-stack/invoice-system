'use client';

import React, { useState, useEffect } from 'react';
import { X, FileDown, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';
import { exportInvoicesAsPDFs, ExportProgress } from '@/lib/bulk-export';

interface ExportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ExportPreviewModal({ isOpen, onClose }: ExportPreviewModalProps) {
    const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [progress, setProgress] = useState<ExportProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadInvoices();
            setProgress(null);
            setError(null);
            setExporting(false);
        }
    }, [isOpen]);

    const loadInvoices = async () => {
        setLoading(true);
        try {
            const data = await getAllInvoices();
            setInvoices(data);
        } catch (err) {
            setError('Failed to load invoices.');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (invoices.length === 0) return;
        setExporting(true);
        setError(null);
        try {
            await exportInvoicesAsPDFs(invoices, (p) => {
                setProgress(p);
            });
        } catch (err) {
            console.error(err);
            setError('Export failed. Please try again.');
        } finally {
            setExporting(false);
        }
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
                maxWidth: 500,
                borderRadius: 24,
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                animation: 'modalEnter 0.3s ease-out'
            }}>
                <div style={{ padding: '24px 32px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 18, color: '#1e293b' }}>Export Invoices</h3>
                    {!exporting && (
                        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                            <X size={20} color="#64748b" />
                        </button>
                    )}
                </div>

                <div style={{ padding: 32 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 20 }}>
                            <Loader2 size={32} className="spin" color="#6366f1" />
                            <p style={{ color: '#64748b', marginTop: 12 }}>Checking invoices...</p>
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', color: '#ef4444' }}>
                            <AlertCircle size={32} style={{ margin: '0 auto 12px' }} />
                            <p>{error}</p>
                        </div>
                    ) : progress && progress.percentage === 100 ? (
                        <div style={{ textAlign: 'center' }}>
                            <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
                            <h4 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#10b981' }}>Export Complete!</h4>
                            <p style={{ color: '#64748b', margin: 0 }}>Your ZIP file has been downloaded.</p>
                            <button
                                onClick={onClose}
                                style={{
                                    marginTop: 24,
                                    padding: '10px 24px',
                                    background: '#1e293b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    ) : exporting ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 500 }}>
                                <span>{progress?.status || 'Preparing...'}</span>
                                <span>{progress?.percentage || 0}%</span>
                            </div>
                            <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{
                                    width: `${progress?.percentage || 0}%`,
                                    height: '100%',
                                    background: '#6366f1',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            <p style={{ margin: '12px 0 0 0', fontSize: 13, color: '#64748b' }}>
                                Processing {progress?.current || 0} of {progress?.total || invoices.length}
                            </p>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: 64, height: 64, margin: '0 auto 20px',
                                background: '#eff6ff', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <FileDown size={32} color="#3b82f6" />
                            </div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#1e293b' }}>Ready to Export</h4>
                            <p style={{ margin: 0, color: '#64748b' }}>
                                Found <strong>{invoices.length}</strong> invoices to export.
                            </p>
                            <p style={{ margin: '4px 0 24px 0', fontSize: 13, color: '#94a3b8' }}>
                                Estimated time: {Math.ceil(invoices.length * 0.5)} seconds
                            </p>

                            <button
                                onClick={handleExport}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 12,
                                    fontWeight: 600,
                                    fontSize: 15,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)'
                                }}
                            >
                                Start Export
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <style jsx>{`
                @keyframes modalEnter {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
