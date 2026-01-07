/**
 * ELECTRON PRELOAD SCRIPT
 * 
 * Security layer between renderer and main process
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  version: process.versions.electron,
});
