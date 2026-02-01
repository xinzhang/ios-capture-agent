import screenshot from 'screenshot-desktop';
import sharp from 'sharp';
import { BrowserWindow } from 'electron';
import { detectChange } from './changeDetection.js';
import { processOCR } from './llmOCRProcessor.js';
import { detectChangeDirection } from './changeDirectionDetector.js';

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
  isDisplay: boolean; // True if capturing full display
  intervalId: NodeJS.Timeout | null;
  lastImageBuffer: Buffer | null;
  captureCount: number;
  firstCapture: boolean; // Track if this is the first capture
}

const state: CaptureState = {
  isRecording: false,
  isPaused: false,
  windowId: null,
  bounds: null,
  isDisplay: false,
  intervalId: null,
  lastImageBuffer: null,
  captureCount: 0,
  firstCapture: true,
};

const CAPTURE_INTERVAL_MS = 2000; // Capture every 2 seconds
const CHANGE_THRESHOLD = 0.05; // 5% pixel difference threshold

/**
 * Start recording a window
 */
export async function startRecording(
  windowId: number,
  bounds: Bounds,
  mainWindow: BrowserWindow | null,
  isDisplay: boolean = false
): Promise<void> {
  if (state.isRecording) {
    throw new Error('Recording is already in progress');
  }

  console.log('Starting screen capture for window:', windowId, 'isDisplay:', isDisplay);

  state.isRecording = true;
  state.isPaused = false;
  state.windowId = windowId;
  state.bounds = bounds;
  state.isDisplay = isDisplay;
  state.lastImageBuffer = null;
  state.captureCount = 0;
  state.firstCapture = true;

  // Send initial state update
  sendStateUpdate(mainWindow, 'recording');

  // Start a new page
  sendPageEvent(mainWindow, 'new-page');

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

    // Capture the full screen
    const img = await screenshot({
      screen: getScreenNumber(state.bounds),
      format: 'png',
    });

    let currentBuffer: Buffer;

    if (state.isDisplay) {
      // For full display capture (iPhone Mirroring), use the entire screenshot
      console.log('📱 Capturing full display (iPhone Mirroring mode)');
      currentBuffer = img;
    } else {
      // For window capture, extract the specific region
      console.log('🪟 Capturing window region');
      const image = sharp(img);
      const { x, y, width, height } = state.bounds;
      currentBuffer = await image.extract({
        left: x,
        top: y,
        width: width,
        height: height,
      }).png().toBuffer();
    }

    // Handle first capture
    if (state.firstCapture || !state.lastImageBuffer) {
      console.log('📸 First capture, initializing...');

      state.lastImageBuffer = currentBuffer;
      state.captureCount++;
      state.firstCapture = false;

      const base64Image = `data:image/png;base64,${currentBuffer.toString('base64')}`;

      // Process OCR for first capture
      console.log('🔍 Starting OCR processing...');
      const ocrResult = await processOCR(base64Image);
      console.log('✅ OCR completed');

      // Send screenshot to page
      sendPageScreenshot(mainWindow, {
        id: `shot-${Date.now()}`,
        timestamp: new Date().toISOString(),
        imageData: base64Image,
        ocrText: ocrResult.rawText,
      });

      // Also send legacy capture update for compatibility
      sendCaptureUpdate(mainWindow, {
        id: Date.now(),
        windowId: state.windowId || 0,
        timestamp: new Date().toISOString(),
        screenshot: base64Image,
        ocrResult: ocrResult,
      });
      return;
    }

    // Check for direction change
    const directionResult = await detectChangeDirection(state.lastImageBuffer, currentBuffer);
    console.log('🧭 Direction result:', directionResult);

    // Check if we have significant change
    const hasChanged = await detectChange(state.lastImageBuffer, currentBuffer, CHANGE_THRESHOLD);

    if (!hasChanged && directionResult.direction === 'none') {
      console.log('⏭️  No significant change detected, skipping capture');
      return;
    }

    state.lastImageBuffer = currentBuffer;
    state.captureCount++;

    const base64Image = `data:image/png;base64,${currentBuffer.toString('base64')}`;

    // Handle horizontal swipe / new screen
    if (directionResult.direction === 'horizontal' || directionResult.direction === 'major') {
      console.log('🔄 New screen detected! Finalizing current page and starting new one');

      // Finalize current page
      sendPageEvent(mainWindow, 'finalize-page');

      // Start new page
      sendPageEvent(mainWindow, 'new-page');

      // Process OCR for new screen
      console.log('🔍 Starting OCR processing...');
      const ocrResult = await processOCR(base64Image);
      console.log('✅ OCR completed');

      // Add screenshot to new page
      sendPageScreenshot(mainWindow, {
        id: `shot-${Date.now()}`,
        timestamp: new Date().toISOString(),
        imageData: base64Image,
        ocrText: ocrResult.rawText,
      });

      // Send legacy capture update
      sendCaptureUpdate(mainWindow, {
        id: Date.now(),
        windowId: state.windowId || 0,
        timestamp: new Date().toISOString(),
        screenshot: base64Image,
        ocrResult: ocrResult,
      });
      return;
    }

    // Handle vertical scroll
    if (directionResult.direction === 'vertical') {
      console.log('↕️ Vertical scroll detected, direction:', directionResult.scrollDirection);

      if (directionResult.scrollDirection === 'down') {
        // Scroll down - capture + OCR
        console.log('⬇️  Scrolled DOWN - capturing with OCR');

        const ocrResult = await processOCR(base64Image);
        console.log('✅ OCR completed');

        sendPageScreenshot(mainWindow, {
          id: `shot-${Date.now()}`,
          timestamp: new Date().toISOString(),
          imageData: base64Image,
          ocrText: ocrResult.rawText,
        });
      } else {
        // Scroll up - capture only, no OCR
        console.log('⬆️  Scrolled UP - capturing without OCR');

        sendPageScreenshot(mainWindow, {
          id: `shot-${Date.now()}`,
          timestamp: new Date().toISOString(),
          imageData: base64Image,
          isScrollUp: true,
        });
      }

      // Send legacy capture update
      sendCaptureUpdate(mainWindow, {
        id: Date.now(),
        windowId: state.windowId || 0,
        timestamp: new Date().toISOString(),
        screenshot: base64Image,
        ocrResult: directionResult.scrollDirection === 'down' ? await processOCR(base64Image) : undefined,
      });
      return;
    }

    // Default: treat as regular change with OCR
    console.log('✅ Regular change detected, processing with OCR');

    const ocrResult = await processOCR(base64Image);
    console.log('✅ OCR completed');

    sendPageScreenshot(mainWindow, {
      id: `shot-${Date.now()}`,
      timestamp: new Date().toISOString(),
      imageData: base64Image,
      ocrText: ocrResult.rawText,
    });

    sendCaptureUpdate(mainWindow, {
      id: Date.now(),
      windowId: state.windowId || 0,
      timestamp: new Date().toISOString(),
      screenshot: base64Image,
      ocrResult: ocrResult,
    });

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
    console.error('❌ Cannot send capture update: window is null or destroyed');
    return;
  }

  console.log('📤 Sending capture-update event to renderer, capture ID:', capture.id);
  mainWindow.webContents.send('capture-update', capture);
  console.log('✅ capture-update event sent successfully');
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

/**
 * Send page event to renderer
 */
function sendPageEvent(
  mainWindow: BrowserWindow | null,
  event: 'new-page' | 'finalize-page'
): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.error('❌ Cannot send page event: window is null or destroyed');
    return;
  }

  console.log('📄 Sending page event:', event);
  mainWindow.webContents.send('page-event', { event });
}

/**
 * Send screenshot to current page
 */
function sendPageScreenshot(
  mainWindow: BrowserWindow | null,
  screenshot: {
    id: string;
    timestamp: string;
    imageData: string;
    ocrText?: string;
    isScrollUp?: boolean;
  }
): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.error('❌ Cannot send page screenshot: window is null or destroyed');
    return;
  }

  console.log('📸 Sending page screenshot:', screenshot.id, 'isScrollUp:', screenshot.isScrollUp);
  mainWindow.webContents.send('page-screenshot', screenshot);
}
