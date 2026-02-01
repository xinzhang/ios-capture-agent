import { BrowserWindow, ipcMain } from 'electron';

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Open a transparent window for region selection
 */
export async function selectRegion(): Promise<Region | null> {
  return new Promise((resolve) => {
    // Create a transparent fullscreen window
    const selectorWindow = new BrowserWindow({
      fullscreen: true,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      backgroundColor: '#00000000',
    });

    // Load the selector HTML
    selectorWindow.loadFile(
      __dirname.endsWith('/dist/main')
        ? './src/main/regionSelector/selector.html'
        : './dist/main/regionSelector/selector.html'
    );

    // Handle region selection
    ipcMain.once('region-selected', (_event, region: Region) => {
      selectorWindow.close();
      resolve(region);
    });

    // Handle cancellation
    ipcMain.once('region-cancelled', () => {
      selectorWindow.close();
      resolve(null);
    });

    // Handle window close (user pressed ESC)
    selectorWindow.on('closed', () => {
      resolve(null);
    });
  });
}
