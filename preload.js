'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('prumo', {
  status: () => ipcRenderer.invoke('store:status'),
  load: () => ipcRenderer.invoke('store:load'),
  unlock: (password) => ipcRenderer.invoke('store:unlock', password),
  save: (data) => ipcRenderer.invoke('store:save', data),
  setPassword: (opts) => ipcRenderer.invoke('store:setPassword', opts),
  lock: () => ipcRenderer.invoke('store:lock'),
  exportBackup: () => ipcRenderer.invoke('store:export'),
  importBackup: () => ipcRenderer.invoke('store:import'),
  openFolder: () => ipcRenderer.invoke('store:openFolder'),
  backupInfo: () => ipcRenderer.invoke('backup:info'),
  backupNow: () => ipcRenderer.invoke('backup:now'),
  backupPick: () => ipcRenderer.invoke('backup:pick'),
  backupReset: () => ipcRenderer.invoke('backup:reset'),
  backupOpen: () => ipcRenderer.invoke('backup:open'),
  backupRestore: (name) => ipcRenderer.invoke('backup:restore', name),
  setTheme: (dark) => ipcRenderer.invoke('win:theme', dark),
  pickStatement: () => ipcRenderer.invoke('import:pick'),
  updateSecretary: (cfg) => ipcRenderer.invoke('secretary:update', cfg),
  testSecretary: () => ipcRenderer.invoke('secretary:test'),});
