
import React, { useState, useEffect } from 'react';
import styles from './BackupModal.module.css';
import { X, FolderOpen, Save, RefreshCw, AlertTriangle, Download, HardDrive } from 'lucide-react';
import { exportToDirectory } from '@/lib/bulk-export';
import { getAllInvoices } from '@/lib/invoice-storage';

interface BackupModalProps {
    onClose: () => void;
    isWeb?: boolean;
}

export function BackupModal({ onClose, isWeb = false }: BackupModalProps) {
    const [backupPath, setBackupPath] = useState('');
    const [lastBackup, setLastBackup] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isWeb) {
            const savedPath = localStorage.getItem('backup_path');
            if (savedPath) setBackupPath(savedPath);
            const last = localStorage.getItem('last_backup_date');
            if (last) setLastBackup(last);
        }
    }, [isWeb]);

    const handleSelectFolder = async () => {
        if (isWeb) return;
        if (typeof window === 'undefined' || !(window as any).electron) return;

        const path = await (window as any).electron.selectBackupFolder();
        if (path) {
            setBackupPath(path);
            localStorage.setItem('backup_path', path);
        }
    };

    const handleBackup = async () => {
        setLoading(true);
        setStatus('idle');
        setMessage('');

        try {
            const invoices = await getAllInvoices();

            if (isWeb) {
                // Web Backup: Trigger Download
                await exportToDirectory(invoices, (p) => {
                    setMessage(p.status);
                });
                setStatus('success');
                setMessage('Backup downloaded successfully!');
            } else {
                // Desktop Backup
                if (!backupPath) {
                    setStatus('error');
                    setMessage('Please select a backup folder first.');
                    setLoading(false);
                    return;
                }

                // Use the smart backup logic or simple file dump?
                // The Sidebar backup button traditionally did the FULL export (PDFs/Zip)
                // So we should stick to that for "Manual Backup"

                await exportToDirectory(invoices, (p) => {
                    setMessage(p.status);
                });

                const now = new Date().toISOString();
                localStorage.setItem('last_backup_date', now);
                setLastBackup(now);
                setStatus('success');
                setMessage('Backup completed successfully!');
            }

        } catch (error: any) {
            console.error(error);
            setStatus('error');
            setMessage(error.message || 'Backup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className={styles.iconWrapper}>
                            <HardDrive size={24} color="#fff" />
                        </div>
                        <div>
                            <h2 className={styles.title}>System Backup</h2>
                            <p className={styles.subtitle}>{isWeb ? 'Download offline backup' : 'Configure local backup'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
                </div>

                <div className={styles.body}>
                    {!isWeb && (
                        <div className={styles.section}>
                            <label className={styles.label}>Backup Location</label>
                            <div className={styles.inputGroup}>
                                <input
                                    type="text"
                                    value={backupPath}
                                    readOnly={true} // Use readOnly to prevent typing, forcing directory selection
                                    placeholder="No folder selected..."
                                    className={styles.input}
                                />
                                <button onClick={handleSelectFolder} className={styles.actionBtn}>
                                    <FolderOpen size={18} />
                                    Browse
                                </button>
                            </div>
                            <p className={styles.hint}>
                                <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />
                                Select a secure location (e.g., Z: Drive or External HDD)
                            </p>
                        </div>
                    )}

                    <div className={styles.statusCard}>
                        {lastBackup ? (
                            <div className={styles.lastBackup}>
                                <span className={styles.statusLabel}>Last Successful Backup:</span>
                                <span className={styles.statusValue}>{new Date(lastBackup).toLocaleString()}</span>
                            </div>
                        ) : (
                            <div className={styles.noBackup}>
                                <AlertTriangle size={32} />
                                <span>No backup recorded yet</span>
                            </div>
                        )}
                    </div>

                    {message && (
                        <div className={`${styles.message} ${status === 'success' ? styles.success : styles.error}`}>
                            {status === 'success' ? <RefreshCw size={16} /> : <AlertTriangle size={16} />}
                            {message}
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.cancelBtn}>Close</button>
                    <button
                        onClick={handleBackup}
                        disabled={loading || (!isWeb && !backupPath)}
                        className={styles.primaryBtn}
                    >
                        {loading ? (
                            <>
                                <RefreshCw size={18} className={styles.spin} />
                                Backing up...
                            </>
                        ) : (
                            <>
                                {isWeb ? <Download size={18} /> : <Save size={18} />}
                                {isWeb ? 'Download Backup' : 'Start Backup'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
