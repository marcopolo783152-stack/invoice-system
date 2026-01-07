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
