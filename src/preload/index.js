import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// Custom APIs for renderer
const api = {};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if ( process.contextIsolated ) {
	try {
		contextBridge.exposeInMainWorld( `electron`, electronAPI );
		contextBridge.exposeInMainWorld( `api`, api );
		contextBridge.exposeInMainWorld( `electronAPI`, {
			on: ( channel, callback ) => ipcRenderer.on( channel, callback ),
			remove: channel => ipcRenderer.removeAllListeners( channel ),
			exportMap: value => ipcRenderer.send( `export-map`, value ),
			importMap: value => ipcRenderer.send( `import-map`, value ),
			enableSave: value => ipcRenderer.send( `enable-save`, value ),
			openTileImportWindow: () => ipcRenderer.send( `open-tile-import-window` ),
		} );
	} catch ( error ) {
		console.error( error );
	}
} else {
	window.electron = electronAPI;
	window.api = api;
}
