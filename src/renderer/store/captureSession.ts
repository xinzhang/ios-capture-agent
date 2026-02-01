import { create } from 'zustand';
import type { CaptureSessionStore, WindowInfo, Capture } from '@shared/types';

export const useCaptureSession = create<CaptureSessionStore>((set, get) => ({
  // Initial state
  isRecording: false,
  isPaused: false,
  selectedWindow: null,
  availableWindows: [],
  capturedScreens: [],
  currentPreview: null,
  ocrText: '',
  processingStatus: 'idle',

  // Actions
  loadWindows: async () => {
    try {
      const windows = await window.electron.getWindows();
      set({ availableWindows: windows });
    } catch (error) {
      console.error('Failed to load windows:', error);
    }
  },

  selectWindow: (window: WindowInfo) => {
    set({ selectedWindow: window });
  },

  startRecording: async () => {
    const { selectedWindow } = get();
    if (!selectedWindow) {
      console.error('No window selected');
      return;
    }

    try {
      await window.electron.startRecording(selectedWindow.id);
      set({ isRecording: true, isPaused: false, capturedScreens: [] });
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  },

  stopRecording: async () => {
    try {
      await window.electron.stopRecording();
      set({ isRecording: false, isPaused: false, currentPreview: null });
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  },

  pauseRecording: () => {
    set({ isPaused: true });
    // Phase 2: Implement actual pause
  },

  resumeRecording: () => {
    set({ isPaused: false });
    // Phase 2: Implement actual resume
  },

  addCapture: (capture: Capture) => {
    set((state) => ({
      capturedScreens: [...state.capturedScreens, capture],
    }));
  },

  updatePreview: (image: string) => {
    set({ currentPreview: image });
  },

  updateOCRText: (text: string) => {
    set({ ocrText: text });
  },

  clearCaptures: () => {
    set({ capturedScreens: [], ocrText: '', currentPreview: null });
  },
}));
