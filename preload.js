const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  beginDrag: () => ipcRenderer.send('begin-drag'),
  endDrag: (w, h) => ipcRenderer.send('end-drag', { w, h }),
  fold: () => ipcRenderer.send('fold'),
  quit: () => ipcRenderer.send('quit'),
  load: () => ipcRenderer.invoke('load'),
  save: (doc) => ipcRenderer.send('save', doc),
  saveImage: (dataUrl) => ipcRenderer.invoke('save-image', dataUrl),
  exportPng: (rect, name, title) => ipcRenderer.invoke('export-png', rect, name, title),
  onState: (cb) => ipcRenderer.on('state', (_e, s) => cb(s)),
});
