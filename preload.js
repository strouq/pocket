const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  beginDrag: () => ipcRenderer.send('begin-drag'),
  endDrag: (w, h) => ipcRenderer.send('end-drag', { w, h }),
  fold: () => ipcRenderer.send('fold'),
  cornerHover: () => ipcRenderer.send('corner-hover'),
  quit: () => ipcRenderer.send('quit'),
  load: () => ipcRenderer.invoke('load'),
  save: (doc) => ipcRenderer.send('save', doc),
  saveImage: (dataUrl) => ipcRenderer.invoke('save-image', dataUrl),
  exportPng: (rect, name, title) => ipcRenderer.invoke('export-png', rect, name, title),
  setMargin: (m) => ipcRenderer.send('set-margin', m),
  onState: (cb) => ipcRenderer.on('state', (_e, s) => cb(s)),
});
