import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.electron
global.window.electron = {
  getWindows: vi.fn(() => Promise.resolve([])),
  startRecording: vi.fn(() => Promise.resolve({ success: true })),
  stopRecording: vi.fn(() => Promise.resolve({ success: true })),
  pauseRecording: vi.fn(() => Promise.resolve()),
  resumeRecording: vi.fn(() => Promise.resolve()),
  processOCR: vi.fn(() => Promise.resolve({ rawText: 'Sample OCR text', textBlocks: [], confidence: 0.9 })),
  getAppInfo: vi.fn(() => Promise.resolve({ version: '1.0.0' })),
  captureFullScreen: vi.fn(() => Promise.resolve('data:image/png;base64,fake')),
  captureRegion: vi.fn(() => Promise.resolve('data:image/png;base64,fake')),
  onCaptureUpdate: vi.fn(),
  onOCRComplete: vi.fn(),
  onRecordingStateChanged: vi.fn(),
  removeAllListeners: vi.fn(),
};
