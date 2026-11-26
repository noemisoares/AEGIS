import { app, BrowserWindow, ipcMain, Notification, Menu } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 480,
    height: 720,
    resizable: true,
    minWidth: 420,
    minHeight: 640,
    frame: true,
    title: 'AEGIS Endpoint Security Agent',
    backgroundColor: '#020617',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const devUrl = 'http://localhost:5174';
  let retries = 0;
  const maxRetries = 10;

  const loadApp = () => {
    if (!mainWindow) return;
    if (isDev) {
      mainWindow.loadURL(devUrl).catch(() => {
        if (retries < maxRetries) {
          retries++;
          setTimeout(loadApp, 1000);
        } else if (mainWindow) {
          mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
        }
      });
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
    }
  };

  mainWindow.webContents.on('did-fail-load', () => {
    if (isDev && retries < maxRetries) {
      retries++;
      setTimeout(loadApp, 1000);
    }
  });

  loadApp();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('show-notification', (_event, title: string, body: string) => {
  if (Notification.isSupported()) {
    new Notification({
      title,
      body,
      silent: false,
    }).show();
  }
  return true;
});

ipcMain.handle('get-api-url', () => {
  return process.env.AEGIS_API_URL || process.env.VITE_API_URL || null;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
