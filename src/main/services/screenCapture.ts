import screenshot from 'screenshot-desktop';
import sharp from 'sharp';
import { BrowserWindow } from 'electron';
import { detectChange } from './changeDetection.js';
import { processOCR } from './ocrProcessor.js';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CaptureState {
  isRecording: boolean;
  isPaused: boolean;
  windowId: number | null;
  bounds: Bounds | null;
  intervalId: NodeJS.Timeout | null;
  lastImageBuffer: Buffer | null;
  captureCount: number;
}

const state: CaptureState = {
  isRecording: false,
  isPaused: false,
  windowId: null,
  bounds: null,
  intervalId: null,
  lastImageBuffer: null,
  captureCount: 0,
};

const CAPTURE_INTERVAL_MS = 2000; // Capture every 2 seconds
const CHANGE_THRESHOLD = 0.05; // 5% pixel difference threshold

/**
 * Start recording a window
 */
export async function startRecording(
  windowId: number,
  bounds: Bounds,
  mainWindow: BrowserWindow | null
): Promise<void> {
  if (state.isRecording) {
    throw new Error('Recording is already in progress');
  }

  console.log('Starting screen capture for window:', windowId);

  state.isRecording = true;
  state.isPaused = false;
  state.windowId = windowId;
  state.bounds = bounds;
  state.lastImageBuffer = null;
  state.captureCount = 0;

  // Send initial state update
  sendStateUpdate(mainWindow, 'recording');

  // Start capture loop
  state.intervalId = setInterval(() => {
    if (!state.isPaused && state.bounds) {
      captureAndProcess(mainWindow);
    }
  }, CAPTURE_INTERVAL_MS);

  // Initial capture
  await captureAndProcess(mainWindow);
}

/**
 * Stop recording
 */
export async function stopRecording(): Promise<void> {
  if (!state.isRecording) {
    throw new Error('No recording is in progress');
  }

  console.log('Stopping screen capture');

  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }

  state.isRecording = false;
  state.isPaused = false;
  state.windowId = null;
  state.bounds = null;
  state.lastImageBuffer = null;
}

/**
 * Pause recording
 */
export function pauseRecording(): void {
  if (!state.isRecording) {
    throw new Error('No recording is in progress');
  }

  console.log('Pausing screen capture');
  state.isPaused = true;
  sendStateUpdate(null, 'paused');
}

/**
 * Resume recording
 */
export function resumeRecording(): void {
  if (!state.isRecording) {
    throw new Error('No recording is in progress');
  }

  console.log('Resuming screen capture');
  state.isPaused = false;
  sendStateUpdate(null, 'recording');
}

/**
 * Capture screen and process for changes
 */
async function captureAndProcess(mainWindow: BrowserWindow | null): Promise<void> {
  if (!state.bounds) {
    return;
  }

  try {
    console.log('Capturing screen...');

    // Capture the specific region
    const img = await screenshot({
      screen: getScreenNumber(state.bounds),
      format: 'png',
    });

    // Load image with sharp
    const image = sharp(img);

    // Extract the window region
    const { x, y, width, height } = state.bounds;
    const croppedImage = image.extract({
      left: x,
      top: y,
      width: width,
      height: height,
    });

    // Get buffer for comparison
    const currentBuffer = await croppedImage.png().toBuffer();

    // Check for changes
    const hasChanged = await detectChange(state.lastImageBuffer, currentBuffer, CHANGE_THRESHOLD);

    if (hasChanged || state.captureCount === 0) {
      console.log('✅ Change detected! Processing capture #' + (state.captureCount + 1));

      // Update last image buffer
      state.lastImageBuffer = currentBuffer;
      state.captureCount++;

      // Convert to base64 for sending to renderer
      const base64Image = `data:image/png;base64,${currentBuffer.toString('base64')}`;

      // Process OCR
      const ocrResult = await processOCR(base64Image);

      // Send capture update to renderer
      sendCaptureUpdate(mainWindow, {
        id: Date.now(),
        windowId: state.windowId || 0,
        timestamp: new Date().toISOString(),
        screenshot: base64Image,
        ocrResult: ocrResult,
      });
    } else {
      console.log('⏭️  No significant change detected, skipping capture');
    }
  } catch (error) {
    console.error('Error during screen capture:', error);
  }
}

/**
 * Determine screen number from bounds
 */
function getScreenNumber(bounds: Bounds): number | undefined {
  // For simplicity, capture the primary screen (undefined)
  // In production, you'd determine which display the window is on
  return undefined;
}

/**
 * Send capture update to renderer
 */
function sendCaptureUpdate(
  mainWindow: BrowserWindow | null,
  capture: any
): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('capture-update', capture);
}

/**
 * Send state update to renderer
 */
function sendStateUpdate(
  mainWindow: BrowserWindow | null,
  recordingState: 'idle' | 'recording' | 'paused'
): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('recording-state-changed', {
    state: recordingState,
    captureCount: state.captureCount,
  });
}

/**
 * Get current state (for debugging)
 */
export function getState(): CaptureState {
  return { ...state };
}
