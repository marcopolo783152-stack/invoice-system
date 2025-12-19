/**
 * ELECTRON PRELOAD SCRIPT
 * 
 * Security layer between renderer and main process
 */

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  version: process.versions.electron,
});
