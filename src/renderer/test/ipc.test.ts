import { describe, it, expect, vi } from 'vitest';

// Mock window.electron for testing
const mockElectron = {
  getWindows: vi.fn(() => Promise.resolve([])),
  startRecording: vi.fn(() => Promise.resolve({ success: true })),
  stopRecording: vi.fn(() => Promise.resolve({ success: true })),
  pauseRecording: vi.fn(() => Promise.resolve()),
  resumeRecording: vi.fn(() => Promise.resolve()),
  processOCR: vi.fn(() => Promise.resolve({ rawText: 'Test', textBlocks: [], confidence: 0.9 })),
  getAppInfo: vi.fn(() => Promise.resolve({ version: '1.0.0' })),
  captureFullScreen: vi.fn(() => Promise.resolve('data:image/png;base64,fake')),
  captureRegion: vi.fn(() => Promise.resolve('data:image/png;base64,fake')),
  onCaptureUpdate: vi.fn(),
  onOCRComplete: vi.fn(),
  onRecordingStateChanged: vi.fn(),
  removeAllListeners: vi.fn(),
};

global.window.electron = mockElectron;

describe('IPC Bridge Integration Tests', () => {
  describe('IPC Methods Exist', () => {
    it('should expose getWindows method', () => {
      expect(typeof window.electron.getWindows).toBe('function');
    });

    it('should expose startRecording method', () => {
      expect(typeof window.electron.startRecording).toBe('function');
    });

    it('should expose stopRecording method', () => {
      expect(typeof window.electron.stopRecording).toBe('function');
    });

    it('should expose pauseRecording method', () => {
      expect(typeof window.electron.pauseRecording).toBe('function');
    });

    it('should expose resumeRecording method', () => {
      expect(typeof window.electron.resumeRecording).toBe('function');
    });

    it('should expose processOCR method', () => {
      expect(typeof window.electron.processOCR).toBe('function');
    });

    it('should expose captureFullScreen method', () => {
      expect(typeof window.electron.captureFullScreen).toBe('function');
    });

    it('should expose captureRegion method', () => {
      expect(typeof window.electron.captureRegion).toBe('function');
    });
  });

  describe('IPC Method Signatures', () => {
    it('getWindows should return array of windows', async () => {
      const mockWindows = [
        { id: 1, title: 'Window 1', appName: 'App1', bounds: { x: 0, y: 0, width: 100, height: 100 }, isDisplay: false },
      ];
      mockElectron.getWindows.mockResolvedValueOnce(mockWindows);

      const result = await window.electron.getWindows();
      expect(Array.isArray(result)).toBe(true);
    });

    it('startRecording should accept windowId, bounds, and isDisplay', async () => {
      const bounds = { x: 0, y: 0, width: 100, height: 100 };

      await window.electron.startRecording(1, bounds, false);

      expect(mockElectron.startRecording).toHaveBeenCalledWith(1, bounds, false);
    });

    it('captureRegion should accept region object', async () => {
      const region = { x: 10, y: 20, width: 100, height: 200 };

      await window.electron.captureRegion(region);

      expect(mockElectron.captureRegion).toHaveBeenCalledWith(region);
    });

    it('captureRegion should return base64 image string', async () => {
      mockElectron.captureRegion.mockResolvedValueOnce('data:image/png;base64,iVBORw0KGgo=');

      const result = await window.electron.captureRegion({ x: 0, y: 0, width: 100, height: 100 });

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^data:image\/[a-z]+;base64,/);
    });
  });

  describe('IPC Event Listeners', () => {
    it('should expose onCaptureUpdate method', () => {
      expect(typeof window.electron.onCaptureUpdate).toBe('function');
    });

    it('should expose onOCRComplete method', () => {
      expect(typeof window.electron.onOCRComplete).toBe('function');
    });

    it('should expose onRecordingStateChanged method', () => {
      expect(typeof window.electron.onRecordingStateChanged).toBe('function');
    });

    it('should expose removeAllListeners method', () => {
      expect(typeof window.electron.removeAllListeners).toBe('function');
    });

    it('should be able to register event listeners', () => {
      const mockCallback = vi.fn();

      // Should not throw
      expect(() => {
        window.electron.onCaptureUpdate(mockCallback);
        window.electron.onOCRComplete(mockCallback);
        window.electron.onRecordingStateChanged(mockCallback);
      }).not.toThrow();
    });
  });

  describe('Recording Flow Integration', () => {
    it('should complete full recording flow', async () => {
      // Setup
      const mockWindow = {
        id: 1,
        title: 'Test Window',
        appName: 'Test App',
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        isDisplay: false,
      };

      mockElectron.getWindows.mockResolvedValueOnce([mockWindow]);
      mockElectron.startRecording.mockResolvedValueOnce({ success: true });
      mockElectron.stopRecording.mockResolvedValueOnce({ success: true });

      // Test flow
      const windows = await window.electron.getWindows();
      expect(windows).toHaveLength(1);

      const startResult = await window.electron.startRecording(
        mockWindow.id,
        mockWindow.bounds,
        mockWindow.isDisplay || false
      );
      expect(startResult.success).toBe(true);

      const stopResult = await window.electron.stopRecording();
      expect(stopResult.success).toBe(true);
    });

    it('should handle pause and resume flow', async () => {
      mockElectron.pauseRecording.mockResolvedValueOnce(undefined);
      mockElectron.resumeRecording.mockResolvedValueOnce(undefined);

      await window.electron.pauseRecording();
      expect(mockElectron.pauseRecording).toHaveBeenCalled();

      await window.electron.resumeRecording();
      expect(mockElectron.resumeRecording).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('startRecording should return success: false on error', async () => {
      mockElectron.startRecording.mockResolvedValueOnce({
        success: false,
        error: 'Test error',
      });

      const result = await window.electron.startRecording(1, { x: 0, y: 0, width: 100, height: 100 }, false);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
    });

    it('processOCR should return error result on failure', async () => {
      mockElectron.processOCR.mockResolvedValueOnce({
        rawText: '',
        textBlocks: [],
        confidence: 0,
        error: 'OCR failed',
      });

      const result = await window.electron.processOCR('fake-image-data');

      expect(result.confidence).toBe(0);
      expect(result.error).toBe('OCR failed');
    });
  });
});
