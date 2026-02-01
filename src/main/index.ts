import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import os from 'os';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false, // For local development
    },
    backgroundColor: '#111827',
    titleBarStyle: 'default',
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    console.log('Loading development app from http://localhost:5173');

    // Log page loading events
    mainWindow.webContents.on('did-start-loading', () => {
      console.log('Page started loading');
    });

    mainWindow.webContents.on('did-finish-load', () => {
      console.log('Page finished loading');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Page failed to load:', errorCode, errorDescription);
    });

    mainWindow.webContents.on('did-navigate', (event, url) => {
      console.log('Navigated to:', url);
    });

    mainWindow.webContents.on('dom-ready', () => {
      console.log('DOM is ready!');
      if (mainWindow) {
        mainWindow.webContents.openDevTools();
      }
    });

    mainWindow.loadURL('http://localhost:5173')
      .then(() => {
        console.log('Load URL initiated successfully');
      })
      .catch((err) => {
        console.error('Failed to initiate page load:', err);
      });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  // Register IPC handlers
  registerIPCHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
function registerIPCHandlers() {
  // Get available windows (placeholder for Phase 2)
  ipcMain.handle('get_windows', async () => {
    // Phase 1: Return empty array
    // Phase 2: Implement actual window detection
    return [];
  });

  // Start recording (placeholder for Phase 2)
  ipcMain.handle('start_recording', async (_event, windowId: number) => {
    console.log('Starting recording for window:', windowId);
    return { success: true };
  });

  // Stop recording (placeholder for Phase 2)
  ipcMain.handle('stop_recording', async () => {
    console.log('Stopping recording');
    return { success: true };
  });

  // Process OCR (placeholder for Phase 2)
  ipcMain.handle('process_ocr', async (_event, imageData: string) => {
    // Phase 1: Return mock data
    // Phase 2: Implement Tesseract.js OCR
    return {
      rawText: 'OCR will be implemented in Phase 2',
      textBlocks: [],
      confidence: 0,
      processingTime: 0,
    };
  });

  // Get app version
  ipcMain.handle('get_app_info', async () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron,
    };
  });
}
