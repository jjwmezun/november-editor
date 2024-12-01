import { app, dialog, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs';

function createWindow() {
  let savePath = null;

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  const enableSave = () => {
    const save = menu.getMenuItemById('save');
    save.enabled = true;
  };

  const disableSave = () => {
    const save = menu.getMenuItemById('save');
    save.enabled = false;
  };

  const enableSaveAs = () => {
    const saveAs = menu.getMenuItemById('save-as');
    saveAs.enabled = true;
  };

  const disableSaveAs = () => {
    const saveAs = menu.getMenuItemById('save-as');
    saveAs.enabled = false;
  };

  const enableClose = () => {
    const close = menu.getMenuItemById('close');
    close.enabled = true;
  };

  const disableClose = () => {
    const close = menu.getMenuItemById('close');
    close.enabled = false;
  };

  const save = () => {
    mainWindow.webContents.send('save', true);
    disableSave();
  };

  const showSaveDialog = () => {
    dialog.showSaveDialog(null, {
      title: 'Save',
      filters: [
        { name: 'Boskeopolis Land Data', extensions: ['bsld'] },
      ],
    }).then((result) => {
      if (!result.canceled) {
        savePath = result.filePath;
        save();
      }
    });
  };

  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          click() {
            mainWindow.webContents.send('new', true);
            savePath = null;
            enableSave();
            enableSaveAs();
            enableClose();
          }
        },
        {
          label: 'Open',
          click() {
            dialog.showOpenDialog(null, {
              title: 'Open',
              filters: [
                { name: 'Boskeopolis Land Data', extensions: ['bsld'] },
              ]
            }).then((result) => {
              if (!result.canceled) {
                fs.readFile(result.filePaths[0], (err, data) => {
                  if (err) {
                    console.error(err);
                    return;
                  }
                  savePath = result.filePaths[0];
                  mainWindow.webContents.send('open', data);
                  enableClose();
                  enableSaveAs();
                });
              }
            });
          }
        },
        {
          label: 'Save',
          id: 'save',
          enabled: false,
          click() {
            if ( savePath === null ) {
              showSaveDialog();
            } else {
              save();
            }
          }
        },
        {
          label: 'Save As…',
          id: 'save-as',
          enabled: false,
          click() {
            showSaveDialog();
          }
        },
        {
          label: 'Close',
          id: 'close',
          enabled: false,
          click() {
            mainWindow.webContents.send('close', true);
            disableSave();
            disableSaveAs();
            disableClose();
            savePath = null;
          }
        },
      ]
    },
    {
      label: 'Dev',
      submenu: [
        {
          label: 'DevTools',
          click() {
            mainWindow.webContents.openDevTools()
          }
        }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);

  ipcMain.on('save', (event, data) => {
    fs.writeFile(savePath, data, (err) => {
      if (err) {
        console.error( err );
        return;
      }
    });
  });

  ipcMain.on('enable-save', enableSave);

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
