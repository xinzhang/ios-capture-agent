import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import os from 'os';
import { detectWindows, filterPhoneWindows } from './services/windowDetector.js';
import { startRecording, stopRecording, pauseRecording, resumeRecording } from './services/screenCapture.js';
import { processOCR } from './services/ocrProcessor.js';

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
  // Get available windows
  ipcMain.handle('get_windows', async () => {
    const allWindows = await detectWindows();
    const phoneWindows = filterPhoneWindows(allWindows);
    return phoneWindows;
  });

  // Start recording
  ipcMain.handle('start_recording', async (_event, windowId: number, bounds: any) => {
    console.log('Starting recording for window:', windowId, 'bounds:', bounds);
    try {
      await startRecording(windowId, bounds, mainWindow);
      return { success: true };
    } catch (error) {
      console.error('Failed to start recording:', error);
      return { success: false, error: String(error) };
    }
  });

  // Stop recording
  ipcMain.handle('stop_recording', async () => {
    console.log('Stopping recording');
    try {
      await stopRecording();
      return { success: true };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return { success: false, error: String(error) };
    }
  });

  // Pause recording
  ipcMain.handle('pause_recording', async () => {
    console.log('Pausing recording');
    try {
      pauseRecording();
      return { success: true };
    } catch (error) {
      console.error('Failed to pause recording:', error);
      return { success: false, error: String(error) };
    }
  });

  // Resume recording
  ipcMain.handle('resume_recording', async () => {
    console.log('Resuming recording');
    try {
      resumeRecording();
      return { success: true };
    } catch (error) {
      console.error('Failed to resume recording:', error);
      return { success: false, error: String(error) };
    }
  });

  // Process OCR
  ipcMain.handle('process_ocr', async (_event, imageData: string) => {
    try {
      const result = await processOCR(imageData);
      return result;
    } catch (error) {
      console.error('OCR processing failed:', error);
      return {
        rawText: '',
        textBlocks: [],
        confidence: 0,
        processingTime: 0,
        error: String(error),
      };
    }
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
