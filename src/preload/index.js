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
			onNew: callback => ipcRenderer.on( `new`, ( _event, value ) => callback( value ) ),
			onOpen: callback => ipcRenderer.on( `open`, ( _event, value ) => callback( value ) ),
			onSave: callback => ipcRenderer.on( `save`, ( _event, value ) => callback( value ) ),
			onClose: callback => ipcRenderer.on( `close`, ( _event, value ) => callback( value ) ),
			importMapData: callback => ipcRenderer.on( `importMapData`, ( _event, value ) => callback( value ) ),
			onImportTiles: callback => ipcRenderer.on( `importTiles`, callback ),
			save: value => ipcRenderer.send( `save`, value ),
			exportMap: value => ipcRenderer.send( `exportMap`, value ),
			importMap: value => ipcRenderer.send( `importMap`, value ),
			enableSave: value => ipcRenderer.send( `enable-save`, value ),
			openTileImportWindow: () => ipcRenderer.send( `open-tile-import-window` ),
			removeNewListener: listener => ipcRenderer.removeListener( `new`, listener ),
			removeOpenListener: listener => ipcRenderer.removeListener( `open`, listener ),
			removeSaveListener: listener => ipcRenderer.removeListener( `save`, listener ),
			removeCloseListener: listener => ipcRenderer.removeListener( `close`, listener ),
			removeImportMapDataListener: listener => ipcRenderer.removeListener( `importMapData`, listener ),
			removeImportTilesListeners: () => ipcRenderer.removeAllListeners( `importTiles` ),
		} );
	} catch ( error ) {
		console.error( error );
	}
} else {
	window.electron = electronAPI;
	window.api = api;
}
