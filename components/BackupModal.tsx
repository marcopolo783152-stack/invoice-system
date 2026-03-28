import React, { useState, useEffect } from 'react';
import styles from './BackupModal.module.css';
import { X, FolderOpen, Save, RefreshCw, AlertTriangle, Download, HardDrive, CheckCircle2 } from 'lucide-react';
import { exportToDirectory } from '@/lib/bulk-export';
import { getAllInvoices, getUnbackedData, confirmSmartBackupComplete, SavedInvoice } from '@/lib/invoice-storage';

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
    const [unbackedInvoices, setUnbackedInvoices] = useState<SavedInvoice[]>([]);
    const [unbackedAppraisals, setUnbackedAppraisals] = useState<any[]>([]);
    const [unbackedInventory, setUnbackedInventory] = useState<any[]>([]);
    const [unbackedCount, setUnbackedCount] = useState<number>(0);
    const [backupType, setBackupType] = useState<'incremental' | 'full'>('incremental');

    useEffect(() => {
        if (!isWeb) {
            const savedPath = localStorage.getItem('backup_path');
            if (savedPath) setBackupPath(savedPath);
            const last = localStorage.getItem('last_backup_date');
            if (last) setLastBackup(last);
        }

        // Check for unbacked changes
        const checkUnbacked = async () => {
            const unbackedData = await getUnbackedData();
            setUnbackedInvoices(unbackedData.invoices);
            setUnbackedAppraisals(unbackedData.appraisals);
            setUnbackedInventory(unbackedData.inventory);
            setUnbackedCount(unbackedData.totalCount);
            if (unbackedData.totalCount === 0) {
                setBackupType('full');
            } else {
                setBackupType('incremental');
            }
        };
        checkUnbacked();
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
            let invoicesToBackup: SavedInvoice[] = [];
            let appraisalsToBackup: any[] = [];
            let inventoryToBackup: any[] = [];

            if (backupType === 'full') {
                invoicesToBackup = await getAllInvoices();
                const { getAppraisals } = await import('@/lib/appraisals-storage');
                const { getInventoryItems } = await import('@/lib/inventory-storage');
                appraisalsToBackup = await getAppraisals();
                inventoryToBackup = await getInventoryItems();
            } else {
                invoicesToBackup = unbackedInvoices;
                appraisalsToBackup = unbackedAppraisals;
                inventoryToBackup = unbackedInventory;
            }

            if (invoicesToBackup.length === 0 && appraisalsToBackup.length === 0 && inventoryToBackup.length === 0 && backupType === 'full') {
                setStatus('error');
                setMessage('No data found to backup.');
                setLoading(false);
                return;
            }

            if (isWeb) {
                // Web Backup: Trigger Download
                await exportToDirectory(invoicesToBackup, appraisalsToBackup, inventoryToBackup, (p: any) => {
                    setMessage(p.status);
                });
                if (backupType === 'incremental') confirmSmartBackupComplete();
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

                await exportToDirectory(invoicesToBackup, appraisalsToBackup, inventoryToBackup, (p: any) => {
                    setMessage(p.status);
                });

                const now = new Date().toISOString();

                // If success, mark smart backup as complete
                if (backupType === 'incremental') confirmSmartBackupComplete();

                localStorage.setItem('last_backup_date', now);
                setLastBackup(now);
                setUnbackedInvoices([]);
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
                                    readOnly={true}
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

                    <div className={styles.section}>
                        <label className={styles.label}>Backup Type</label>
                        <div className={styles.backupOptions}>
                            <button
                                className={`${styles.optionCard} ${backupType === 'incremental' ? styles.activeOption : ''} ${unbackedCount === 0 ? styles.disabledOption : ''}`}
                                onClick={() => unbackedCount > 0 && setBackupType('incremental')}
                                disabled={unbackedCount === 0}
                            >
                                <div className={styles.optionHeader}>
                                    <RefreshCw size={18} />
                                    <span>Incremental</span>
                                </div>
                                <p className={styles.optionDesc}>Only new or changed data since last backup.</p>
                                {unbackedCount > 0 && (
                                    <div className={styles.badge}>{unbackedCount} pending</div>
                                )}
                            </button>

                            <button
                                className={`${styles.optionCard} ${backupType === 'full' ? styles.activeOption : ''}`}
                                onClick={() => setBackupType('full')}
                            >
                                <div className={styles.optionHeader}>
                                    <Save size={18} />
                                    <span>Full Backup</span>
                                </div>
                                <p className={styles.optionDesc}>Export all invoices currently in the system.</p>
                            </button>
                        </div>
                    </div>

                    <div className={styles.statusCard}>
                        {lastBackup ? (
                            <div className={styles.lastBackup}>
                                <CheckCircle2 size={16} color="#4caf50" />
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
                                {backupType === 'incremental' ? 'Sync Changes' : (isWeb ? 'Download Backup' : 'Start Full Backup')}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
