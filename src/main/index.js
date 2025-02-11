import { app, dialog, shell, BrowserWindow, ipcMain, Menu } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import fs from 'fs';
import { PNG } from 'pngjs';

function createWindow() {
	let savePath = null;

	// Create the browser window.
	const mainWindow = new BrowserWindow( {
		width: 900,
		height: 670,
		show: false,
		...( process.platform === `linux` ? { icon } : {} ),
		webPreferences: {
			preload: join( __dirname, `../preload/index.js` ),
			sandbox: false,
		},
	} );

	const enableSave = () => {
		const save = menu.getMenuItemById( `save` );
		save.enabled = true;
	};

	const disableSave = () => {
		const save = menu.getMenuItemById( `save` );
		save.enabled = false;
	};

	const enableSaveAs = () => {
		const saveAs = menu.getMenuItemById( `save-as` );
		saveAs.enabled = true;
	};

	const disableSaveAs = () => {
		const saveAs = menu.getMenuItemById( `save-as` );
		saveAs.enabled = false;
	};

	const enableClose = () => {
		const close = menu.getMenuItemById( `close` );
		close.enabled = true;
	};

	const disableClose = () => {
		const close = menu.getMenuItemById( `close` );
		close.enabled = false;
	};

	const save = () => {
		mainWindow.webContents.send( `save`, true );
		disableSave();
	};

	const showSaveDialog = () => {
		dialog.showSaveDialog( null, {
			title: `Save`,
			filters: [
				{ name: `Boskeopolis Land Data`, extensions: [ `bsld` ] },
			],
		} ).then( result => {
			if ( !result.canceled ) {
				savePath = result.filePath;
				save();
			}
		} );
	};

	const exportMap = ( _event, map ) => {
		dialog.showSaveDialog( null, {
			title: `Export Map`,
			filters: [
				{ name: `Boskeopolis Land Map`, extensions: [ `blmap` ] },
			],
		} ).then( result => {
			fs.writeFile( result.filePath, Buffer.from( map ), err => {
				if ( err ) {
					console.error( err );
					return;
				}
			} );
		} );
	};

	const importMap = () => {
		dialog.showOpenDialog( null, {
			title: `Import Map`,
			filters: [
				{ name: `Boskeopolis Land Map`, extensions: [ `blmap` ] },
			],
		} ).then( result => {
			if ( !result.canceled ) {
				fs.readFile( result.filePaths[ 0 ], ( err, data ) => {
					if ( err ) {
						console.error( err );
						return;
					}
					mainWindow.webContents.send( `import-map__level-editor`, data );
				} );
			}
		} );
	};

	const openTileImportWindow = () => {
		dialog.showOpenDialog( null, {
			title: `Import Tiles`,
			filters: [
				{ name: `PNG`, extensions: [ `png` ] },
			],
		} ).then( result => {
			if ( !result.canceled ) {
				fs.createReadStream( result.filePaths[ 0 ] )
					.pipe( new PNG( {
						filterType: 4,
					} ) )
					.on( `parsed`, function () {
						const pixels = [];
						for ( let y = 0; y < this.height; y++ ) {
							for ( let x = 0; x < this.width; x++ ) {
								const idx = ( this.width * y + x ) << 2;
								const alpha = this.data[ idx + 3 ];

								const averageColor = ( (
									this.data[ idx ] +
									this.data[ idx + 1 ] +
									this.data[ idx + 2 ]
								) / 3 );

								// If the alpha is lower than 128, treat as transparent 0.
								const index = alpha >= 128
									? Math.round( averageColor / 42 ) + 1
									: 0;
								pixels.push( index );
							}
						}
						mainWindow.webContents.send(
							`import-tiles__graphics-mode`,
							{
								pixels,
								width: this.width,
								height: this.height,
							},
						);
					} );
			}
		} );
	};

	const menu = Menu.buildFromTemplate( [
		{
			label: `File`,
			submenu: [
				{
					label: `New`,
					click() {
						mainWindow.webContents.send( `new__editor`, true );
						mainWindow.webContents.send( `new__level-editor`, true );
						mainWindow.webContents.send( `new__level-mode`, true );
						savePath = null;
						enableSave();
						enableSaveAs();
						enableClose();
					},
				},
				{
					label: `Open`,
					click() {
						dialog.showOpenDialog( null, {
							title: `Open`,
							filters: [
								{ name: `Boskeopolis Land Data`, extensions: [ `bsld` ] },
							],
						} ).then( result => {
							if ( !result.canceled ) {
								fs.readFile( result.filePaths[ 0 ], ( err, data ) => {
									if ( err ) {
										console.error( err );
										return;
									}
									savePath = result.filePaths[ 0 ];
									mainWindow.webContents.send( `open__editor`, data );
									mainWindow.webContents.send( `open__level-editor`, data );
									mainWindow.webContents.send( `open__level-mode`, data );
									enableClose();
									enableSaveAs();
								} );
							}
						} );
					},
				},
				{
					label: `Save`,
					id: `save`,
					enabled: false,
					click() {
						if ( savePath === null ) {
							showSaveDialog();
						} else {
							save();
						}
					},
				},
				{
					label: `Save As…`,
					id: `save-as`,
					enabled: false,
					click() {
						showSaveDialog();
					},
				},
				{
					label: `Close`,
					id: `close`,
					enabled: false,
					click() {
						mainWindow.webContents.send( `close__editor`, true );
						mainWindow.webContents.send( `close__level-editor`, true );
						mainWindow.webContents.send( `close__level-mode`, true );
						disableSave();
						disableSaveAs();
						disableClose();
						savePath = null;
					},
				},
			],
		},
		{
			label: `Dev`,
			submenu: [
				{
					label: `DevTools`,
					click() {
						mainWindow.webContents.openDevTools();
					},
				},
			],
		},
	] );
	Menu.setApplicationMenu( menu );

	ipcMain.on( `save`, ( event, data ) => {
		fs.writeFile( savePath, data, err => {
			if ( err ) {
				console.error( err );
				return;
			}
		} );
	} );

	ipcMain.on( `enable-save`, enableSave );

	ipcMain.on( `export-map`, exportMap );
	ipcMain.on( `import-map`, importMap );

	ipcMain.on( `open-tile-import-window`, openTileImportWindow );

	mainWindow.on( `ready-to-show`, () => {
		mainWindow.show();
	} );

	mainWindow.webContents.setWindowOpenHandler( details => {
		shell.openExternal( details.url );
		return { action: `deny` };
	} );

	// HMR for renderer base on electron-vite cli.
	// Load the remote URL for development or the local html file for production.
	if ( is.dev && process.env[ `ELECTRON_RENDERER_URL` ] ) {
		mainWindow.loadURL( process.env[ `ELECTRON_RENDERER_URL` ] );
	} else {
		mainWindow.loadFile( join( __dirname, `../renderer/index.html` ) );
	}
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then( () => {
	// Set app user model id for windows
	electronApp.setAppUserModelId( `com.electron` );

	// Default open or close DevTools by F12 in development
	// and ignore CommandOrControl + R in production.
	// see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
	app.on( `browser-window-created`, ( _, window ) => {
		optimizer.watchWindowShortcuts( window );
	} );

	// IPC test
	ipcMain.on( `ping`, () => console.log( `pong` ) );

	createWindow();

	app.on( `activate`, function () {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if ( BrowserWindow.getAllWindows().length === 0 ) {
			createWindow();
		}
	} );
} );

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on( `window-all-closed`, () => {
	if ( process.platform !== `darwin` ) {
		app.quit();
	}
} );

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
