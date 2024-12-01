import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('electronAPI', {
      onNew: (callback) => ipcRenderer.on('new', (_event, value) => callback(value)),
      onOpen: (callback) => ipcRenderer.on('open', (_event, value) => callback(value)),
      onSave: (callback) => ipcRenderer.on('save', (_event, value) => callback(value)),
      onClose: (callback) => ipcRenderer.on('close', (_event, value) => callback(value)),
      save: (value) => ipcRenderer.send('save', value),
      enableSave: (value) => ipcRenderer.send('enable-save', value),
      removeNewListener: () => ipcRenderer.removeAllListeners('new'),
      removeOpenListener: () => ipcRenderer.removeAllListeners('open'),
      removeSaveListener: () => ipcRenderer.removeAllListeners('save'),
      removeCloseListener: () => ipcRenderer.removeAllListeners('close'),
    })
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
