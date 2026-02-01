import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCaptureSession } from './captureSession';

// Mock window.electron
global.window.electron = {
  getWindows: vi.fn(() => Promise.resolve([])),
  startRecording: vi.fn(() => Promise.resolve({ success: true })),
  stopRecording: vi.fn(() => Promise.resolve({ success: true })),
  pauseRecording: vi.fn(() => Promise.resolve()),
  resumeRecording: vi.fn(() => Promise.resolve()),
  processOCR: vi.fn(() => Promise.resolve({ rawText: 'Sample', textBlocks: [], confidence: 0.9 })),
  getAppInfo: vi.fn(() => Promise.resolve({ version: '1.0.0' })),
  captureFullScreen: vi.fn(() => Promise.resolve('data:image/png;base64,fake')),
  captureRegion: vi.fn(() => Promise.resolve('data:image/png;base64,fake')),
  onCaptureUpdate: vi.fn((callback) => {
    // Store callback for testing
    (global as any).captureUpdateCallback = callback;
  }),
  onOCRComplete: vi.fn(),
  onRecordingStateChanged: vi.fn(),
  removeAllListeners: vi.fn(),
};

describe('CaptureSession Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCaptureSession.setState({
      isRecording: false,
      isPaused: false,
      selectedWindow: null,
      availableWindows: [],
      capturedScreens: [],
      currentPreview: null,
      ocrText: '',
      processingStatus: 'idle',
    });
  });

  describe('Window Selection', () => {
    it('should select a window', () => {
      const mockWindow = {
        id: 1,
        title: 'Test Window',
        appName: 'Test App',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        isDisplay: false,
      };

      useCaptureSession.getState().selectWindow(mockWindow);

      const state = useCaptureSession.getState();
      expect(state.selectedWindow).toEqual(mockWindow);
    });
  });

  describe('Recording State', () => {
    it('should start recording', async () => {
      const mockWindow = {
        id: 1,
        title: 'Test Window',
        appName: 'Test App',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        isDisplay: false,
      };

      useCaptureSession.getState().selectWindow(mockWindow);
      await useCaptureSession.getState().startRecording();

      const state = useCaptureSession.getState();
      expect(state.isRecording).toBe(true);
      expect(state.isPaused).toBe(false);
      expect(window.electron.startRecording).toHaveBeenCalledWith(1, { x: 0, y: 0, width: 100, height: 100 }, false);
    });

    it('should stop recording', async () => {
      useCaptureSession.setState({ isRecording: true });
      await useCaptureSession.getState().stopRecording();

      const state = useCaptureSession.getState();
      expect(state.isRecording).toBe(false);
      expect(window.electron.stopRecording).toHaveBeenCalled();
    });

    it('should pause and resume recording', async () => {
      useCaptureSession.setState({ isRecording: true, isPaused: false });

      await useCaptureSession.getState().pauseRecording();
      expect(useCaptureSession.getState().isPaused).toBe(true);

      await useCaptureSession.getState().resumeRecording();
      expect(useCaptureSession.getState().isPaused).toBe(false);
    });
  });

  describe('Preview Management', () => {
    it('should update preview', () => {
      const testImage = 'data:image/png;base64,test123';

      useCaptureSession.getState().updatePreview(testImage);

      expect(useCaptureSession.getState().currentPreview).toBe(testImage);
    });
  });

  describe('Capture Management', () => {
    it('should add capture to list', () => {
      const mockCapture = {
        id: '1',
        windowId: 1,
        timestamp: '2024-01-01T00:00:00.000Z',
        screenshot: 'data:image/png;base64,fake',
        ocrResult: { rawText: 'Test OCR', textBlocks: [], confidence: 0.9 },
      };

      useCaptureSession.getState().addCapture(mockCapture);

      const state = useCaptureSession.getState();
      expect(state.capturedScreens).toHaveLength(1);
      expect(state.capturedScreens[0]).toEqual(mockCapture);
    });

    it('should clear captures', () => {
      useCaptureSession.setState({
        capturedScreens: [{ id: '1', windowId: 1, timestamp: '', screenshot: '' }],
        ocrText: 'Some text',
        currentPreview: 'data:image/png;base64,fake',
      });

      useCaptureSession.getState().clearCaptures();

      const state = useCaptureSession.getState();
      expect(state.capturedScreens).toHaveLength(0);
      expect(state.ocrText).toBe('');
      expect(state.currentPreview).toBeNull();
    });
  });

  // Note: IPC event handling tests are covered in ipc.test.ts
  // The store's setupIPCListeners is called during initialization
});
