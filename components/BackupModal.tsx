'use client';

import React, { useState, useEffect } from 'react';
import styles from './BackupModal.module.css';
import { Folder, Save, CheckCircle, AlertCircle, X } from 'lucide-react';

interface BackupModalProps {
    onClose: () => void;
}

export default function BackupModal({ onClose }: BackupModalProps) {
    const [backupPath, setBackupPath] = useState('');
    const [lastBackup, setLastBackup] = useState('');
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const savedPath = localStorage.getItem('backup_path');
        const savedDate = localStorage.getItem('last_backup_date');
        if (savedPath) setBackupPath(savedPath);
        if (savedDate) setLastBackup(savedDate);
    }, []);

    const handleSelectFolder = async () => {
        // Web Environment Fallback
        if (typeof window !== 'undefined' && !(window as any).electron) {
            // Web Download Mode
            const data = (window as any).getAllInvoicesBackup ? (window as any).getAllInvoicesBackup() : '[]'; // Basic stub, actual logic needs import
            // Better: Just tell user to use the "Download JSON" button which we will add
            setMessage('Web Mode: Use "Download Backup" below.');
            setStatus('idle');
            return;
        }

        if (!(window as any).electron) {
            setMessage('Backup is only available in the Desktop App.');
            setStatus('error');
            return;
        }

        try {
            const path = await (window as any).electron.selectBackupFolder();
            if (path) {
                setBackupPath(path);
                localStorage.setItem('backup_path', path);
                setStatus('success');
                setMessage('Backup folder updated!');
                setTimeout(() => setStatus('idle'), 3000);
            }
        } catch (error) {
            console.error(error);
            setStatus('error');
            setMessage('Failed to select folder.');
        }
    };

    const handleWebBackup = async () => {
        // Import dynamically or assume logic exists
        const { exportInvoices } = await import('@/lib/invoice-storage');
        const data = exportInvoices();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        localStorage.setItem('last_backup_date', new Date().toISOString().split('T')[0]);
        setLastBackup(new Date().toISOString().split('T')[0]);
        setStatus('success');
        setMessage('Backup downloaded successfully!');
    };

    const handleManualBackup = () => {
        // Clear last backup date to force AutoBackup to run on next reload?
        // Or just trigger it manually?
        // For now, let's just instruct user.
        // But actually, we can reset the date to verify logic.
        localStorage.removeItem('last_backup_date');
        setMessage('Backup trigger reset. PLEASE RELOAD APP to force backup now.');
        setStatus('success');
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ maxWidth: '500px' }}>
                <div className={styles.modalHeader}>
                    <h2>Automated Backup Settings</h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                            Backup Location
                        </label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <input
                                type="text"
                                value={backupPath}
                                readOnly
                                placeholder="No folder selected"
                                style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                            />
                            <button
                                onClick={handleSelectFolder}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: '#2563eb', color: 'white', border: 'none',
                                    padding: '8px 12px', borderRadius: 4, cursor: 'pointer'
                                }}
                            >
                                <Folder size={16} /> Select
                            </button>
                        </div>

                        {/* Web Fallback Button */}
                        {typeof window !== 'undefined' && !(window as any).electron && (
                            <div style={{ marginTop: 10 }}>
                                <button
                                    onClick={handleWebBackup}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        background: '#0f172a', color: 'white', border: 'none',
                                        padding: '10px', borderRadius: 6, cursor: 'pointer', fontSize: 13
                                    }}
                                >
                                    <Save size={16} /> Download Backup Manually (Web)
                                </button>
                            </div>
                        )}

                        <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                            Invoices will be automatically saved here as JSON files daily.
                        </p>
                    </div>

                    <div style={{ marginBottom: 20, padding: 15, background: '#f8fafc', borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: '#64748b' }}>Last Successful Backup:</span>
                            <span style={{ fontWeight: 600 }}>{lastBackup || 'Never'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Status:</span>
                            <span style={{
                                color: backupPath ? '#059669' : '#dc2626',
                                display: 'flex', alignItems: 'center', gap: 4
                            }}>
                                {backupPath ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                {backupPath ? 'Active' : 'Not Configured'}
                            </span>
                        </div>
                    </div>

                    {status !== 'idle' && (
                        <div style={{
                            padding: 10, borderRadius: 6, marginBottom: 15, fontSize: 14,
                            background: status === 'success' ? '#dcfce7' : '#fee2e2',
                            color: status === 'success' ? '#166534' : '#991b1b'
                        }}>
                            {message}
                        </div>
                    )}

                    <button
                        onClick={handleManualBackup}
                        style={{
                            background: 'transparent', border: '1px solid #ccc', padding: '5px 10px',
                            fontSize: 12, cursor: 'pointer', borderRadius: 4, width: '100%'
                        }}
                    >
                        Reset "Last Backup" Timer (Force Backup on Reload)
                    </button>
                </div>

                <div className={styles.modalFooter}>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#0f172a', color: 'white', border: 'none',
                            padding: '10px 20px', borderRadius: 6, cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
