'use client';

import { useEffect } from 'react';
import { exportInvoices } from '@/lib/invoice-storage';

export default function AutoBackup() {
    useEffect(() => {
        const runBackup = async () => {
            if (typeof window === 'undefined' || !(window as any).electron) return;

            const backupPath = localStorage.getItem('backup_path');
            const lastBackup = localStorage.getItem('last_backup_date');
            const today = new Date().toISOString().split('T')[0];

            if (!backupPath) return; // No backup path configured

            // Check if backup already ran today
            if (lastBackup === today) {
                console.log('AutoBackup: Already backed up today.');
                return;
            }

            console.log('AutoBackup: Starting daily backup...');

            try {
                const data = exportInvoices();
                const fileName = `Backup_${today}.json`;
                // We need to use path.join but we are in renderer in browser context usually.
                // Electron preload doesn't expose path.join safely usually, but we can just concat if we know OS.
                // Or simpler: let the main process handle path joining? 
                // My saveBackup takes full path. The user selected a folder.
                // Let's assume windows backslashes or just use slash, node handles it often.
                // Actually, safer to send folder and filename to main.
                // My `saveBackup` IPC takes `filePath` and `data`.
                // I should reconstruct the path. 
                // Windows path separator is `\`.
                const fullPath = `${backupPath}\\${fileName}`;

                const result = await (window as any).electron.saveBackup(fullPath, data);

                if (result.success) {
                    console.log('AutoBackup: Success!');
                    localStorage.setItem('last_backup_date', today);
                } else {
                    console.error('AutoBackup: Failed', result.error);
                }
            } catch (error) {
                console.error('AutoBackup: Error', error);
            }
        };

        // Run on mount (app start)
        // We delay slightly to let app load
        const timer = setTimeout(runBackup, 5000);
        return () => clearTimeout(timer);
    }, []);

    return null; // Logic only, no UI
}
