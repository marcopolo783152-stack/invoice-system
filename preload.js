/**
 * ELECTRON PRELOAD SCRIPT
 * 
 * Security layer between renderer and main process
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  version: process.versions.electron,
  // Backup API
  selectBackupFolder: () => ipcRenderer.invoke('select-backup-folder'),
  saveBackup: (filePath, data) => ipcRenderer.invoke('save-backup', filePath, data),
  importBackup: () => ipcRenderer.invoke('import-backup'),
});
