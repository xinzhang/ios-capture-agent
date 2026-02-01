import { contextBridge, ipcRenderer } from 'electron';
import type { WindowInfo, Capture, OCRResult } from '@shared/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Window detection
  getWindows: () => ipcRenderer.invoke('get_windows'),

  // Recording controls
  startRecording: (windowId: number) => ipcRenderer.invoke('start_recording', windowId),
  stopRecording: () => ipcRenderer.invoke('stop_recording'),
  pauseRecording: () => ipcRenderer.invoke('pause_recording'),
  resumeRecording: () => ipcRenderer.invoke('resume_recording'),

  // OCR processing
  processOCR: (imageData: string) => ipcRenderer.invoke('process_ocr', imageData),

  // App info
  getAppInfo: () => ipcRenderer.invoke('get_app_info'),

  // Event listeners for renderer
  onCaptureUpdate: (callback: (capture: Capture) => void) => {
    ipcRenderer.on('capture-update', (_event, capture) => callback(capture));
  },

  onOCRComplete: (callback: (result: OCRResult) => void) => {
    ipcRenderer.on('ocr-complete', (_event, result) => callback(result));
  },

  onRecordingStateChanged: (callback: (state: string) => void) => {
    ipcRenderer.on('recording-state-changed', (_event, state) => callback(state));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Type declarations for window.electron
declare global {
  interface Window {
    electron: {
      getWindows: () => Promise<WindowInfo[]>;
      startRecording: (windowId: number) => Promise<{ success: boolean }>;
      stopRecording: () => Promise<{ success: boolean }>;
      pauseRecording: () => Promise<void>;
      resumeRecording: () => Promise<void>;
      processOCR: (imageData: string) => Promise<OCRResult>;
      getAppInfo: () => Promise<any>;
      onCaptureUpdate: (callback: (capture: Capture) => void) => void;
      onOCRComplete: (callback: (result: OCRResult) => void) => void;
      onRecordingStateChanged: (callback: (state: string) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

export {};
